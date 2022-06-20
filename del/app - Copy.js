const HTTP_PORT = 80,
    PUBLIC_ROOT = "public",
    fs = require("fs"),
    path = require("path"),
    express = require("express"),
    crypto = require("crypto"),
    serve = require("./modules/template-engine"),
    bodyParser = require('body-parser')
     compression = require('compression'), cache = require('memory-cache');



     let memCache = new cache.Cache();
     let cacheMiddleware = (duration) => {
         return (req, res, next) => {
             let key =  '__express__' + req.originalUrl || req.url
             let cacheContent = memCache.get(key);
             if(cacheContent){
                 res.send( cacheContent );
                 return
             }else{
                 res.sendResponse = res.send
                 res.send = (body) => {
                     memCache.put(key,body,duration*1000);
                     res.sendResponse(body)
                 }
                 next()
             }
         }
     }
 

const app = express();
app.set('json spaces', 40);
app.use(compression());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

var purge = true; // false
process.argv.forEach((val, index, array) => {
    if (val == "purge") purge = true;
});

const indexer = new require("./modules/indexer").scan("music");
const meta = new require("./modules/metadata");
const MetaManager = new meta(indexer, purge);


startServer = () => {

    console.log(MetaManager.getTracksLength());

    let homepage = new serve("index.html", { root: PUBLIC_ROOT },
        {
            "${list}": () => JSON.stringify(MetaManager.getTracks(["title", "artist", "album", "uid", "dominantColor", "duration"]))
        });



    app.get("/", (req, res) => homepage.gen(req, res));
    app.get("/stream/:id", (req, res) => {
        MetaManager.getTrack(req.params.id).then((x) => {
            if (x < 0) res.sendStatus(500, "Invalid ID");
            res.sendFile(x.path, { root: "." });
        }).catch(err => { throw new Error(err); });
    });

    app.get("/thumb/:id", cacheMiddleware(30), (req, res) => {
        MetaManager.getThumb(req.params.id).then((x) => {
            res.contentType("image/jpeg");
            res.send(x);
        }).catch(err => {
            res.sendFile("img/kek.jpg", { root: PUBLIC_ROOT });
        });
    });

    app.get("/trackinfo/:id",(req,res) => {
        MetaManager.getTrack(req.params.id).then((x) => {
            if (x < 0) res.sendStatus(500, "Invalid ID");
           res.send(x);
        }).catch(err => { throw new Error(err); });
    });

    app.get("/albumlist",(req,res) => {
        res.send(MetaManager.getAlbums());
    });

    app.get("/artistandalbum",(req,res) => {
        res.send(MetaManager.getArtistsAndAlbums());
    });

    app.get("/alltracks",(req,res) => {
        res.send(MetaManager.getTracksLength());
    });

    
    app.get("/album/:_id", (req, res) => {
        MetaManager.getAlbumDataFromAlbumID(req.params._id).then((x) => {
            if(x == -1){ res.sendStatus(404,"fck you"); }
            else
            res.send(x);
        }).catch(err => {
            res.send("</br>"+err);
        });
    });


    app.get("/getalbumid/:index", (req, res) => {
        MetaManager.getAlbumDataFromIndex(req.params.index).then((x) => {
            if(x == -1){ res.sendStatus(404,"fck you"); }
            else
            res.send(x);
        }).catch(err => {
            res.send("</br>"+err);
        });
    });

    app.get("/tracklist",(req,res) => {
        res.send(MetaManager.getTracks());
    })

    app.use(express.static(path.join(__dirname, PUBLIC_ROOT)));
    app.listen(HTTP_PORT, () => console.log(`HTTP Server Listening on port ${HTTP_PORT}`))

};

MetaManager.start().then(startServer);