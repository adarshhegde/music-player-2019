let features = {
    blur : CSS.supports("backdrop-filter: blur(0px)")
};

for(let feature in features) {
    if(features[feature] == true) $("#main-content").addClass("feature-" + feature);
}


//touch click helper jquery event handler shit  
(function ($) {
    $.fn.tdown = function (onmousedown) {

        this.bind("touchstart", function (e) { 
            onmousedown.call(this, e); 
            e.stopPropagation(); 
            e.preventDefault(); 
        });

        this.bind("mousedown", function (e) { 
           onmousedown.call(this, e);  
        });   

        return this;
    };

    $.fn.tup = function (onmouseup) {

        this.bind("touchend", function (e) { 
            onmouseup.call(this, e); 
            e.stopPropagation(); 
            e.preventDefault(); 
        });

        this.bind("mouseup", function (e) { 
           onmouseup.call(this, e); 
        });   

        return this;
    };
})(jQuery);



window.hasMediaSession = 'mediaSession' in navigator;
 

const observer = lozad(); // lazy loading 


class notif {
	constructor(i,j){
		this.notif = $(`<div class="notification"></div>`);
        this.notif.text(i);
        
        let k = $(j).offset();
        k.top -= $(j).height() * 1.3;
        k.left -= ($(j).width() / 2) * 1.2;
        this.notif.css({...k});
		$("body").append(this.notif);
		setTimeout((x) => { x.remove(); },800,this.notif);
	}
}

class Player { 
    constructor(playerElem) {
        this.player = playerElem;
        this.state = { playing: false, loading: false, loaded: false };
        this.settings = { repeat: false, repeat_mode: 0, shuffle: false };
        this.tracks = {};
        this.context  = new window.AudioContext();
        this.source = this.context.createMediaElementSource(this.player);
        //this.source.connect(this.context.destination);
        this.maxtracks = 0;
        this.selectedMenu = "mymusic";
        this.recentTracks = {};
        this.maxrecenttracks = 0;
        this.albums = {};
        this.views = {};
        this.firstPlay = true;
        this.currentView = "";
        this.now_playing_track = {};
        this.now_playing_playlist = ""; // songs / album / artist / recent

        this.addView({ id: "track-view", name: "Songs" }, function (data) {
            let view_settings = $(
            `<div id="track-view-settings">
                <span class="setting">
                    <i class="material-icons">sort_by_alpha</i>
                </span>
            </div>'`);
            let tracks_ele = $(`<div id="tracks-list"></div>"`);
            $(this.view).append(view_settings);
            $(this.view).append(tracks_ele);
            let tracks = Object.keys(data);
            let promises = tracks.map((x) => {
                return new Promise((resolve, reject) => {
                    let track = data[x];
                    $(tracks_ele).append(`<p class="track" data-order="${track.track_order}" data-index="${track.track_index}">
                    <span class="albumart"><img class="lozad" src="thumb/default/108" alt="${track.track_index}" data-src="${(track.has_albumart) ? "thumb/" + track.track_index + "/108" : "thumb/default/108"}"/></span>
                    <span class="title">${track.track_name}</span>
                    <span class="artist">${track.artist_name}</span>
                    </p>`);

                })
            });
      
            return Promise.all(promises).then((resolved) => {
                observer.observe();
                return "yey";
            });
        });

        this.showView("track-view");
        
        this.addView({"id": "album-view", name:"Albums"}, function(){
            this.view.append("under development, try again after a few weeks*.");
        });

        this.addView({id:"recents-view",name:"Recently Added"},function(data){
            let that = this;
            let tracks_ele = $(`<div id="recents-list"></div>`);
            let tracks = Object.keys(data);
       
            let promises = tracks.map((x) => {
                return new Promise((resolve, reject) => {
                    let track = data[x];
                    $(tracks_ele).append(`<p class="track" data-order="${track.track_order}" data-index="${track.track_index}">
                    <span class="albumart"><img class="lozad" src="thumb/default/108" alt="${track.track_index}" data-src="${(track.has_albumart) ? "thumb/" + track.track_index + "/108" : "thumb/default/108"}"/></span>
                    <span class="title">${track.track_name}</span>
                    <span class="artist">${track.artist_name}</span>
                    </p>`);

                })
            });

            $(this.view).append(tracks_ele);
            return Promise.all(promises).then(resolved => {
                observer.observe();
                return "kek";
            });
            
        
        });
        this.init();
    }

    addView(params, cb) {
        if(!params || !typeof params == "object") throw Error("Invalid argumeents.");
        this.views[params.id] = {
            view: $(`<div id="${params.id}" class="view"></div>`),
            navitem: $(`<span class="nav-item" data-view="${params.id}">${params.name}</span>`),
            callback: (cb) ? cb : () => {}
        };
        $("#views").append(this.views[params.id].view);
        $("#nav").append(this.views[params.id].navitem);

    }
    updateView(id, stuff, cb) {
        if(!cb) this.views[id].callback.apply(this.views[id], stuff);
           else  cb.apply(this.views[id], stuff);
    }
    showView(id) {
        return new Promise( (resolve, reject) => {
            if (id == this.currentView) {
                reject();
                return; 
            };
            $(".view").removeClass("show");
            $(".nav-item").attr("selected", false);
            setTimeout( () => {
                this.views[id].view.addClass("show");
                this.views[id].navitem.attr("selected", true);
                this.currentView = id;
                resolve(id);
            }, 300);

        });
    }

    Play(index,frompause=false) {
        console.log("Klldkwoke");
        if(!frompause) this.player.src = `stream/${index}`;
        this.state.playing = true;
        return this.player.play();
    }
    Pause() {
        this.state.playing = false;
        this.player.pause();
    }
    togglePlay(){
        if(this.state.playing){ 
            this.Pause();
               this.updateBottomControls();
        }
        else {
            if(this.state.loading) return;
            this.Play(-1,true);
               this.updateBottomControls();
        }
     
      //  this.updateViewChanges();
    }
    Stop() {
        this.player.pause();
        this.player.currentTime = 0;
        this.state.loading = false;
        this.state.loaded = true;
        this.state.playing = false;
    }

    
    startedLoading() {
        this.state.loaded = false;
        this.state.loading = true;
    }

    finishedLoading() {

        if(this.state.loading && !this.state.playing) {
            this.togglePlay();
        }

        this.state.loaded = true;
        this.state.loading = false;

        $(`#track-view .track[data-index="${this.now_playing_track.track_index}"]`).removeClass("loading");
        $(`#recents-view .track[data-index="${this.now_playing_track.track_index}"]`).removeClass("loading");
    
    
    
        this.updateViewChanges();
        this.updateBottomControls();
    }

    getTrack(track_index) {
        return new Promise((resolve, reject) => {
            for (let track in this.tracks) {
                let temp = this.tracks[track];
                if (temp.track_index == track_index) resolve(temp);
            }
            reject(-1);
        })
    }
  
    updateViewChanges(){

        let that = this;

        this.updateView("track-view",null, function(){
            $(this.view).find("*[selected]").attr("selected",false);
            if(that.state.playing) $(this.view).find(`*[data-index=${that.now_playing_track.track_index}]`).attr("selected",true);
        });

        this.updateView("recents-view",null, function(){
            $(this.view).find("*[selected]").attr("selected",false);
            if(that.state.playing) $(this.view).find(`*[data-index=${that.now_playing_track.track_index}]`).attr("selected",true);
        });
    }

    updateBottomControls() {
        $("#track-artist").text(this.now_playing_track.artist_name);
        $("#track-title").text(this.now_playing_track.track_name);
        if (this.state.playing) {
            $("#play-pause i").text("pause");
        } else {
            $("#play-pause i").text("play_arrow");
        }

        if (this.settings.repeat) {
            $("#toggle-repeat").addClass("enabled");

            if (this.settings.repeat_mode == 0) {
                $("#toggle-repeat i").text("repeat_one");
            }

            if (this.settings.repeat_mode == 1) {
                $("#toggle-repeat i").text("repeat");
            }
        } else {
            $("#toggle-repeat").removeClass("enabled");
            $("#toggle-repeat i").text("repeat");
        }

        if(this.settings.shuffle){
            $("#toggle-shuffle").addClass("enabled");
        } else {
            $("#toggle-shuffle").removeClass("enabled");
        }
    }
    changeTracks (index=-1, playlist) {
        let that = this;
        index = parseInt(index);
        return new Promise( (resolve, reject) => {
        
            if(index < 0 || index > this.maxtracks || this.state.loading) {
                    reject();
                    return;
                } else {
                this.Stop();
                this.updateViewChanges();
                this.updateBottomControls();
                $(`#track-view .track[data-index="${index}"]`).addClass("loading");
                $(`#recents-view .track[data-index="${index}"]`).addClass("loading");
                
                this.getTrack(index).then( x => {
                    if(playlist == "recents") this.now_playing_track = this.recentTracks[x.uid];
                    else this.now_playing_track = x;
                    this.now_playing_playlist = playlist;
                    return this.Play(index);
                }).then( x => {
                    this.state.playing = true;
                    this.updateViewChanges();
                    this.updateBottomControls();
                    $(`#track-view .track[data-index="${index}"]`).removeClass("loading");
                    $(`#recents-view .track[data-index="${index}"]`).removeClass("loading");
              


                    if(window.hasMediaSession) {
                        let albumArtUrl = (this.now_playing_track.has_albumart) ? "thumb/" + this.now_playing_track.track_index + "/128": "thumb/default/128";
                        navigator.mediaSession.metadata = new MediaMetadata({
                            title: this.now_playing_track.track_name,
                            artist: this.now_playing_track.artist_name,
                            album: this.now_playing_track.album_name,
                            artwork: [
                             
                              { src: albumArtUrl, sizes: '128x128', type: 'image/jpeg' }
                            ]
                          });
                          navigator.mediaSession.setActionHandler('play', function() { $("#play-pause").click() });
                          navigator.mediaSession.setActionHandler('pause', function() { $("#play-pause").click() });
                          navigator.mediaSession.setActionHandler('seekbackward', function() {      that.player.currentTime -= 2; });
                          navigator.mediaSession.setActionHandler('seekforward', function() {     that.player.currentTime += 2;});
                          navigator.mediaSession.setActionHandler('previoustrack', function() { that.handleGoPrev(); });
                          navigator.mediaSession.setActionHandler('nexttrack', function() { that.handleGoNext(); });
                    }


                    resolve();
                });
            }

        });

    }
    handleStop(){

        if(this.settings.shuffle) {
            
            if(this.now_playing_playlist == "songs"){
                    let rand =  Math.floor((Math.random() * (this.maxtracks - 0) + 0));
                    this.changeTracks(rand, this.now_playing_playlist);
          
            } else if(this.now_playing_playlist == "recents") {
                    let rand = Math.floor(Math.random() * (this.maxrecenttracks - 0) + 0);
                    this.changeTracks( this.recentTracks[Object.keys(this.recentTracks)[rand]].track_index, this.now_playing_playlist);
            }


        }
        else if(this.settings.repeat){
            if(this.settings.repeat_mode == 0){ // repeat single
                this.changeTracks(player.now_playing_track.track_index, player.now_playing_playlist);
            } else if(this.settings.repeat_mode == 1){ // repeat all tracks

                if(this.now_playing_playlist == "songs"){
                    if(this.now_playing_track.track_index + 1 >= this.maxtracks) {
                        this.changeTracks(0, this.now_playing_playlist);
                    } else {
                        this.changeTracks(player.now_playing_track.track_index + 1, this.now_playing_playlist);
                    }
                } else if(this.now_playing_playlist == "recents") {
                    console.log(this.now_playing_track.track_order + 1 , this.maxrecenttracks);
                    if(this.now_playing_track.track_order + 1 >= this.maxrecenttracks) {
                        this.changeTracks( this.recentTracks[Object.keys(this.recentTracks)[0]].track_index, this.now_playing_playlist);
                    } else {
                        this.changeTracks(this.recentTracks[ Object.keys(this.recentTracks)[this.now_playing_track.track_order + 1] ].track_index, this.now_playing_playlist);
                    }
                }


            }
        } else {
            this.Stop();
        }
        this.updateBottomControls();
        this.updateViewChanges();
    }
    handleGoNext() {
        if(this.state.loading) return;
        if(this.now_playing_playlist == "songs") {    
            if(this.now_playing_track.track_index + 1 >= this.maxtracks) {
                this.changeTracks(0, this.now_playing_playlist).catch(err => { console.log(err) });
            } else {
                this.changeTracks(this.now_playing_track.track_index + 1, this.now_playing_playlist).catch(err => { console.log(err) });
            }
        } else if(this.now_playing_playlist == "recents") {
            if(this.now_playing_track.track_order + 1 >= this.maxrecenttracks) {
                this.changeTracks( this.recentTracks[Object.keys(this.recentTracks)[0]].track_index, this.now_playing_playlist);
            } else {
                this.changeTracks(this.recentTracks[ Object.keys(this.recentTracks)[this.now_playing_track.track_order + 1] ].track_index, this.now_playing_playlist);
            }
            
        }

        this.updateBottomControls();
        this.updateViewChanges();
    }
    handleGoPrev() {
        if(this.state.loading) return;
        if(this.now_playing_playlist == "songs") {
            if(this.now_playing_track.track_index - 1 < 0) {
                this.changeTracks(this.maxtracks - 1, this.now_playing_playlist).catch(err => {});
            } else {
                this.changeTracks(this.now_playing_track.track_index - 1, this.now_playing_playlist).catch(err => {});
            }
        } else if(this.now_playing_playlist == "recents") {
            if(this.now_playing_track.track_order - 1 < 0) {
                this.changeTracks( this.recentTracks[Object.keys(this.recentTracks)[Object.keys(this.recentTracks).length - 1]].track_index, this.now_playing_playlist);
            } else {
                this.changeTracks(this.recentTracks[ Object.keys(this.recentTracks)[this.now_playing_track.track_order - 1] ].track_index, this.now_playing_playlist);
            }
        }

        this.updateBottomControls();
        this.updateViewChanges(); 
    }

   
    retrieveData() {
        fetch("/tracks_list").then( x => x.json()).then( data => {
            this.tracks = data;
            this.maxtracks = Object.keys(data).length;
            this.updateView("track-view", [data]);
        });


        fetch("/recents_list").then(x => x.json()).then( data => {
            this.recentTracks = data;
            this.maxrecenttracks = Object.keys(data).length;
            this.updateView("recents-view", [data]); 
        });
    }
    hookUIHandlers() {
        let that = this;

        $("#nav").on("click",".nav-item", function () {

            that.showView($(this).attr("data-view")).then(x => { }).catch(x => { });
            that.updateViewChanges();
        });


        $(this.views["track-view"].view).on("click",".track",function(){   
            that.context.resume();
            let changeto = $(this).attr("data-index");
            that.changeTracks(changeto,"songs").then(x => {
                if(that.firstPlay){
                    that.firstPlay = false;
                    $("#main-content").removeClass("hide-bottom");
                }
            }).catch(err=>{     });
        });

        $(this.views["recents-view"].view).on("click",".track",function(){
            that.context.resume();
            let changeto = $(this).attr("data-index");
            that.changeTracks(changeto,"recents").then(x => {
                if(that.firstPlay){
                    that.firstPlay = false;
                    $("#main-content").removeClass("hide-bottom");
                }
            }).catch(err=>{   });
        });

        $("#play-pause").click(function(){
            if(that.firstPlay){
            that.firstPlay = false;
            that.changeTracks(0,"songs").catch(err=>{
            });
        } else  that.togglePlay();
        });
        
        $("#menu-button").click(function(){
            $("#side").toggleClass("open");
            $("#side-menu").toggleClass("open");
            $("#side-overlay").toggleClass("show");
            $("#top,#bottom,#middle,#panels").toggleClass("retract");
        });

        $("#menu").on("click", ".menu-item", function(){
            let target = $(this).attr("data-target");
            if(target == that.selectedMenu) return;
            else {
                if(target == "mymusic") {
                    that.selectedMenu = "mymusic";
                    $("#menu .active").removeClass("active");
                    $(this).addClass("active");
                    $("#panels").fadeOut();
                    $("#panels .panel").removeClass("show");
                    $("#side-overlay").click();
                } else {
                    let targetmenu = $(`#panels .panel[data-id="${target}"`);
                    $("#panels").fadeIn();
                    $("#panels .panel").removeClass("show");
                    targetmenu.addClass("show");
                    $("#menu .active").removeClass("active");
                    $(this).addClass("active");
                    $("#side-overlay").click();
                    that.selectedMenu = target;
                }
            }
        });

        $("#side-overlay").click(function(){
            $(this).removeClass("show");
            $("#side").removeClass("open");
            $("#side-menu").removeClass("open");
            $("#top,#bottom,#middle,#panels").removeClass("retract");
        })

        let timeintv = 0;
        let holddown;
        let seekthingy;

        $("#go-right").tdown(function(){
            timeintv = performance.now();
            holddown = setTimeout(function(){
                $("#go-right").addClass("seeking");
                seekthingy = setInterval(() => {
                    that.player.currentTime += 2;
                },350);
            },300);
        });

        
        $("#go-right").tup(function(){
            let spanned = performance.now() - timeintv;
            clearTimeout(holddown);
            clearInterval(seekthingy);
            $("#go-right").removeClass("seeking");
            if(spanned > 300) {
                console.log("seek should happened");
            }else {
                console.log("go next track happened should");
                that.handleGoNext();
            }
        });

        $("#go-left").tdown(function(){
            timeintv = performance.now();
            holddown = setTimeout(function(){
                $("#go-left").addClass("seeking");
                seekthingy = setInterval(() => {
                    if(!(that.player.currentTime < 1)) 
                        that.player.currentTime -= 2;
                },350);
            },300);
        });

        
        $("#go-left").tup(function(){
            let spanned = performance.now() - timeintv;
            clearTimeout(holddown);
            clearInterval(seekthingy);
            $("#go-left").removeClass("seeking");
            if(spanned > 300) {
                console.log("seek should happened");
            }else {
                console.log("go back track happened should");
                that.handleGoPrev();
            }
        });


        $("#extra-controls-toggle").click(function(){
            if($("#extra-controls").attr("open")){
                $("#extra-controls").attr('open',false);
                $(this).removeClass("rotate");
            } else {
                $("#extra-controls").attr('open',true);
                $(this).addClass("rotate");
            }
        });

        $("#toggle-repeat").click(function(){
            let test = "";
            if(!that.settings.repeat){
                that.settings.repeat = true;
                that.settings.repeat_mode = 0;
                test = "repeat single";
            } else if(that.settings.repeat_mode == 0) {
                    that.settings.repeat_mode = 1;
                    test = "repeat all";
                } else if(that.settings.repeat_mode == 1){
                    that.settings.repeat = false;
                    test = "repeat off";
                }
                that.updateBottomControls();
                new notif(test,this);
        });

        $("#toggle-shuffle").click(function(){ 
            that.settings.shuffle = !that.settings.shuffle;
            that.updateBottomControls();
            new notif((that.settings.shuffle ? "shuffle on" : "shuffle off"), this);
        });
        
        this.player.addEventListener("timeupdate", function () {
            $("#controls").css({ "--data-progress": ($(this)[0].currentTime / $(this)[0].duration) * 100 + "%" });
        });

        this.player.addEventListener("error", (err) => {
            console.log(err);
        })

        this.player.addEventListener("loadstart", (x) => {
            this.startedLoading();
        })
        this.player.addEventListener("canplay", (x) => {
            this.finishedLoading();
        })
        this.player.addEventListener("ended", (x) => {
            this.handleStop();
        })

    }

    hookMediaSession() {
       // that=this;

    }
    init() {
        this.retrieveData();
        this.hookUIHandlers();
        this.hookMediaSession();
        this.hookEQ();
        observer.observe();
    }
    hookEQ() {

        var qFactor = 4;	//1 <> 100
        var frequencies = {};
    
     var defaultEQ = [0,0,0,0,0];
        var k = -1;
        window.lol = 1;
    
        var freq = {
            1:"64Hz",
            2:"230Hz",
            3:"910Hz",
            4:"3.6KHz",
            5:"14KHz"
        }
        //60Hz
        frequencies['1'] = this.context.createBiquadFilter();
        frequencies['1'].frequency.value = 64;
        frequencies['1'].type = 'lowshelf';
        frequencies['1'].gain.value = defaultEQ[++k];
        frequencies['1'].Q.value = qFactor;
    
    
        //230Hz
        frequencies['2'] = this.context.createBiquadFilter();
        frequencies['2'].frequency.value = 230;
        frequencies['2'].type = 'peaking';
        frequencies['2'].gain.value = defaultEQ[++k];
        frequencies['2'].Q.value = qFactor;
    
        //910Hz
        frequencies['3'] = this.context.createBiquadFilter();
        frequencies['3'].frequency.value = 910;
        frequencies['3'].type = 'peaking';
        frequencies['3'].gain.value = defaultEQ[++k];
        frequencies['3'].Q.value = qFactor;
    
    
        //3.6KHz
        frequencies['4'] = this.context.createBiquadFilter();
        frequencies['4'].frequency.value = 3600;
        frequencies['4'].type = 'highshelf';
        frequencies['4'].gain.value = defaultEQ[++k];
        frequencies['4'].Q.value = qFactor;
    
        //14KHz
        frequencies['5'] = this.context.createBiquadFilter();
        frequencies['5'].frequency.value = 14000;
        frequencies['5'].type = 'highshelf';
        frequencies['5'].gain.value = defaultEQ[++k];
        frequencies['5'].Q.value = qFactor;

        
        this.source.connect(frequencies['1']);
        frequencies['1'].connect(frequencies['2']);
        frequencies['2'].connect(frequencies['3']);
        frequencies['3'].connect(frequencies['4']);
        frequencies['4'].connect(frequencies['5']);
        frequencies['5'].connect(this.context.destination);
        window.frequencies = frequencies;



        $("#equalizer_container input[type='range']").on("change",function() {
           let target = $(this).attr("freq");
           let changeto = parseInt($(this)[0].value);
           if(!frequencies.hasOwnProperty(target)) return;
           console.log(target,changeto);
           frequencies[target].gain.value = changeto;
        });
    }

}

$(document).ready(function () {

    window.player = new Player($("audio")[0]);
    $("#loading").hide();
    setTimeout(() => { observer.observe(); },1000);
});
