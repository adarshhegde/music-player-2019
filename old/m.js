const mm = require("music-metadata");
const fs = require("fs");
const path = require("path");
const crypto = require('crypto');
var dominant = require('huey/dominant');

class meta {

    constructor(files, purge, cache = "./cache") {
        if (!files) throw Error("files not specified");
        if (purge) console.log("purging metadata contents.");
        this.data = purge ? {} : JSON.parse(fs.readFileSync("./metadata.json"));
        this.ls = files;
        this.purge = purge;
        this.cache = cache;
        this.maxlength = -1;
    }

    buildMeta() {
        const promises = this.ls.map(filePath => { return mm.parseFile(filePath) });

        console.log("purging cache contents.");
        
        return Promise.all(promises).then(resolvedPromises => {

            resolvedPromises.map(x => {

                this.maxlength++;
                let info = x.common;
                info.index = this.maxlength;

                if (!info.album) info.album = "Unknown Album";
                if (!info.artist) info.artist = "Unknown Artist";
                this.data[info.artist] = this.data[info.artist] || {};
                this.data[info.artist].albums = this.data[info.artist].albums || {};
                this.data[info.artist].albums[info.album] = this.data[info.artist].albums[info.album] || {};

                this.data[info.artist].albums[info.album].tracks = this.data[info.artist].albums[info.album].tracks || {};
                this.data[info.artist].albums[info.album]._id = this.data[info.artist].albums[info.album]._id || crypto.createHash('md5').update(Math.floor((1 + Math.random()) * 0x100000).toString(16)).digest("hex");
                let temp = info;
                temp.dominantColor = [0, 0, 0];




                info.uid = crypto.createHash('md5').update(this.ls[this.maxlength]).digest("hex");
                let temppath = path.join(this.cache, info.uid + ".thumb");
                let test = fs.existsSync(temppath);
                let m1 = false, m2 = { size: 0 };
                if (test) {
                    m1 = true;
                }

                try {
                    m2.size = fs.statSync(temppath).size;
                } catch (err) {
                    m1 = false;
                }

                if (m1 && m2.size > 0 && !this.purge) {
                    // console.log("thumbnail found");
                } else {
                    if (temp.picture && temp.picture.length > 0) {

                        temp.dominantColor = dominant(temp.picture[0].data);

                        fs.writeFile(temppath, temp.picture[0].data, 'binary', function (err) {
                            if (err) throw err;
                            //      console.log(info.title.substring(10), ' thumbnail cached.');
                        })
                    } else {
                        //    console.log("no thumbnail embedded in file");
                    }
                }



                delete temp["picture"];
                if (info.title == undefined || info.title == "") {
                    let ab = this.ls[this.maxlength].split(path.sep).pop().split(".mp3")[0];
                    info.title = ab + " (fix this)";
                };
                info.duration = x.format.duration;

                this.data[info.artist].albums[info.album].tracks[info.title] = info;
                let sax = 0;
                let ehh = this.data[info.artist].albums[info.album].tracks;
                sax = Object.keys(ehh).length;
                this.data[info.artist].albums[info.album].tracks[info.title].track_pos = sax;
                this.data[info.artist].albums[info.album].tracks[info.title].path = this.ls[this.maxlength];

            });
            return this.data;
        }).catch(console.error);
    }

    /*
    
        {
            "Avicii": {
                albums: {
                    "Avici - 2016": {
                        id:"EHHHHHHHHHH"
                        tracks: {
                        "wake me up" : { .... }
                        "Without you" : { .... }
                        }
                    }
                }
            }
        }

    */

    start() {
        return new Promise(
            (resolve, reject) => {
                this.buildMeta().then((x) => {
                    fs.writeFileSync("./metadata.json", JSON.stringify(this.data));
                    resolve(this.data);
                });
            });


    }

    getArtistsAndAlbums() {
        //  return new Promise((resolve,reject) => {
        let x = [];
        for (let i in this.data) {
            let kek = { name: i, albums: [] };
            for (let album in this.data[i].albums) {
                var fuck = Object.keys(this.data[i].albums[album].tracks);
                kek.albums.push({ name: album, index: this.data[i].albums[album].tracks[fuck[0]].index, _id: this.data[i].albums[album]._id });
            }

            x.push(kek);
        }
        return x;
        //  resolve(x);
        //  });
    }

    getArtists() {
        let x = [];
        for (let i in this.data) x.push(i);
        return x;
    }

    getTracksLength() {
        return { min: 0, max: this.maxlength };
    }

    getAlbumDataFromAlbumID(_id) {
        return new Promise(
            (resolve, reject) => {
                if (!_id) reject(-1);
                let temp = false;
                for (let artist in this.data) {
                    for (let album in this.data[artist].albums) {
                        if (this.data[artist].albums[album]._id == _id) {
                            var fuck = Object.keys(this.data[artist].albums[album].tracks);
                            temp = { data: this.data[artist].albums[album].tracks, info: { artist: this.data[artist].albums[album].tracks[fuck[0]].artist, name: album, index: this.data[artist].albums[album].tracks[fuck[0]].index, albumid: this.data[artist].albums[album]._id } };
                            resolve(temp);
                        }
                    }
                }
                resolve(-1);
            });
    }
    getAlbumDataFromIndex(lulz) {
        return new Promise(
            (resolve, reject) => {
                if (!lulz) reject(-1);
                let temp = false;
                for (let artist in this.data) {
                    for (let album in this.data[artist].albums) {
                        for (let track in this.data[artist].albums[album].tracks) {
                            if (lulz == this.data[artist].albums[album].tracks[track].index) {
                                var fuck = Object.keys(this.data[artist].albums[album].tracks);
                                temp = { data: this.data[artist].albums[album].tracks, info: { artist: this.data[artist].albums[album].tracks[fuck[0]].artist, name: album, index: this.data[artist].albums[album].tracks[fuck[0]].index, albumid: this.data[artist].albums[album]._id } };
                                resolve(temp);
                            }
                        }

                    }
                }
                resolve(-1);
            });
    }

    getTracks(lol = []) {
        let x = [];
        for (let artist in this.data) {
            for (let album in this.data[artist].albums) {
                for (let track in this.data[artist].albums[album].tracks) {
                    this.data[artist].albums[album].tracks[track]._id = this.data[artist].albums[album]._id;
                    var temp = {};
                    if (lol.length > 0) for (let prop in lol) {

                        prop = lol[prop];
                        if (prop == "_id") temp[prop] = this.data[artist].albums[album]._id;
                        else
                            temp[prop] = this.data[artist].albums[album].tracks[track][prop];

                    } else {
                        temp = this.data[artist].albums[album].tracks[track];
                    }
                    x.push({ data: temp, index: this.data[artist].albums[album].tracks[track].index })
                }
            }
        }
        return x;
    }
    getAlbums() {
        let x = [];
        for (let i in this.data) for (let j in this.data[i]) x.push({ album: Object.keys(this.data[i].albums), artist: i });
        return x;
    }

    getTrack(id) {

        return new Promise((resolve, reject) => {

            if (id == undefined) reject("ID not specified.");
            for (let artist in this.data) {
                for (let album in this.data[artist].albums) {
                    for (let track in this.data[artist].albums[album].tracks) {

                        if (this.data[artist].albums[album].tracks[track].index == id) {

                            resolve(this.data[artist].albums[album].tracks[track]);

                        }
                    }
                }
            }
            resolve(-1);

        });

    }

    getThumb(id) {
        return new Promise((resolve, reject) => {

            if (id == undefined) reject("ID not specified");

            this.getTrack(id).then((x) => {
                if (x < 0) reject("Invalid ID provided.");
                try {
                    var buffer = fs.readFileSync(path.join(this.cache, x.uid + ".thumb"));
                    resolve(buffer);
                } catch (err) {
                    reject(err);
                }
            });

        });
    }
}
module.exports = meta;