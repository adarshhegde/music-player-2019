
$(document).ready(function() {
    var start = performance.now();
    for (let i = 0; i < preloaded.length; i++) {
        let x = preloaded[i];

        let track = $("<p/>");
  
        let thumbnail = $("<img/>");
       
        thumbnail.attr("src", "/thumb/" + x.index);
        track.append(thumbnail);
  
        track.append("<span class='artist'>" + x.data.artist + "</span>");
        track.append("<span class='title'>" + x.data.title + "</span>");
        let formattedDuration = (x.data.duration / 60).toFixed(2);
        if (formattedDuration < 10) formattedDuration = "0" + formattedDuration;
        track.append("<span class='duration'>" + formattedDuration + "</span>");
        track.addClass("track");
        track.attr("data-index", x.index);
        track.attr("style", `--accent:rgba(${x.data.dominantColor[0]},${x.data.dominantColor[1]},${x.data.dominantColor[2]},.8)`);
        track.attr("data-order", i);

        $("#playlist").append(track);
    }

    $("#playlist .track").click(function (x) {
        console.log(x);
        $(".selected").removeClass("selected");
        
        $(this).addClass("selected");
        $("audio")[0].setAttribute("src", "stream/" + $(this).attr("data-index"));
        var tempcol = preloaded[$(this).attr("data-order")].data.dominantColor.join(",");
        if (tempcol == "0,0,0") tempcol = "244, 64, 52";
        $("#main-content")[0].setAttribute("style", `--thumburl:url(thumb/${$(this).attr("data-index")})`);
        $("#now_playing_title").text(preloaded[$(this).attr("data-order")].data.title);
        $("#player_area_background").removeClass("show");
        setTimeout(() => { $("#player_area_background").addClass("show"); }, 200);

        $("#wholepage-bg").removeClass("show");
        setTimeout(() => { $("#wholepage-bg").addClass("show"); }, 200);

        $("audio")[0].play();

    });

    $("#navigation .nav-item").click(function (x) {

        $("#nav-bg").attr("class", $(this).attr("data-order"));


    });
    let prevscroll = 0;

    $('#playlist').on('scroll', function () {
      
        var currentScroll = this.scrollTop + this.scrollHeight,
            maxScroll = this.scrollHeight;
        
        var scrolled = (currentScroll / maxScroll) * 100;

        if (scrolled > prevscroll) {
            $("#navigation").addClass("hide");
        } else {
            $("#navigation").removeClass("hide");
        }

        prevscroll = scrolled;

    });


console.log(Math.round(performance.now() - start));
 
});




