let {
  Clipboard,
  Attachment
} =  require('./clipboard.js')

Clipboard
  .findOne({
    where: {
      shareCode: 75414
    }
  })
  .then((model) => {
    console.log(model)
  })