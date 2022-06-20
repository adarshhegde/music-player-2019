const crypto = require('crypto');
let x = {};
x.hash = (x) =>  crypto.createHash('md5').update(x || Math.floor((1 + Math.random()) * 0x100000).toString(16)).digest("hex"); ;
x.mix = (a,b) => { Object.assign(a,b); }
module.exports = x;