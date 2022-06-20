/** NPM Modules */
const HTTP_PORT =  process.env.PORT || 80,
    PUBLIC_ROOT = "public",
    fs = require("fs"),
    path = require("path"),
    express = require("express"),
    crypto = require("crypto"),
    bodyParser = require('body-parser'),
    compression = require('compression'),
    cache = require('memory-cache'),
    { spawn } = require('child_process');

/* helper functions */
function getInternalIP() {
    var interfaces = require('os').networkInterfaces();
    for (var devName in interfaces) {
        var iface = interfaces[devName];

        for (var i = 0; i < iface.length; i++) {
            var alias = iface[i];
            if (alias.family === 'IPv4' && alias.address !== '127.0.0.1' && !alias.internal)
                return alias.address;
        }
    }

    return '0.0.0.0';
}

/** my modules */
const indexer_ = new require("./modules/indexer"),
    indexer = new indexer_("./music"),
    mm = new require("./modules/metadata"),
    serve = require("./modules/template-engine"),
    colors = require("./modules/color"),
    resize = require('./modules/resize');


let enabledownloader = false;
let commandPrefix = "/";
const app = express();
app.set('json spaces', 40);

/* express middleware code */

let mcache = new cache.Cache();
var cachemiddle = (duration) => {
    return (req, res, next) => {
        let key = '__express__' + req.originalUrl || req.url
        let cachedBody = cache.get(key)
        if (cachedBody) {
            res.send(cachedBody)
            return
        } else {
            res.sendResponse = res.send
            res.send = (body) => {
                mcache.put(key, body, duration * 1000);
                res.sendResponse(body)
            }
            next()
        }
    }
}

app.use(compression());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
/**  */


/*starting up metadata manager class*/
MetaManager = new mm.MetaManager(indexer); /* main class which does all the work */


/* CLI */

let print = (...x) => { x.map(i => { console.log(`> ${i}`); }) };

let commands = {
    "help": {
            f : function(args){
               let {values} = args;
                if(values.length < 1) {
                    let out = [];
                    Object.keys(commands).map((cmd) => { out.push(commandPrefix + cmd); });
                    print("Available commands are: " +colors.fg.Green + out.join(", ") + colors.Reset);
                    print(`Use ${commandPrefix}help ${colors.fg.Green}[command name]${colors.Reset} to see detailed information about that command.`);
                } else {
                    if(commands.hasOwnProperty(values[0]) && commands[values[0]].d){
                        print(commands[values[0]].d);
                    } else {
                        print("This command does not have any help text assosiated to it.");
                    }
                }
            }, 
            d   : "You seriously need some help."
         },

    "find": {
        f: function(args) {
            
        }, 
        d:"Find Shit."
    },
    "rescan": {
        f: function(args) {

        },
        d: "Rescan. Does exactly what it says."
    }
};

process.argv.forEach((val, index, array) => {
    if (val == "yt"){console.log("youtubedl enabled."); enabledownloader = true; /* youtubedl */}
});


startCLI = () => {

    processLine = (line) => {
        let command = line.split(' ')[0].substr(1);
        if(line[0] == commandPrefix && commands.hasOwnProperty(command)) {
            let values = line.split(' ');
            values.shift();
            commands[command].f.apply(this, [{ values }]);
        } else {
            print(`Invalid command, use ${commandPrefix}help to view all available commands.`);
        }
    }

    var iface = require("readline").createInterface({
        input: process.stdin,
        output: process.stdout
    });
    
    iface.on("line", function (line) {
        if (line.trim().length > 0) {
        processLine(line);
        }
    });

    

}



startServer = (log) => { /* runs after MetaManager has finished doing it's thing and setting up the db */

    console.log(`
       ${colors.bg.Cyan}${colors.fg.Black} Metadata Changes ${colors.Reset}
    ${(Object.keys(log.newTracks).length > 0) ? colors.fg.Green + ">> " : ""}${Object.keys(log.newTracks).length}${colors.Reset} track(s) were added.
    ${(Object.keys(log.removedTracks).length > 0) ? colors.fg.Red + ">> " : ""}${Object.keys(log.removedTracks).length}${colors.Reset} track(s) were removed.
    ${(Object.keys(log.newAlbums).length > 0) ? colors.fg.Green + ">> " : ""}${Object.keys(log.newAlbums).length}${colors.Reset} new album(s) were added.
    ${(Object.keys(log.removedAlbums).length > 0) ? colors.fg.Red + ">> " : ""}${Object.keys(log.removedAlbums).length}${colors.Reset} album(s) were removed.
    ${(Object.keys(log.newArtists).length > 0) ? colors.fg.Green + ">> " : ""}${Object.keys(log.newArtists).length}${colors.Reset} new artist(s) were added.
    ${(Object.keys(log.removedArtists).length > 0) ? colors.fg.Red + ">> " : ""}${Object.keys(log.removedArtists).length}${colors.Reset} artist(s) were removed.
    
    ${MetaManager.maxlength + 1} total tracks found.
    ${MetaManager.log.has_thumbnail} track(s) have albumart.
    ${MetaManager.log.no_thumbnail} track(s) don't have albumart.
    `);

    /* homepage route */

    let homepage = new serve("index.html", { root: PUBLIC_ROOT });
    app.get("/", (req, res) => homepage.gen(req, res));

    /* get artists list route */

    app.get("/artists_list", (req, res) => {
        MetaManager.getArtistsList().then(x => {
            res.send(x);
        }).catch(err => {
            // error log here
            res.sendStatus(500);
        })
    })


    /* get tracks list route */

    app.get("/tracks_list", (req, res) => {

        MetaManager.getTracksList().then(x => {
            res.send(x);
        }).catch(err => {
            // error log here
            res.sendStatus(500);
        })

    });

    
    /* get recents list route */

    app.get("/recents_list", (req, res) => {

        MetaManager.getRecentsList().then(x => {
            res.send(x);
        }).catch(err => {
            // error log here
            res.sendStatus(500);
        })

    });


    /* get thumbnail route */

    app.get("/thumb/:id/:size", cachemiddle(30), (req, res) => {
        let tempsize = (req.params.hasOwnProperty("size")) ? parseInt(req.params.size) : 108;
        if (!req.params.id || !req.params.size || req.params.id == "default") {
            var buffer = fs.readFileSync(path.join(PUBLIC_ROOT, "img", "music.png"));
            res.contentType("image/png");
            resize(buffer, "png", tempsize, tempsize).pipe(res);
        } else {
            MetaManager.resolveThumb(req.params.id).then((x) => {
                res.contentType("image/jpeg");
                resize(x, "jpeg", tempsize, tempsize).pipe(res);
            }).catch(err => {
                // console.log(err);
                var buffer = fs.readFileSync(path.join(PUBLIC_ROOT, "img", "music.png"));
                res.contentType("image/png");
                resize(buffer, "png", tempsize, tempsize).pipe(res);
            });
        }

    });


    /* get single album data */

    app.get("/albumdata/:album_id", (req, res) => {
        MetaManager.getAlbumFromAlbumID(req.params.album_id).then((x) => {
            res.send(x.clean(["album_name", "track_count", "artist_name", "artist_id", "album_id", "has_albumart", "albumart_index"], true));
        }).catch(err => {
            console.log(err);
            res.sendStatus(404);
        });
    });


    /* send audio file route */

    app.get("/stream/:id", (req, res) => {
        MetaManager.getTrackFromIndex(req.params.id).then((x) => {
            if (x < 0) res.sendStatus(404, "Invalid ID");
            res.sendFile(x.path, { root: "." });
        }).catch(err => { res.sendStatus(404, "Invalid ID"); });
    });


    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    let downloading = [];

    app.get("/youtubedl/:uri", (req, res) => {

        if (!enabledownloader) {
            res.sendStatus(404);
            return;
        }

        let uri = "https://www.youtube.com/watch?v=" + decodeURIComponent(req.params.uri);
        if (downloading.indexOf(uri) !== -1) {
            res.sendStatus(403);
            return;
        }
        downloading.push(uri);
        const ls = spawn('youtube-dl.exe', ['-x',
            '-o', '/music/%(title)s.%(ext)s',
            '--audio-format', 'mp3',
            '--audio-quality', '320K',
            '--no-playlist',
            `${uri}`]
        );

        res.set('Content-Type', 'text/html');
        ls.stdin.setEncoding('utf-8');


        ls.stdout.on('data', (data) => {
            console.log(`stdout: ${data}`);
            res.write(('<p>' + data + '</p>'));
            ls.stdin.write("kek");
        });

        ls.stderr.on('data', (data) => {
            res.write(('<p>' + data + '</p>'));
            res.end();
            ls.stdin.write("kek");
            downloading.splice(downloading.indexOf(uri), 1);
        });

        ls.on('close', (code) => {
            console.log(`child process exited with code ${code}`);
            res.write(('<p>ended ' + code + '</p>'));
            res.end();
            downloading.splice(downloading.indexOf(uri), 1);
        });
    });

    app.use(cachemiddle(30), express.static(path.join(__dirname, PUBLIC_ROOT)));
    app.listen(HTTP_PORT, () => mm.elapsed(`HTTP Server Listening on ${colors.fg.Green}http://${getInternalIP()}:${HTTP_PORT}${colors.Reset}`))

};

MetaManager.start().then((x) => {
    // setTimeout((x) => {
        startServer(x);
    //}, 1000, x)
}).then(x => {
        startCLI();
}).catch(err => {
    console.log(err);
});
