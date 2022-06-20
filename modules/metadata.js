const mm = require("music-metadata");
const fs = require("fs");
const path = require("path");
const _ = require("../modules/myutils");
const { performance } = require('perf_hooks');
var dominant = require('huey/dominant');

let glob_index = 0;

let x = performance.now();


let elapsed = (...logs) => { logs.map((log) => { console.log(`${`[${(performance.now() - x).toFixed(2)}]`.padStart(8, ' ')}  ` + log); }) };

let endl = () => console.log('\n');

let commons = {
    clean: function (props = null, passthrough = false) {
        if (props == null) return this;
        let out = {};
        let temp = {};

        if (this.nodeType == "Album") {
            temp.tracks = {};
            for (let track in this.tracks) {
                temp.tracks[track] = this.tracks[track].clean(["album_name", "track_count", "artist_name", "artist_id", "album_id", "has_albumart", "albumart_index"]);
            }
        }

        for (let prop in props) {
            if (this.hasOwnProperty(props[prop])) {
                out[props[prop]] = this[props[prop]];
            }
        };

        if (passthrough && this.nodeType == "Album") {
            out = { ...out, ...temp };
        }

        return out;
    }
}


/**
 * Artist class
 * @constructor
 */
class Artist {
    constructor() {
        Object.assign(this, commons);
        this.artist_name;
        this.nodeType = "Artist";
        this.artist_id;
        this.albums = {};
        this.album_count = 0;
    }

    make(artist = "Unknown Artist") {
        this.artist_name = artist;
        this.artist_id = _.hash(this.artist_name);
    }

    makeFrom(artist) {
        if (!artist) return;
        this.artist_name = artist.artist_name;
        this.artist_id = artist.artist_id;
        this.albums = artist.albums;
        this.album_count = artist.album_count;
    }

    getAlbum(album_id = false) {
        if (!album_id) return false;
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


    findAlbum(album_name) {

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

    addAlbum(album_name) {

        let temp = new Album();
        temp.make(album_name, this);
        this.albums[album_name] = temp;
        this.album_count += 1;

    }

    hasAlbum(album_name) {
        return this.albums.hasOwnProperty(album_name);
    }

}

/**
 * Album class
 * @constructor
 */
class Album {
    constructor() {
        Object.assign(this, commons);
        this.album_name;
        this.tracks = {};
        this.track_count = 0;
        this.nodeType = "Album";
        this.artist_name;
        this.artist_id;
        this.album_id;
        this.has_albumart = false;
        this.albumart_index = -1;
    }

    make(album_name = "Unknown Album", artist) {
        this.album_name = album_name;
        this.artist_name = artist.artist_name;
        this.artist_id = artist.artist_id;
        this.album_id = _.hash(this.artist_name + this.album_name);
    }

    makeFrom(album) {
        for (let prop in album) this[prop] = album[prop];
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

    findTrack(track_name = "") {
        if (track_name == "") return -1;
        let out = [];
        let that = this;
        let temp1 = Object.keys(this.tracks).map(x => { return this.tracks[x].track_name });
        let temp1_2 = Object.keys(this.tracks);
        let temp2 = temp1.map(function (a) { return { index: temp1.indexOf(a), name: a.toLowerCase() }; });
        let temp3 = temp2.filter(function (a) { return a.name.indexOf(track_name.toLowerCase()) > -1; });
        if (temp3.length > 0) return temp3.map(function (a, b) { return that.tracks[temp1_2[a.index]]; });
        else return -1;
    }

    getAllTracks() {
        let k = {};
        for (let track in this.tracks) {
            k[track] = this.tracks[track].clean();
        }
        return k;
    }

    addTrack(info) {

        let temp = new Track();
        temp.make(info, this)
        this.tracks[temp.uid] = temp;
        this.tracks[temp.uid].track_index = glob_index++;
        this.track_count++;
        this.tracks[temp.uid].track_pos = Object.keys(this.tracks).length;
    }

    hasTrack(uid) {
        return this.tracks.hasOwnProperty(uid);
    }
}

/**
 * Track class
 * @constructor
 */
class Track {
    constructor() {
        Object.assign(this, commons);
        this.nodeType = "Track";
        this.track_name;
        this.album_name;
        this.album_id;
        this.artist_name;
        this.artist_id;
        this.track_pos;
        this.path;
        this.track_index;
        this.uid;
        this.has_albumart = false;
        this.track_duration;
        this.temp_imgdata;
    }

    make(params, album) {
        this.track_name = (params.title) ? params.title : params.filepath; /** fix this */
        this.album_name = album.album_name;
        this.album_id = album.album_id;
        this.artist_id = album.artist_id;
        this.artist_name = album.artist_name;
        this.path = params.path;
        this.uid = params.uid;
        this.track_duration = params.duration;
        this.temp_imgdata = (params.temp_imgdata) ? params.temp_imgdata : false;
    }

    makeFrom(track) {
        for (let prop in track) this[prop] = track[prop];
    }
}
/**
 * Metadata manager class
 * @constructor
 * @param {function} Indexer class object
 * @param {string} Path cache folder  
 */
class meta {
    constructor(indexer, cache = "./cache") {
        if (!indexer) throw Error("indexer not specified");
        //   this.data = purge ? {} : JSON.parse(fs.readFileSync("./metadata.json"));
        this.main = {};
        this.indexer = indexer;
        this.ls = [];
        this.recent_changes = {
            recently_added: {},
            most_played: {}
        };
        this.cache = cache;
        this.maxlength = -1;
        this.refreshing = false;
        this.log = { has_thumbnail: 0, no_thumbnail: 0 };
    }

    initialScan() {
        let temp = {};
        this.ls = this.indexer.scan().res;
        const promises = this.ls.map(filePath => { return mm.parseFile(filePath) });


        return Promise.all(promises).then(resolvedPromises => {

            resolvedPromises.map(x => {
                this.maxlength++;
                let info = x.common;
                info.duration = x.format.duration;
                let temppath = this.ls[this.maxlength];
                info.album = info.album || "Unknown Album";
                info.artist = info.artist || "Unknown Artist";
                let tempname = info.title;
                if (tempname == undefined || tempname.length < 1 || tempname == "") {
                    tempname = temppath.split(path.sep).pop().split(".mp3")[0] + "(fix this)";
                }
                info.title = tempname;


                if (!temp.hasOwnProperty(info.artist)) {
                    temp[info.artist] = new Artist();
                    temp[info.artist].make(info.artist);
                }

                if (!temp[info.artist].hasAlbum(info.album))
                    temp[info.artist].addAlbum(info.album);

                let hashed = _.hash(temppath);

                if (!temp[info.artist].albums[info.album].hasTrack(hashed)) {

                    temp[info.artist].albums[info.album].addTrack(
                        {
                            title: info.title,
                            duration: info.duration,
                            path: temppath,
                            uid: hashed,
                            temp_imgdata: (info.picture && info.picture.length > 0) ? info.picture[0].data : false
                        }
                    );

                }


            })


            return temp;
        }).catch(console.error);

    }

    resolveThumbnails(x) {
        let that = this;
        for (let artist in x) {
            for (let album in x[artist].albums) {
                for (let track in x[artist].albums[album].tracks) {

                    let imgdata = x[artist].albums[album].tracks[track].temp_imgdata;
                    if (!imgdata) {
                        x[artist].albums[album].tracks[track].has_albumart = false;
                        x[artist].albums[album].has_albumart = false;
                        x[artist].albums[album].albumart_index = -1;
                        this.log.no_thumbnail += 1;
                    }
                    else {

                        let temppath = path.join(this.cache, x[artist].albums[album].tracks[track].uid + ".thumb");
                        let canread = fs.existsSync(temppath);
                        let filesize = 0;
                        try {
                            filesize = fs.statSync(temppath).size;
                        } catch (err) {
                            canread = false;
                            filesize = 0;
                        }

                        if (canread && filesize > 0) {
                            x[artist].albums[album].tracks[track].has_albumart = true;
                            x[artist].albums[album].has_albumart = true;
                            x[artist].albums[album].albumart_index = x[artist].albums[album].tracks[track].track_index;
                            //console.log(`found thumb for ${x[artist].albums[album].tracks[track].track_name}`);
                            this.log.has_thumbnail += 1;
                        } else {
                            try {
                                fs.writeFile(temppath, x[artist].albums[album].tracks[track].temp_imgdata, 'binary', function (err) {
                                    if (err) {
                                        console.log(err);
                                        x[artist].albums[album].tracks[track].has_albumart = false;
                                        x[artist].albums[album].has_albumart = false;
                                        x[artist].albums[album].albumart_index = -1;
                                        console.log(`error while caching ${x[artist].albums[album].tracks[track].track_name} thumb`);
                                        that.log.no_thumbnail += 1;
                                    } else {
                                        console.log(`caching ${x[artist].albums[album].tracks[track].track_name} thumb`);
                                        x[artist].albums[album].tracks[track].has_albumart = true;
                                        x[artist].albums[album].has_albumart = true;
                                        x[artist].albums[album].albumart_index = x[artist].albums[album].tracks[track].track_index;
                                        that.log.has_thumbnail += 1;
                                    }
                                });
                            } catch (err) {

                                console.log(err);
                                x[artist].albums[album].tracks[track].has_albumart = false;
                                x[artist].albums[album].has_albumart = false;
                                x[artist].albums[album].albumart_index = -1;
                                console.log(`error (catch) while caching ${x[artist].albums[album].tracks[track].track_name} thumb`);
                                this.log.no_thumbnail += 1;
                            }
                        }
                    }
                    x[artist].albums[album].tracks[track].temp_imgdata = false; //to prevent img blob being written to metadata file

                }
            }
        }

        return x;
    }

    checkChanges(new_metadata) {

        return new Promise((resolve, reject) => {
            let old_metadata = JSON.parse(fs.readFileSync("./metadata.json"));

            let removedArtists = {};
            let newArtists = {};
            // let artistsWithChange = [];
            let newAlbums = {};
            let removedAlbums = {};
            let newTracks = {};
            let removedTracks = {};

            for (let i in new_metadata) {
                if (!old_metadata.hasOwnProperty(i)) {
                    newArtists[new_metadata[i].artist_id] = (new_metadata[i]);
                }
            }

            for (let i in old_metadata) {
                if (!new_metadata.hasOwnProperty(i)) {
                    removedArtists[old_metadata[i].artist_id] = (old_metadata[i]);
                }
            }


            // for(let i in new_metadata) {
            //         if(!old_metadata.hasOwnProperty(i)) continue;
            //         if(new_metadata[i].album_count !== old_metadata[i].album_count) {
            //             artistsWithChange.push(new_metadata[i]);
            //         }
            // }

            for (let i in new_metadata) {
                //     if(!old_metadata.hasOwnProperty(i)) continue;
                for (let j in new_metadata[i].albums) {
                    if (!old_metadata[i] || !old_metadata[i].albums.hasOwnProperty(j)) {
                        newAlbums[new_metadata[i].albums[j].album_id] = (new_metadata[i].albums[j]);
                    }
                }
            }


            for (let i in old_metadata) {
                //    if(!new_metadata.hasOwnProperty(i)) continue;
                for (let j in old_metadata[i].albums) {
                    if (!new_metadata[i] || !new_metadata[i].albums.hasOwnProperty(j)) {
                        removedAlbums[old_metadata[i].albums[j].album_id] = (old_metadata[i].albums[j]);
                    }
                }
            }

            for (let i in new_metadata) {
                // if(!old_metadata.hasOwnProperty(i)) continue;
                for (let j in new_metadata[i].albums) {
                    //       if(!old_metadata[i].albums.hasOwnProperty(j)) continue;
                    for (let k in new_metadata[i].albums[j].tracks) {
                        if (!old_metadata[i] || !old_metadata[i].albums[j] || !old_metadata[i].albums[j].tracks.hasOwnProperty(k)) {
                            newTracks[new_metadata[i].albums[j].tracks[k].uid] = (new_metadata[i].albums[j].tracks[k]);
                        }
                    }
                }
            }

            for (let i in old_metadata) {
                //   if(!new_metadata.hasOwnProperty(i)) continue;
                for (let j in old_metadata[i].albums) {
                    //  if(!new_metadata[i].albums.hasOwnProperty(j)) continue;
                    for (let k in old_metadata[i].albums[j].tracks) {
                        if (!new_metadata[i] || !new_metadata[i].albums[j] || !new_metadata[i].albums[j].tracks.hasOwnProperty(k)) {
                            removedTracks[old_metadata[i].albums[j].tracks[k].uid] = (old_metadata[i].albums[j].tracks[k]);
                        }
                    }
                }
            }

            fs.writeFileSync("./metadata.json", JSON.stringify(new_metadata, null, 4));
            this.main = new_metadata;
            resolve({
                removedArtists
                , newArtists
                , newAlbums
                , removedAlbums
                , newTracks
                , removedTracks
            });
        });
    }

    getRecentData() {

        return new Promise((resolve, reject) => {
            let temp = JSON.parse(fs.readFileSync("./recent-changes.json"));
            for (let prop in temp) {
                //if(!this.recent_changes.hasOwnProperty(prop)) ;
                this.recent_changes[prop] = temp[prop];
            }

            resolve();
        });
    }

    async updateChanges(x) {
        let new_trax = Object.keys(x.newTracks);
        let current_recently_added = Object.keys(this.recent_changes.recently_added);
        for (let nt in x.newTracks) {
            if (current_recently_added.indexOf(nt) !== -1) {

            } else {
                this.recent_changes.recently_added[nt] = x.newTracks[nt];
            }
        }

        for (let nt in x.removedTracks) {
            if (current_recently_added.indexOf(nt) !== -1) {

                delete this.recent_changes.recently_added[nt];
            }
        }
        let temp = [];
        for (let artist in this.main) {
            for (let album in this.main[artist].albums) {
                for (let track in this.main[artist].albums[album].tracks) {
                    temp.push(track);
                    if (current_recently_added.indexOf(track) !== -1) {

                        //        delete this.recent_changes.recently_added[track];
                    }
                }
            }
        }

        for (let ot in current_recently_added) {
            if (temp.indexOf(current_recently_added[ot]) == -1) {
                delete delete this.recent_changes.recently_added[current_recently_added[ot]];
            }
        }

        let keko = Object.keys(this.recent_changes.recently_added);

        if (keko.length > 15) {
            keko.splice(0, keko.length - 15);
        }

        let kekoed = {};
        for (let i in keko) {
            let track = new Track();
            let tempthing = {};
            try {
                for (let track in this.main) {
                    for (let j in this.main[track].albums) {
                        for (let k in this.main[track].albums[j].tracks) {
                            if (keko[i] == k) {
                                tempthing = this.main[track].albums[j].tracks[k];
                            }
                        }
                    }
                }

                track.makeFrom(tempthing);
            } catch (err) { // in case if something goes wrong
                console.log(err);
                track.makeFrom(this.recent_changes.recently_added[keko[i]]);
            }
            kekoed[keko[i]] = track;
        }

        this.recent_changes.recently_added = kekoed;

        await fs.writeFileSync("./recent-changes.json", JSON.stringify(this.recent_changes, null, 4));

        return x;
    }

    getTrackFromIndex(track_index) {
        return new Promise((resolve, reject) => {
            for (let artist in this.main) {
                for (let album in this.main[artist].albums) {
                    for (let track in this.main[artist].albums[album].tracks) {
                        let temp = this.main[artist].albums[album].tracks[track];
                        if (temp.track_index == track_index) resolve(temp);
                    }
                }
            }
            reject(-1);
        })
    }

    getAlbumFromAlbumID(album_id) {
        return new Promise((resolve, reject) => {
            for (let artist in this.main) {
                for (let album in this.main[artist].albums) {
                    if (this.main[artist].albums[album].album_id == album_id) {
                        resolve(this.main[artist].albums[album]);
                    }
                }
            }
            reject(-1);
        });
    }

    /* route functions */
    getArtistsList() {
        return new Promise((resolve, reject) => {
            let out = {};
            try {
                for (let artist in this.main) {
                    out[artist] = { artist_info: this.main[artist].clean(["artist_name", "artist_id", "album_count"]), albums: {} };
                    for (let album in this.main[artist].albums) {
                        // var fuck = Object.keys(this.main[artist].albums[album].tracks);
                        // out[artist].artist_info.album_index = this.main[artist].albums[album].tracks[fuck[0]].track_index;
                        out[artist].albums[album] = this.main[artist].albums[album].clean(["album_name", "track_count", "artist_name", "artist_id", "album_id", "has_albumart", "albumart_index"]);
                    }
                }
                resolve(out);
            } catch (err) {
                reject(err);
            }
        });
    }

    getRecentsList(){
        return new Promise((resolve, reject) => {

        let temp = {}, kek = 0;

        let reversed = Object.keys(this.recent_changes.recently_added).reverse();

        reversed.map(track => { temp[track] = { ...this.recent_changes.recently_added[track], track_order: kek++ } })
        
        resolve(temp);

        });
    }

    getTracksList() {
        return new Promise((resolve, reject) => {
            let out = {};
            let kek = 0;
            try {

                for (let artist in this.main) {

                    for (let album in this.main[artist].albums) {
                        for (let track in this.main[artist].albums[album].tracks) {
                            let dis = this.main[artist].albums[album].tracks[track];
                            out[track] = {
                                ...dis.clean([
                                    "track_name",
                                    "album_name",
                                    "album_id",
                                    "artist_name",
                                    "track_pos",
                                    "track_index",
                                    "has_albumart",
                                    "uid",
                                    "track_duration"
                                ]), track_order: kek++
                            };
                        }

                    }
                }

                let tids = Object.keys(out);
                tids.sort((a, b) => {
                    if (out[a].track_index > out[b].track_index) {
                        return 1;
                    }
                    else if (out[b].track_index > out[a].track_index) {
                        return -1;
                    }
                    return 0;
                });
                let out2 = {};
                for (let i in tids) out2[tids[i]] = out[tids[i]];

                resolve(out2);
            } catch (err) {
                reject(err);
            }
        });
    }

    resolveThumb(track_index) {
        return new Promise((resolve, reject) => {
            if (track_index == undefined) reject("ID not specified");
            this.getTrackFromIndex(track_index).then((track) => {
                try {
                    if (track.has_albumart) {
                        var buffer = fs.readFileSync(path.join(this.cache, track.uid + ".thumb"));
                        resolve(buffer);
                    } else {
                        reject(-69);
                    }
                } catch (err) {
                    reject(err);
                }
            }).catch(err => {
                reject("Invalid ID provided.");
            });
        });
    }

    async start() { 
        try {
            endl();
            elapsed("Loading recent changes log.");
            let recentdata = this.getRecentData();
            elapsed("Building new metadata tree.");
            let initialscan = await this.initialScan();
            elapsed("Resolving albumart info.")
            let resolvethumbs = await this.resolveThumbnails(initialscan);
            elapsed("Checking for metadata tree changes.");
            let resolvechanges = await this.checkChanges(resolvethumbs);
            elapsed("Updating recent changes log.");
            let resolveupdatechanges = await this.updateChanges(resolvechanges);
            return Promise.resolve(resolveupdatechanges);
        } catch (err) { return Promise.reject(err); }
    }

}
module.exports = { MetaManager:meta, elapsed:elapsed };