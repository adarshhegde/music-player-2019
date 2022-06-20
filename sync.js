let fetch = require("node-fetch");
let fs = require("fs");
let path = require("path");
let config = JSON.parse(fs.readFileSync("./sync.json","utf8"));

function sync(filename,filedata) {
    let data = new URLSearchParams();
    data.append("file",filedata);
    fetch("http://musiq-adhegde001.c9users.io:8081/sync/" + encodeURIComponent(filename),{ method:"POST",body:data
      }).then(x=> { return x.text() }).then(x=>{
            console.log(x);
      }).catch(err => {
          console.log(err);
      })
}

for(let file in config.watchchanges){
    fs.watchFile(config.watchchanges[file],{interval: 1000}, (curr, prev) => {
        let fn = config.watchchanges[file];
        console.log(fn + " has changed, syncing changes with server.");
        let data = fs.readFileSync(fn,"utf8");
        sync(fn,data);
    });
}