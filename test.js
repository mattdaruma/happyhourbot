let fs = require('fs')
let path = require('path')
let cah = JSON.parse(fs.readFileSync(path.join(__dirname, 'content', 'cah.json'), 'utf8'))
console.log('cahwhite', cah.whiteCards.length, 'cahblack', cah.blackCards.length)