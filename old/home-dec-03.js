
const observer = lozad();


let deferredPrompt;

window.addEventListener('beforeinstallprompt', (e) => {
    console.log(e)
    })

window.addEventListener('beforeinstallprompt', (e) => {
  // Prevent Chrome 67 and earlier from automatically showing the prompt
  e.preventDefault();
  // Stash the event so it can be triggered later.
  deferredPrompt = e;
});

document.getElementById("go-up").addEventListener('click', (e) => {
    // hide our user interface that shows our A2HS button
    // Show the prompt
    deferredPrompt.prompt();
    // Wait for the user to respond to the prompt
    deferredPrompt.userChoice
      .then((choiceResult) => {
        if (choiceResult.outcome === 'accepted') {
          console.log('User accepted the A2HS prompt');
        } else {
          console.log('User dismissed the A2HS prompt');
        }
        deferredPrompt = null;
      });
  });

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', function() {
      navigator.serviceWorker.register('sw.js').then(function(registration) {
        // Registration was successful
        console.log('ServiceWorker registration successful with scope: ', registration.scope);
      }, function(err) {
        // registration failed :(
        console.log('ServiceWorker registration failed: ', err);
      });
    });
  }


function toggleFullscreen(elem) {
    if (navigator.platform == "Win32") return;
    elem = elem || document.documentElement;
    if (!document.fullscreenElement && !document.mozFullScreenElement &&
        !document.webkitFullscreenElement && !document.msFullscreenElement) {
        if (elem.requestFullscreen) {
            elem.requestFullscreen();
        } else if (elem.msRequestFullscreen) {
            elem.msRequestFullscreen();
        } else if (elem.mozRequestFullScreen) {
            elem.mozRequestFullScreen();
        } else if (elem.webkitRequestFullscreen) {
            elem.webkitRequestFullscreen(Element.ALLOW_KEYBOARD_INPUT);
        }
    }
}
let player;

class notif {
    constructor(text, x, y, hold) {
        let n = $(`<div class="notification">${text}</div>`);
        n.css({ left: x + "px", top: y + "px" });
        $("body").append(n);
        n[0].addEventListener("animationend", () => n.remove(), false);


    }
}
class AudioPlayer {
    constructor(audio) {
        if (!audio) throw new SyntaxError("Audio Element not specified");
        this.audio = audio;
        this.params = { shuffle: false, repeat_mode: "album", repeat: false };
        /* album (loop through album), 
        single (loop single track), 
        full_repeat(go continuous, from track to track, album to album) */

        this.nowplaying = { track: {}, album: {} };
        this.status = {
            track_loaded: false,
            track_loading: false,
            playing: false
        };
        this.albumdata = {};
        this.trackdata = {};

        this.activePlaylist = "ALBUMS";
        this.currentView = "ALBUMS";
    }


    sync() {

        fetch("/artists_list").then(x => { return x.json() }).then(x => {
            //this.album_id = x;
            this.buildArtistList(x);

        });
        this.buildTrackList().then(() => { });
    }

    buildArtistList(x) {
        for (let artist in x) {
            $("#artist-list").append(this.processArtist(x[artist]));
        }

        observer.observe();
    }

    processArtist(x) {

        let artist_list_item = $(`<div class="artist-list-item" />`);

        let album_list = $(`<div class="album-list"/>`);
        artist_list_item.append(`<div class="artist-name">${x.artist_info.artist_name}</div>`);
        //x.albums.sort(function (a, b) { let x = 0; if (a..length > b.albums.length) x = -1; else x = 1; return x; })
        for (let i in x.albums) {

            album_list.append(
                `<div class="album-item" data-id="${x.albums[i].album_id}">
                      <img class="album-image lozad" alt="${x.albums[i].album_name}" src="thumb/default" data-src="thumb/${x.albums[i].has_albumart ? x.albums[i].albumart_index : "default"}" />
                      <span class="album-name">${x.albums[i].album_name}</span>
                  </div>`
            );

            artist_list_item.append(album_list);
        }
        return artist_list_item;
    }


    buildTrackList(quick = false) {
        $("#building-track-list").css({ display: "flex" });
        return new Promise((resolve, reject) => {
            fetch("/tracks_list").then(x => { return x.json() }).then(data => {
                this.trackdata = data;

                let temp = Object.keys(data);

                temp.sort(function(a,b) {
                    if(data[a].track_name > data[b].track_name) return 1;
                    else if(data[b].track_name > data[a].track_name) return -1;
                    return 0;
                });

                setTimeout(function () {

                    for (let i = 0; i < temp.length; i++) {
                        setTimeout(function (ii) {

                            let tr = data[temp[ii]];

                            let track = $("<p/>");
                            let thumbnail = $("<img/>");
                            thumbnail.addClass("lozad");
                            thumbnail.attr("src", "thumb/default");
                            thumbnail.attr("data-src","thumb/"+ ((tr.has_albumart) ? tr.track_index : "default"));
                            track.append(thumbnail);
                            track.append("<span class='artist'>" + tr.artist_name + "</span>");
                            track.append("<span class='title'>" + tr.track_name + "</span>");
                            let formattedDuration = (tr.track_duration / 60).toFixed(2);
                            if (formattedDuration < 10) formattedDuration = "0" + formattedDuration;
                            track.append("<span class='duration'>" + formattedDuration + "</span>"); // todo
                            track.addClass("track");
                            track.attr("data-index", tr.track_index);
                            track.attr("data-order",i);
                            //track.attr("style", `--accent:rgba(${x[tr].data.dominantColor[0]},${x[tr].data.dominantColor[1]},${x[tr].data.dominantColor[2]},.8)`);
                            track.attr("data-id", tr.uid);
                            track.append("<div class='progress-bar-mini'><span class='progress-bar-mini-amount'></span></div>");

                            $("#tracks-list").append(track);
                            observer.observe();
                        }, (quick) ? 0 : 10 * i, i);
                    }
                    $("#building-track-list").css({ display: "none" });
                    resolve(1);

                }, 2000);


            }).catch(err => {
                console.log(err);
                reject(err);
            });
        });
    }



    changeView(target) {
        let kek = 100;
        return new Promise((resolve, reject) => {
            if (this.currentView == target) return;
            $(".nav-item.active").removeClass("active");

            var finally_ = () => {
                resolve(target);
                this.currentView = target;
            }

            switch (target) {
                case "ALBUMS": {
                    $.when($("#tracks-list").hide(kek)).done(function () {
                        $.when($("#artist-list").show(kek)).done(function () {
                            finally_();
                        });
                    });
                    break;
                }

                case "TRACKS": {    
                    $.when($("#artist-list").hide(kek)).done(function () {
                        $.when($("#tracks-list").show(kek)).done(function () {
                            finally_();
                        });
                    });
                    break;
                }
            }
        });
    }


    getTrack(track_index) {
        return new Promise((resolve, reject) => {
            for (let track in this.trackdata) {
                let temp = this.trackdata[track];
                if (temp.track_index == track_index) resolve(temp);
            }
            reject(-1);
        })
    }

    getAlbumData(album_id) {
        return new Promise((resolve, reject) => {
            fetch("/albumdata/" + album_id).then(x => { return x.json() }).then(x => {
                resolve(x);
            }).catch(err => { reject(err) });
        });
    }


    refreshUI() {
        if (this.status.playing) {
            $("#tracks-list .loading").removeClass("loading");

            $("#tracks-list .track").removeClass("selected");
            $(`#tracks-list .track[data-index="${this.nowplaying.track.track_index}"]`).addClass("selected");
        } else {
            $("#tracks-list .track").removeClass("selected");
            $("#tracks-list .loading").removeClass("loading");
        }
    }


    handlePlay(track, target) {
        let that = this;
        return new Promise((resolve, reject) => {

            if (this.status.track_loading) {
                reject(-69);
                return;
            }
            this.status.playing = false;
            let track_index = $(track).attr("data-index");
            $(track).addClass("loading");
            this.getTrack(parseInt(track_index)).then(track => {

                $("audio")[0].src = `stream/${track.track_index}`;
                $("audio")[0].play().then(() => {
                    this.getAlbumData(track.album_id).then(x => {

                        this.activePlaylist = target;
                        this.nowplaying.track = track;
                        this.nowplaying.album = x;
                        this.status.playing = true;

                        resolve();
                    }).catch(err => { reject(err); });
                }).catch(err => { reject(err); });
            }).catch(err => { reject(err); });
        })
    }

    stopPlayback(kek = false) {
        $("audio")[0].currentTime = 0;
        this.status.playing = false;
        this.status.track_loading = false;
        this.status.track_loaded = false;
        this.refreshUI();

        if (kek) {
            $("audio")[0].src = "";
            $("audio")[0].currentTime = 0;

        }
    }
    handleStop() {
        this.stopPlayback();
    }

    startedLoading() {
        this.status.track_loaded = false;
        this.status.track_loading = true;
    }

    finishedLoading() {
        this.status.track_loaded = true;
        this.status.track_loading = false;
    }

    trackEnded() {
        this.status.playing = false;
        //this.status.track_loaded = false;
        this.stopPlayback();
    }

    attachListeners() {
        let that = this;
        $(".nav-item").on("click", function () {
            toggleFullscreen();
            let target = $(this).attr("data-name");
            that.changeView(target).then(() => {
                $(this).delay(100).addClass("active");
            });

        });

        $("audio")[0].addEventListener("error", (err) => {
            console.log(err);
        })

        $("audio")[0].addEventListener("loadstart", (x) => {
            this.startedLoading();
        })
        $("audio")[0].addEventListener("canplay", (x) => {
            this.finishedLoading();
        })
        $("audio")[0].addEventListener("ended", (x) => {
            this.handleStop();
        })

        $("#tracks-list").on("click", ".track", function (x) {
            //  that.stopPlayback(true);
            that.handlePlay(this, "TRACKS").then(x => {

                that.refreshUI();

            }).catch(err => {
                console.log(err);
            });
        });
    }

    init() {

        this.sync();
        this.attachListeners();

    }
}


$(function () {
    player = new AudioPlayer($("audio")[0]);
    player.init();

});