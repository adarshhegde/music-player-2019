var dominant = require('huey/dominant')
var fs = require("fs");


var buffer = fs.readFileSync("./cache/c52831053a0a612a67d18eb8fa228fc2.thumb");

console.log(dominant(buffer))