const Sequelize = require('sequelize');

const sequelize = new Sequelize('gotopaste', 'root', 'root', {
  host: 'localhost',
  dialect: 'mysql',
  pool: {
    max: 5,
    min: 0,
    idle: 10000
  }
});

const Clipboard = sequelize.define('clipboard', {
  shareCode: {
    type: Sequelize.STRING
  },
  textContent: {
    type: Sequelize.STRING
  },
  currentValidScope: {
    type: Sequelize.INTEGER,
    defaultValue: 300
  },
  maxValidScope: {
    type: Sequelize.INTEGER,
    defaultValue: 7500
  }
});

const Attachment = sequelize.define('attachments', {
  originalName: {
    type: Sequelize.STRING
  },
  path: {
    type: Sequelize.STRING
  },
  size: {
    type: Sequelize.INTEGER
  },
  filename: {
    type: Sequelize.STRING
  }
})

/*
const IndexUsability = sequelize.define('indexUsability', {

})
*/
Clipboard.hasMany(Attachment)
Attachment.belongsTo(Clipboard)

/*
sequelize.sync({
  force: true
})
*/


module.exports = {
  Clipboard,
  Attachment,
  sequelize
}