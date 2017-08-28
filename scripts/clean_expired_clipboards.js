const Sequelize = require('sequelize')
const fs = require('fs')
const {
  Clipboard,
  Attachment,
  sequelize
} =  require('../models/clipboard.js')

/*
 * delete expired clipboards and their attachment files
 */
async function cleanUp () {
  let clipboards = await sequelize.query('select id, shareCode from clipboards where TIMESTAMPDIFF(SECOND, createdAt, now()) > currentValidScope;', { type: Sequelize.QueryTypes.SELECT })
  for (clipboard of clipboards) {
    console.log(clipboard)
    let models = await Attachment.findAll({
      where: {
        clipboardId: clipboard.id
      }
    })
    for (let model of models) {
      await new Promise((res, rej) => {
        fs.unlink(`../${ model.dataValues.path }`, res)
      })
      await Attachment.destroy({
        where: {
          clipboardId: clipboard.id
        }
      })
      await Clipboard.destroy({
        where: {
          id: clipboard.id
        }
      })
    }
  }
}

function triggerCleanUp () {
  cleanUp()
  setTimeout(triggerCleanUp, 5000)
}

sequelize
  .query('set time_zone="+0:00"', { type: Sequelize.QueryTypes.RAW })
  .then(triggerCleanUp)