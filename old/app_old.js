/*npm dependencies*/
const express = require('express');
const app = express();
const mm = require('musicmetadata');
const crypto = require('crypto');

/*my own modules*/
const TE = require("./template-engine");
const ActionCaller = require("./ActionCaller");
const APP = new ActionCaller();

/*nodeJS dependencies*/
const path = require("path");
const fs = require("fs");

/*middleware*/
app.set('json spaces', 40);
var bodyParser = require('body-parser');
app.use(bodyParser.json());
// in latest body-parser use like below.
app.use(bodyParser.urlencoded({ extended: true }));
/*stuffs*/

//!! caches
var mpath = path.join(__dirname, "public", "music_files");
var tcache = path.join(__dirname, "cache");
var mcache = [];

//!! log buffer
var _buffer = [];
var ind = 0;
var isWin = process.platform === "win32";
var IndexDir = function (path, passthrough) {

    var content = fs.readdirSync(path);
    for (var i = 0; i < content.length; i++) {

        var mname = content[i];
        var fullpath = path + ((isWin) ? "\\" : "/") + (mname);
        var mstat = fs.lstatSync(fullpath);
        var isdir = mstat.isDirectory();

        if (isdir) {

            IndexDir(fullpath);

        } else {

            if (/\.(mp3)$/.test(mname)) {

                var tempsize = mstat.size / 1000000.0;
                if (tempsize < 1) continue;

                mcache[ind] = {
                    name: mname.split(".mp3")[0],
                    path: fullpath.split(__dirname + ((isWin) ? "\\public\\" : "/public/"))[1],
                    pid: ind,
                    size: tempsize
                };

                ind++;
            }
        }
    }
}

IndexDir(mpath);


class logger {
    constructor(x, hmm) {
        this.x = x;
        this.cb = hmm ? hmm : {};
    }
    log() {
        var args = arguments;
        this.x.log.apply(this, args);
        if (this.cb["log"])
            this.cb["log"].call(this, args);
    }
};

let cns = new logger(console, {
    "log": (x) => {
        for (i in x) {
            _buffer.push(`${new Date().toString().split(" ")[4]} ${x[i]}`);
            if (_buffer.length > 50)
                _buffer.shift();
        }
    }
});

let INDEX_PAGE = new TE(path.join(__dirname, "public/index.html"),
    {
        "${list}": () => {
            var temp = [];
            for (i = 0; i < mcache.length; i++) {
                temp.push(`<a pid="${i}" href="play/${i}">${mcache[i].name}</a>`);
            }
            return temp.join("");
        }
    }
);

///////////////////////////////////////////////////////////////////

APP.set("a-data", (req, res) => {

    var pid = (req.params.id) ? parseInt(req.params.id) : -1;
    if (pid < mcache.length && pid > -1) {

        cns.log("received action=data, id=" + pid);
        var readableStream = fs.createReadStream(path.join(__dirname, "public/" + mcache[pid].path));
        var parser = mm(readableStream, (err, metadata) => {
       
            if (err) {
                cns.log("metadata read error [" + pid + "]", err);
                metadata = {};
            }

            var temp = mcache[pid];
            for (var i in metadata) {
                if (i !== "picture") {
                    temp[i] = metadata[i];
                }
            }
            readableStream.close();

            cns.log("Sending metadata.");
            res.json(temp);

        });

    } else {
        res.json({ error: "Invalid request." });
    }

});

APP.set("handle-thumbnails", (path2, callback) => {

    var hashedname = crypto.createHash('md5').update(path2).digest("hex");
    var temppath = path.join(tcache, hashedname);

    var kek = fs.existsSync(temppath);
    var kek2 = { size: 0 };

    try {
        kek2 = fs.statSync(temppath); // second test for seeing if file contains nothing, i.e empty / corrupt file
    } catch (err) {
        kek = false;
    }

    if (kek && kek2.size > 0) {
        var buffer = fs.readFileSync(temppath);
        callback({ data: buffer, format: "jpeg" });

    } else {

        var readableStream = fs.createReadStream(path.join(__dirname, "public", path2));
        var parser = mm(readableStream, function (err, metadata) {
            metadata = (metadata) ? metadata : { pictures: [] };
            if (err) {
                cns.log(err);
                callback(0);

            }
            else {
                if (metadata.picture.length > 0) {

                    fs.writeFile(temppath, metadata.picture[0].data, 'binary', function (err) {
                        if (err) throw err;
                        cns.log(path2, ' thumbnail cached.');
                    })
                    callback(metadata.picture[0]);

                }
                else {
                    callback(0);
                }
                readableStream.close();
            }
        });

    }

});

APP.set("a-albumart", (req, res) => {

    var pid = (req.params.id) ? parseInt(req.params.id) : -1;
    if (pid < mcache.length && pid > -1) {

        APP.do("handle-thumbnails", mcache[pid].path, (tempflip) => {

            if (tempflip == 0) {
                var body = fs.readFileSync(path.join(__dirname, "public/" + "albumart.png"));
                //cns.log("Album art not found for ",mcache[pid].path,", sending default image.");
                res.send(body);

            } else {
                //cns.log("sending thumbnail1 received from event for ",mcache[pid].path);
                res.contentType("image/" + tempflip.format);
                res.send(tempflip.data);
            }
        })

    } else {
        res.json({ error: "Invalid request." });
    }

});



APP.set("a-albumart2", (req, res) => { // I have to use two routes for the way I have a css hack/workaround implemented in the frontend e.e

    var pid = (req.params.id) ? parseInt(req.params.id) : -1;
    if (pid < mcache.length && pid > -1) {

      APP.do("handle-thumbnails", mcache[pid].path, (tempflip) => {

            if (tempflip == 0) {
                //    var body = fs.readFileSync(path.join(__dirname, "public/" + "albumart.png"));
                //      cns.log("Album art not found for ",mcache[pid].path,", sending 404");
                res.send(404);
            } else {
                //cns.log("sending thumbnail1 received from event for ",mcache[pid].path);
                res.contentType("image/" + tempflip.format);
                res.send(tempflip.data);
            }

        })


    } else {
        res.json({ error: "Invalid request." });
    }

});


APP.set("a-stream", (req, res) => {

    var pid = (req.params.id) ? parseInt(req.params.id) : -1;
    if (pid < mcache.length && pid > -1) {

        console.log(mcache[req.params.id].path);
        var filePath = path.join(__dirname, "public", mcache[req.params.id].path);
        res.sendFile(path.join(__dirname, 'public', mcache[req.params.id].path));

        // var stat = fs.statSync(filePath);
        // res.writeHead(200, {
        //     'Content-Type': 'audio/mpeg',
        //     'Content-Length': stat.size
        // });
        // var readStream = fs.createReadStream(filePath);
        // readStream.pipe(res);

    } else {
        res.json({ error: "Invalid request." });
    }

});



///////////////////////////////////////////////////////////////////

app.get("/", (req, res) => INDEX_PAGE.gen(req, res));

app.get('/:action/:id', (request, response) => {

    var action_ = request.params.action;

    if (action_) {
        if (APP.is("a-" + action_)) {
            APP.do("a-" + action_, request, response);
        }
    }
    else response.json({ error: "Invalid request." });

});

app.post("/search", (req, res) => {
    console.log(req.body);
    var q = (req.body.q) ? req.body.q : false;

    if (q) {
        var found = false;
        var results = [];
        for (var i = 0; i < mcache.length; i++) {
            if (mcache[i].name.toLowerCase().indexOf(q.toLowerCase()) !== -1) {
                found = true;
                results.push(mcache[i]);
            }
        }

        res.json({ found: found, results: results });

    } else {


        res.json({ error: "Invalid request." });

    }

});

app.get("/meta", (req, res) => {
    res.json({ tracks: mcache.length });
});


app.use(express.static(path.join(__dirname, 'public')));

app.listen(3000, () => cns.log('listening on port 3000!'))