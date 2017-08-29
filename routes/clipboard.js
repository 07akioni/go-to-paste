const express = require('express');
const router = express.Router();
const multer = require('multer')
const upload = multer({ dest: 'uploads/' })
const fs = require('fs')

const { Clipboard, Attachment } = require('../models/clipboard.js')

function getRandomShareCode () {
  return Math.floor(Math.random() * 90000 + 10000)
}

function getCurrentLeftTime (model) {
  let ret = Math.floor(model.dataValues.currentValidScope - ((new Date()).getTime() - model.dataValues.createdAt.getTime()) / 1000)
  return ret > 0 ? ret : 0
}

/*
 * upload an attachment for a clipboard
 */
router.post('/file', upload.single('file'), async function (req, res, next) {
  
  let attachment = await Attachment.create({
    originalName: req.file.originalname,
    path: req.file.path,
    size: req.file.size
  })
  
  let clipboard = await Clipboard.findOne({
    where: {
      shareCode: req.body.shareCode
    }
  })
  
  let models = await Attachment.findAll({
    where: {
      clipboardId: clipboard.dataValues.id
    }
  })
  
  for (let model of models) {
    await new Promise((res, rej) => {
      fs.unlink(`${ model.dataValues.path }`, res)
    })
    await Attachment.destroy({
      where: {
        clipboardId: clipboard.dataValues.id
      }
    })
  }
  
  clipboard.setAttachments([attachment])
  
  console.log(attachment.dataValues)

  res.send({
    status: 'SUC',
    data: attachment.dataValues
  })
})

/*
 * delete the attachment of a clipboard
 * @param shareCode
 * 
 * @return status
 * @return errMsg
 */
router.delete('/file', async function (req, res, next) {

  const clipboardModel = await Clipboard.findOne({
    where: {
      shareCode: req.query.shareCode
    }
  })
  
  if (clipboardModel === null) {
    res.send({
      status: 'ERR',
      errMsg: 'clipboard doesn\'t exist'
    });
    return
  }

  const attachmentModel = await Attachment.findOne({
    where: {
      clipboardId: clipboardModel.dataValues.id
    }
  })

  if (attachmentModel === null) {
    res.send({
      status: 'ERR',
      errMsg: 'attachment doesn\'t exist'
    });
    return
  }

  try {
    console.log('gonna to delete')
    console.log(`${ attachmentModel.dataValues.path }`)
    await new Promise((res, rej) => {
      fs.unlink(`${ attachmentModel.dataValues.path }`, res)
    })
  } catch (err) {
    console.log('unlink() throw an error.')
  }
  await Attachment.destroy({
    where: {
      clipboardId: attachmentModel.dataValues.clipboardId
    }
  })
  res.send({ status: 'SUC' });
})

/* 
 * Change the textcontent of a clipboard that already exists.
 * @param shareCode
 * @param textContent
 * 
 * @return status
 * @return errMsg
 */
router.put('/textcontent', function (req, res, next) {
  Clipboard
    .update({
      textContent: req.body['textContent']
    }, {
      where: {
        shareCode: req.body['shareCode']
      }
    })
    .then((count) => {
      console.log(count)
      let ret
      if (count[0] === 0) {
        ret = {
          status: 'ERR',
          errMsg: '需要修改的剪贴板不存在'
        }
      } else if (count[0] === 1) {
        ret = {
          status: 'SUC'
        }
      } else if (count[0] > 1) {
        ret = {
          status: 'ERR',
          errMsg: '要修改的剪贴板不唯一'
        }
      }
      res.send(JSON.stringify(ret))
    })
    .catch((err) => {
      res.send(JSON.stringify({
        status: 'ERR',
        errMsg: '未定义错误'
      }))
    })
})

/*
 * change the valid scope of a clipboard
 */
router.put('/validscope', function (req, res, next) {
  retMax = false
  Clipboard.findOne({
    where: {
      shareCode: req.body.shareCode
    }
  }).then((model) => {
    if (model.dataValues.currentValidScope === model.dataValues.maxValidScope) {
      retMax = true
    }
    let newValidScope = model.dataValues.currentValidScope + req.body.scope * 60
    let maxValidScope = model.dataValues.maxValidScope
    if (newValidScope >= maxValidScope) {
      return Clipboard.update({
          currentValidScope: maxValidScope
        }, {
          where: {
            shareCode: req.body.shareCode
          }
        })
    } else {
      return Clipboard.update({
        currentValidScope: newValidScope
      }, {
        where: {
          shareCode: req.body.shareCode
        }
      })
    }
  })
  .then(() => Clipboard.findOne({
    where: {
      shareCode: req.body.shareCode
    }
  }))
  .then((model) => {
    res.send({ status: 'SUC', max: retMax, currentLeftTime: getCurrentLeftTime(model) })
  })
  .catch((err) => {
    console.log(err)
  })
})

/*
 * build a new clipboard
 * @return status
 * @return shareCode
 */
router.post(/\/new/, async function (req, res, next) {
  const timesToLoop = 5

  for (let i = 0; i < timesToLoop; ++i) {
    const shareCode = getRandomShareCode()
    const model = await Clipboard.findOne({
      where: { shareCode: shareCode }
    })
    if (model === null) {
      const data = await Clipboard.create({ shareCode: shareCode })
      res.send({
        status: 'SUC',
        shareCode: shareCode
      })
      // console.log(`使用 ${i + 1} 次找到了空闲剪贴板`)
      return
    }
  }

  res.send({
    status: 'ERR'
  })
})


router.post('/', function (req, res, next) {
  Clipboard
    .create({
      shareCode: req.body['shareCode'],
      textContent: req.body['textContent']
    })
    .then((data) => {
      res.send(data + ' 创建成功')
    })
    .catch(() => {
      res.send('报道出现了偏差')
    })
});

router.get('/', function (req, res, next) { // 五位数字
  Clipboard
    .findAll({
      include: [ Attachment ],
      where: {
        shareCode: req.query['shareCode']
      }
    })
    .then((data) => {
      if (data.length === 1 && getCurrentLeftTime(data[0]) !== 0) {
        let obj = { exist: true, currentLeftTime: getCurrentLeftTime(data[0]) }
        obj = Object.assign(obj, data[0].dataValues)
        res.send(obj)
      } else {
        res.send({ exist: false })
      }
    })
    .catch((err) => {
      res.send('报道出现了偏差')
    })
});

module.exports = router;
