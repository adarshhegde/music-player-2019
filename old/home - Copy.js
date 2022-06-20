let player;

class notif{
    constructor(text,x,y,hold) {
        let n = $(`<div class="notification">${text}</div>`);
        n.css({left:x+"px",top:y+"px"});
        $("body").append(n);
        n[0].addEventListener("animationend",  () => n.remove(), false);
   
        
    }
}

class AudioPlayer {
    constructor(audio) {
        if (!audio) throw new SyntaxError("Audio Element not specified");
        this.audio = audio;
        this.params = {shuffle:false,repeat_mode:"album",repeat:false}; 
        /* album (loop through album), 
        single (loop single track), 
        full_repeat(go continuous, from track to track, album to album) */

        this.nowplaying = {};
        this.track_loaded = false;
        this.playing = false;
        this.albumdata = {};
        this.nowplayingalbum = {};
        this.angle = 0;
        this.activePlaylist = "album";
    }

    getAlbumData(x) {
        return new Promise(function (resolve, reject) {
            fetch(`/album/${x}`).then(x => { return x.json() }).then(x => { resolve(x) }).catch(x => reject(x));
        });
    }

    getTrackData(id) {
        return new Promise(function (resolve, reject) {
            fetch(`/trackinfo/${id}`).then(x => { return x.json() }).then(x => {
                resolve(x);
            }).catch(err => { reject(err) });
        });
    }


    buildArtistBlock(x) {
        let artist_list_item = $(`<div class="artist-list-item" />`);

        let album_list = $(`<div class="album-list"/>`);
        artist_list_item.append(`<div class="artist-name">${x.name}</div>`);
        //x.albums.sort(function (a, b) { let x = 0; if (a..length > b.albums.length) x = -1; else x = 1; return x; })
        for (let i in x.albums) {

            album_list.append(
                `<div class="album-item" data-id="${x.albums[i]._id}">
                    <img class="album-image" src="thumb/${x.albums[i].index}" />
                    <span class="album-name">${x.albums[i].name}</span>
                </div>`
            );

            artist_list_item.append(album_list);
        }
        return artist_list_item;
    }

    refreshList() {
        let that = this;
        fetch("/artistandalbum").then(x => { return x.json() }).then(function (x) {
            that.albumdata = x;
            //  x.sort(function(a,b){ return (a.name < b.name) ? (a.name > b.name) ? 1 : -1 : 0; })
            x.sort(function (a, b) { let x = 0; if (a.albums.length > b.albums.length) x = -1; else x = 1; return x; })
            x.map((artist) => {
                $("#artist-list").append(that.buildArtistBlock(artist));
            });
        });

        //////////////////////

        fetch("/alltracks").then(x => { return x.json() }).then(function (x) {
            that.tracksinfo = x;
        });

        fetch(`/tracklist`).then(x => { return x.json() }).then(x => {  

            let i = 0;
            for(let tr in x) {
          
                let track = $("<p/>");
                let thumbnail = $("<img/>");
                thumbnail.attr("src", "/thumb/" + x[tr].data.index);
                track.append(thumbnail);
                track.append("<span class='artist'>" +x[tr].data.artist + "</span>");
                track.append("<span class='title'>" + x[tr].data.title + "</span>");
                let formattedDuration = (x[tr].data.duration / 60).toFixed(2);
                if (formattedDuration < 10) formattedDuration = "0" + formattedDuration;
                track.append("<span class='duration'>" + formattedDuration + "</span>");
                track.addClass("track");
                track.attr("data-index",x[tr].data.index);
                track.attr("style", `--accent:rgba(${x[tr].data.dominantColor[0]},${x[tr].data.dominantColor[1]},${x[tr].data.dominantColor[2]},.8)`);
                track.attr("data-order", i);
                track.attr("data-id", x[tr].data._id);
                track.append("<div class='progress-bar-mini'><span class='progress-bar-mini-amount'></span></div>");
                if(Object.keys(this.nowplaying).length > 0) {
                if (this.nowplaying.index == x.data[tr].index) {
                    track.addClass("selected");
                }
                }
                i++;
                $("#tracks-list").append(track);
            }
         }).catch(x => {console.log(x)})
    }


    showAlbumTrackList(album_id) {
        return new Promise((resolve, reject) => {
            this.getAlbumData(album_id).then(x => {
                $("#album-tracks").html("");
                let i = 0;
                for (let tr in x.data) {

                    let track = $("<p/>");
                    let thumbnail = $("<img/>");
                    thumbnail.attr("src", "/thumb/" + x.data[tr].index);
                    track.append(thumbnail);
                    track.append("<span class='artist'>" + x.data[tr].artist + "</span>");
                    track.append("<span class='title'>" + x.data[tr].title + "</span>");
                    let formattedDuration = (x.data[tr].duration / 60).toFixed(2);
                    if (formattedDuration < 10) formattedDuration = "0" + formattedDuration;
                    track.append("<span class='duration'>" + formattedDuration + "</span>");
                    track.addClass("track");
                    track.attr("data-index", x.data[tr].index);
                    track.attr("style", `--accent:rgba(${x.data[tr].dominantColor[0]},${x.data[tr].dominantColor[1]},${x.data[tr].dominantColor[2]},.8)`);
                    track.attr("data-order", i);
                    track.attr("data-id", album_id);
                    track.append("<div class='progress-bar-mini'><span class='progress-bar-mini-amount'></span></div>");

                    if (this.nowplaying.index == x.data[tr].index) {
                        track.addClass("selected");
                    }
                    i++;
                    $("#album-tracks").append(track);
                }
                //   this.updateControls();
                $(".album-name-main").text(x.info.name);
                $(".artist-name-main").text(x.info.artist);
                $(".album-art-main").attr("src", `thumb/${x.info.index}`);

            }).then(() => {

                $("#album-tracks-area").addClass("show");
                resolve();
            });
        });
    }

    playTrack(track_id, album_id) {
        let that = this;

        return new Promise(function (resolve, reject) {
            $("audio")[0].src = `stream/${track_id}`;
            $("audio")[0].play().then((x) => {
                that.getTrackData(track_id).then(x => {
                    that.nowplaying = x;

                    that.getAlbumData(album_id).then(x => {

                        that.track_loaded = true;

                        that.nowplayingalbum = x;
                        that.playing = true;
                        resolve();


                    });

                });

            });
        });
    }

    clearUI() {

        $(".selected").find(".progress-bar-mini").removeClass("show");
        $(".selected").children(".progress-bar-mini").find(".progress-bar-mini-amount").css({ width: 0 });
        $(".track").removeClass("selected");

    }

    updateUI() {

        $("#album-tracks,#tracks-list").find(`[data-index='${this.nowplaying.index}']`).addClass("selected");
        $(".selected").children(".progress-bar-mini").addClass("show");
        //$("#now-playing-button-inner i").text("pause");
    }

    updateControls() {
        if(!this.params.repeat) {
            $("#toggle-repeat i").text("repeat");
            $("#toggle-repeat").removeClass("enabled");
            $("#toggle-repeat").removeClass("full_enabled");
        } else if(this.params.repeat_mode == "album"){
            $("#toggle-repeat i").text("repeat");
            $("#toggle-repeat").addClass("enabled");
            $("#toggle-repeat").removeClass("full_enabled");
        }
        else if(this.params.repeat_mode == "single"){
            $("#toggle-repeat i").text("repeat_one");
            $("#toggle-repeat").addClass("enabled");
            $("#toggle-repeat").removeClass("full_enabled");
        }
        else if(this.params.repeat_mode == "full_repeat"){
            $("#toggle-repeat i").text("repeat");
            $("#toggle-repeat").addClass("enabled");
            $("#toggle-repeat").addClass("full_enabled");
        } 
    }

    shuffle() {

        let track_id = Math.floor(Math.random() * this.tracksinfo.max);

        fetch("/getalbumid/" + track_id).then(x => { return x.json() }).then(x => {

            let album_id = x.info.albumid;

            this.playTrack(track_id, album_id).then(x => {
                this.clearUI();
                this.updateUI();
            });

        });
    }

    repeat() {
        if(this.params.repeat_mode == "album"){
            
       
            let current_track = this.nowplaying.track_pos;
            if(++current_track > Object.keys(player.nowplayingalbum.data).length) {
                current_track = 1;
            } 

            console.log(current_track);
            for (let track in this.nowplayingalbum.data) {
                if (this.nowplayingalbum.data[track].track_pos == current_track) {
                  
                //    fetch("/getalbumid/" + this.nowplayingalbum.data[track].index).then(x => { return x.json() }).then(x => {
                      
                        this.playTrack(this.nowplayingalbum.data[track].index, this.nowplayingalbum.info.albumid).then(x => {
                            this.clearUI();
                            this.updateUI();
                        });
               //     });
                }
            }
        } else if(this.params.repeat_mode == "single"){
            this.playTrack(this.nowplaying.index, this.nowplayingalbum.info.albumid).then(x => {
                this.clearUI();
                this.updateUI();
            });

        } else if(this.params.repeat_mode == "full_repeat") {
            let current_track = this.nowplaying.order;
            current_track++;
            if(current_track > this.tracksinfo.max) {
                current_track = 0;
            }
            fetch("/getalbumid/" + current_track).then(x => { return x.json() }).then(x => {
                this.playTrack(current_track, x.info.albumid).then(x => {
                    this.clearUI();
                    this.updateUI();
                });
            });

        }
    }



    attachListeners() {
        var that = this;

        /* album item -> track area */
        $(document).on('click', ".album-item", function () {
            //  toggleFullScreen();
            let album_id = $(this).attr("data-id");
            $(this).addClass("loading");
            that.showAlbumTrackList(album_id).then(() => {
                $(this).removeClass("loading");
            });
        });


        /** hide track list */
        $(document).on('click', "#back-to-albums-btn", function () {
            //  $("#go-up").addClass("enabled");
            $("#album-tracks-area").removeClass("show");
        });

        /* clicky click click. */
        $(document).on('click', ".track", function () {
            let track_id = $(this).attr("data-index");
            let album_id = $(this).attr("data-id");

            that.playTrack(track_id, album_id).then(x => {
                that.clearUI();
                that.updateUI();
            });
        });

        /* update progress bar */
        $("audio")[0].addEventListener("timeupdate", function () {
            $(".selected").find(".progress-bar-mini-amount").css({ width: ($(this)[0].currentTime / $(this)[0].duration) * 100 + "%" });
        });

        /* on ended */
        $("audio")[0].addEventListener("ended", function () {

            if (that.params.shuffle) {
                that.shuffle();
            } else if(that.params.repeat) {
                that.repeat();
            }


            //////////////////////////////////
            else {
                that.playing = false;
                that.clearUI();
            }

        });

        $("#now-playing-controls #toggle-repeat").on("click", function() {

            let $this = $(this);
            let offset = $this.offset();
            let width = $this.width();
            let height = $this.height();
            let centerX = offset.left - $this.width() / 4;
            let centerY = offset.top - 45;
            
            let test = "ee";
            let cases = ["album","single","full_repeat"];
            if(!that.params.repeat){
                that.params.repeat = true;
                that.params.repeat_mode = "album";
                test = "repeat album";
            } else if(that.params.repeat_mode == "album") {
                    that.params.repeat_mode = "single";
                    test = "repeat single";
                } else if(that.params.repeat_mode == "single"){
                    that.params.repeat_mode = "full_repeat";
                    test = "repeat full";
                } else if(that.params.repeat_mode == "full_repeat"){
                    that.params.repeat = false;
                    test = "no repeat";
                }
            
            that.updateControls();
            new notif(test,centerX,centerY);
        });

        $("#navigation-pane .nav-item").on("click", function() { 
            $(".nav-item").removeClass("active");
            $(this).addClass("active");
            var changeto = $(this).attr("data-name");
            if(changeto == "TRACKS") {
                $("#tracks-list").toggle();
                $("#artist-list").toggle();
            } else {
                $("#tracks-list").toggle();
                $("#artist-list").toggle();
            }
        });


    }

    init() {

        this.refreshList();
        this.attachListeners();

    }
}


$(function () {
    player = new AudioPlayer($("audio")[0]);
    player.init();

});