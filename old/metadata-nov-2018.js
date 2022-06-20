const mm = require("music-metadata");
const fs = require("fs");
const path = require("path");
const crypto = require('crypto');

var dominant = require('huey/dominant');
var gen = () => { return crypto.createHash('md5').update(Math.floor((1 + Math.random()) * 0x100000).toString(16)).digest("hex"); }

const {
    performance,
    PerformanceObserver
} = require('perf_hooks');

class Artist {
    constructor(artist = "Unknown Artist") {
        this.artist_name = artist;
        this.artist_id = gen();
        this.albums = {};
        this.album_count = 0;
    }
    clean() {
        let cleaned = {};
        cleaned.artist_name = this.artist_name;
        cleaned.artist_id = this.artist_id;
        cleaned.album_count = this.album_count;
        return cleaned;
    }

    getAlbum(album_id) {

        if (typeof album_id == "undefined") return false;

        if (typeof album_id == "string") {
            for (let i in this.albums) {
                if (this.albums[i].album_id == album_id) {
                    return this.albums[i];
                }
            }

        } else if (typeof parseInt(album_id) == "number") {
            var kek = Object.keys(this.albums)[album_id];
            if (kek) return this.albums[kek];
        }

        return -1;
    }

    findAlbums(album_name) {

        let out = [];
        let r = 0;

        for (let album in this.albums) {
            let temp = this.albums[album];
            if (temp.album_name.toLowerCase().trim().indexOf(album_name.toLowerCase()) > -1 ||
                temp.album_name.toLowerCase().trim().indexOf(album_name.toLowerCase().split(" ").join("")) > -1) {
                out.push(temp);
                r++;
            }
        }

        if (r > 0) return out;
        return -1;
    }

}

class Album {
    constructor(album_name = "Unknown Album", artist) {
        this.album_name = album_name;
        this.tracks = {};
        this.track_count = 0;
        this.artist_name = artist.artist_name;
        this.artist_id = artist.artist_id;
        this.album_id = gen();
        this.has_albumart = false;
        this.albumart_index = -1;

    }
    clean(params) {
        let temp = {};
        if (params && params.tracks) {
            temp.tracks = {};
            for (let track in this.tracks) {
                temp.tracks[track] = this.tracks[track].clean();
            }
        }
        return {
            album_name: this.album_name,
            track_count: this.track_count,
            artist_name: this.artist_name,
            artist_id: this.artist_id,
            album_id: this.album_id,
            has_albumart: this.has_albumart,
            albumart_index: this.albumart_index,
            ...temp
        }
    }

    getTrack(track_pos) {
        if (!track_pos || typeof parseInt(track_pos) !== "number") return false;
        for (let j in this.tracks) {
            if (this.tracks[j].track_pos == track_pos) {
                return this.tracks[j];
            }
        }
        return -1;
    }

    getTracks() {
        let k = {};
        for (let track in this.tracks) {
            k[track] = this.tracks[track].clean();
        }
        return k;
    }

    findTracks(track_name) {
        let out = [];
        let that = this;
        let temp1 = Object.keys(this.tracks);
        let temp2 = temp1.map(function (a) { return { index: temp1.indexOf(a), name: a.toLowerCase() }; });
        let temp3 = temp2.filter(function (a) { return a.name.indexOf(track_name.toLowerCase()) > -1; });
        if (temp3.length > 0) return temp3.map(function (a, b) { return that.tracks[temp1[a.index]]; });
        else return -1;
    }

}

class Track {
    constructor(params, album) {
        this.track_name = (params.title) ? params.title : params.filepath; /** fix this */
        this.album_name = album.album_name;
        this.album_id = album.album_id;
        this.artist_name = album.artist_name;
        this.track_pos = 0;
        this.path;
        this.track_index = 0;
        this.uid;
        this.has_albumart = false;
        this.track_duration = params.duration;
    }
    clean() {
        return {
            track_name: this.track_name,
            album_name: this.album_name,
            album_id: this.album_id,
            artist_name: this.artist_name,
            track_pos: this.track_pos,
            track_index: this.track_index,
            has_albumart: this.has_albumart,
            uid: this.uid,
            track_duration: this.track_duration
        }
    }
}

class meta {
    constructor(files, purge, cache = "./cache") {
        if (!files) throw Error("files not specified");
        if (purge) console.log("purging metadata contents.");
        this.data = purge ? {} : JSON.parse(fs.readFileSync("./metadata.json"));
        this.indexer = files;
        this.ls = this.indexer.res;
        this.purge = purge;
        this.cache = cache;
        this.maxlength = -1;
        this.refreshing = false;
        this.log = { flip1: 0, flip2: 0, flip3: 0, flip4: 0 };
    }

    handleThumbnails(track, image, album, force_purge) {

        let that = this;
        let temp = track.uid;
        let temppath = path.join(this.cache, track.uid + ".thumb");
        let exists = fs.existsSync(temppath);
        let check1 = false, check2 = 0;
        if (exists) {
            check1 = true;
        }

        try {
            check2 = fs.statSync(temppath).size;
        } catch (err) {
            check1 = false;
        }

        if ((check1 && check2 > 0 && !this.purge) || !force_purge) {
            //console.log(track.track_name + " thumbnail found");
            this.log.flip1 += 1;
            track.has_albumart = true;
            album.has_albumart = true;
            album.albumart_index = track.track_index;
        } else {

            fs.writeFile(temppath, image, 'binary', function (err) {
                if (err) throw err;
                if (!that.purge) {
                    that.log.flip2 += 1;
                    //   console.log(track.track_name +' thumbnail cached.');
                } else {
                    //       console.log("over writing "+ track.track_name+" thumbnail cache");

                    that.log.flip3 += 1;

                }
                track.has_albumart = true;
                album.has_albumart = true;
                album.albumart_index = track.track_index;
            })

        }
    }

    getThumb(track_index) {
        return new Promise((resolve, reject) => {
            if (track_index == undefined) reject("ID not specified");
            this.getTrack(track_index).then((x) => {
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

    buildMeta(force_purge = false) {
        this.data = {};
        const promises = this.ls.map(filePath => { return mm.parseFile(filePath) });
       
        return Promise.all(promises).then(resolvedPromises => {
            let i = 0;
            resolvedPromises.map(x => {

                let info = x.common;
                info.duration = x.format.duration;
                let temppath = this.ls[i];
                info.album = info.album || "Unknown Album";
                info.artist = info.artist || "Unknown Artist";
                info.title = !info.title || info.title.length == 0 ? temppath.split(path.sep).pop().split(".mp3")[0] + "(fix this)" : info.title;
                
                if (!this.data.hasOwnProperty(info.artist)) {
                    let NewArtist = new Artist(info.artist);
                    this.data[info.artist] = NewArtist;
                }

                if (!this.data[info.artist].albums.hasOwnProperty(info.album)) {
                    let NewAlbum = new Album(info.album, this.data[info.artist]);
                    this.data[info.artist].albums[info.album] = NewAlbum;
                    this.data[info.artist].album_count += 1;
                }

                if (!this.data[info.artist].albums[info.album].tracks.hasOwnProperty(info.title)) {
                    let NewTrack = new Track(info, this.data[info.artist].albums[info.album]);
                    this.data[info.artist].albums[info.album].tracks[info.title] = NewTrack;
                    this.data[info.artist].albums[info.album].tracks[info.title].path = temppath;
                    this.data[info.artist].albums[info.album].tracks[info.title].uid = crypto.createHash('md5').update(temppath).digest("hex");
                    this.data[info.artist].albums[info.album].tracks[info.title].track_index = i++;
                    this.data[info.artist].albums[info.album].track_count++;
                    this.data[info.artist].albums[info.album].tracks[info.title].track_pos = Object.keys(this.data[info.artist].albums[info.album].tracks).length;

                    if (info.picture && info.picture.length > 0) {
                        this.handleThumbnails(this.data[info.artist].albums[info.album].tracks[info.title], info.picture[0].data, this.data[info.artist].albums[info.album], force_purge);
                    } else {
                        this.log.flip4 += 1;
                    }
                }
            });

            return this.log;
        }).catch(console.error);
    }

    getArtistsAndAlbums() {
        let out = {};
        for (let artist in this.data) {
            out[artist] = { artist_info: this.data[artist].clean(), albums: {} };
            for (let album in this.data[artist].albums) {
                var fuck = Object.keys(this.data[artist].albums[album].tracks);
                out[artist].artist_info.album_index = this.data[artist].albums[album].tracks[fuck[0]].track_index;
                out[artist].albums[album] = this.data[artist].albums[album].clean();

            }
        }
        return out;
    }


    findArtists(term) {
        let that = this;
        let temp1 = Object.keys(this.data);
        let temp2 = temp1.map(function (a) { return { index: temp1.indexOf(a), name: a.toLowerCase() }; });
        let temp3 = temp2.filter(function (a) { return a.name.indexOf(term.toLowerCase()) > -1; });
        if (temp3.length > 0) return temp3.map(function (a, b) { return that.data[temp1[a.index]]; });
        else return -1;
    }

    lookupTracks(name) {
        let out = {};
        let r = 0;

        for (let artist in this.data) {
            for (let album in this.data[artist].albums) {
                for (let track in this.data[artist].albums[album].tracks) {
                    let temp = this.data[artist].albums[album].tracks[track];
                    if (temp.track_name.toLowerCase().trim().indexOf(name.toLowerCase()) > -1 ||
                        temp.track_name.toLowerCase().trim().indexOf(name.toLowerCase().split(" ").join("")) > -1) {
                        out[temp.track_name] = temp.clean();
                        r++;
                    }
                }
            }
        }

        if (r > 0) return out;
        return -1;
    }


    getTrack(track_index) {
        return new Promise((resolve, reject) => {
            for (let artist in this.data) {
                for (let album in this.data[artist].albums) {
                    for (let track in this.data[artist].albums[album].tracks) {
                        let temp = this.data[artist].albums[album].tracks[track];
                        if (temp.track_index == track_index) resolve(temp);
                    }
                }
            }
            reject(-1);
        })
    }

    getTracks() {
        let out = {};
        for (let artist in this.data) {

            for (let album in this.data[artist].albums) {


                for (let track in this.data[artist].albums[album].tracks) {
                    let dis = this.data[artist].albums[album].tracks[track];
                    out[track] = dis.clean();
                }

            }
        }
        return out;
    }

    lookupAlbums() {

    }

    getAlbum(album_id) {
        let r = 0;
        return new Promise((resolve, reject) => {
            for (let artist in this.data) {
                for (let album in this.data[artist].albums) {
                    if (this.data[artist].albums[album].album_id == album_id) {
                        resolve(this.data[artist].albums[album]);
                    }
                }
            }
            reject();
        });
    }




    start() {

        return new Promise(
            (resolve, reject) => {
                console.log("building metadata");
                this.buildMeta().then((x) => {
                    fs.writeFileSync("./metadata.json", JSON.stringify(this.data));
                    resolve(this.log);
                });
            });
    }

    refresh() {



        return new Promise(
            (resolve, reject) => {
                if (this.refreshing) { reject(-1); }
                else {
                    this.log = { flip1: 0, flip2: 0, flip3: 0, flip4: 0 };
                    this.refreshing = true;
                    this.indexer = this.indexer.rescan();
                    this.ls = this.indexer.res;
                   
                    console.log("\n  ==== music directory files changed ====");
                    console.log("            == rebuilding == \n");
                    this.buildMeta(true).then((x) => {
                        fs.writeFileSync("./metadata.json", JSON.stringify(this.data));
                        this.refreshing = false;
                        resolve(x);
                    });
                }
            });
    }

}
module.exports = meta;

/** "Alan Walker - Sing Me To Sleep(fix this)
Brahma Vishnu Shiva - Excuse Me(fix this)
Brooks & GRX - Boomerang (Official Video)(fix this)
Brooks - Hold It Down (ft. Micah Martin)(fix this)
Brooks - Lynx (Official Video)(fix this)
Camila Cabello - Havana ft. Young Thug(fix this)
deadmau5 - Strobe(fix this)
DJ Snake, Lauv - A Different Way(fix this)
01_The_Ringer(fix this)
02_Greatest(fix this)
03_Lucky_You_feat_Joyner_Lucas(fix this)
05_Normal(fix this)
06_Em_Calls_Paul_Skit(fix this)
07_Stepping_Stone(fix this)
08_Not_Alike_feat_Royce_da_59_(fix this)
09_Fall(fix this)
10_Kamikaze(fix this)
11_Nice_Guy_feat_Jessie_Reyez(fix this)
12_Good_Guy_feat_Jessie_Reyez(fix this)
13_Venom_Music_From_the_Motion_Pict(fix this)
Fight - All Good Things(fix this)
dheere dheere se(fix this)
GANGNAM STYLE (-----) M_(fix this)
ProleteR - Faidherbe square(fix this)
Imagine Dragons - Levitate(fix this)
Madeon - Youre On (Nick Gunner Remix)(fix this)
Martin Garrix & Brooks - Byte(fix this)
Martin Garrix feat. Khalid - Ocean (Official Video)(fix this)
Oru Adaar Love _ Manikya Malaraya Poovi Song Video_ Vineeth Sreenivasan, Shaan Rahman, Omar Lulu _HD(fix this)
Passenger - Let Her Go (Alex G Cover)(fix this)
Passenger - Let Her Go(fix this)
A Flying Jatt(fix this)
Seether Ft Evanescence's Amy Lee - Broken(fix this)
Selena Gomez - Hands To Myself(fix this)
Thirboki Jeevana(fix this)
60 Drake - Portland (feat. Quavo & Travis Scott)(fix this)
A Cure For An Itch(fix this)
Castle Of Glass(fix this)
Easier To Run(fix this)
01 - Bhaag D.K. Bose Aandhi Aayi(MyMp3Song.Com)(fix this)
03 - Gun Gun Guna(MyMp3Song.Com)(fix this)
ala barfi(fix this)
kyon_(kuttyweb.com)(fix this)
Dj Hazard & D. Minds-Mr Happy - PYRAMID Refix www.123savemp3.net (fix this)
Daft Punk - Doin' it Right (fix this)"
*/