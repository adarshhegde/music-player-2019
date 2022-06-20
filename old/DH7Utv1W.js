		var song = decodeURIComponent(req.url.query.song);
		var album = decodeURIComponent(req.url.query.album);
		var artist = decodeURIComponent(req.url.query.artist);
		if (config.debug) console.log(song, album, artist);
		console.log(`Downloading "${song}" by "${artist}"...`);

		var folder = `./Music/${artist}`;
		var meta = [`--title "${song}"`];

		if (album) meta.push(`--album "${album}"`);
		if (artist) meta.push(`--artist "${artist}"`);

		if (config.debug) console.log("download request:", req.url);

		exec(`"${bin}youtube-dl" --ffmpeg-location "bin" -o "${folder}/${song}.m4a" -f bestaudio[ext=m4a] https://www.youtube.com/watch?v=${id}`, function (err) {
			if (err) return console.warn(err);
			var dir = fs.readdirSync(folder); //should always exist
			function addMeta() {
				if (config.debug) console.log(meta);
				exec(`"${bin}AtomicParsley" "${folder}/${song}.m4a" ${meta.join(" ")}`, function(err) {
					if (err) return console.warn(err);

					fs.unlink(`${folder}/${song}.m4a`, function(err) {
						if (err) return console.warn(err);

						fs.readdirSync(folder).forEach(function(x) {
							if (x.split("-temp-")[0] == song) fs.rename(`${folder}/${x}`, `${folder}/${song}.m4a`, function() { console.log(`Download for "${song}" by "${artist}" finished!`); });
						});
					});
				});
			}

			if (album) {
				var artwork = dir.filter(x => new RegExp(`${album.replace(/\(|\)|\[|\]|\^|\&|\$/g, c => `\\${c}`)}.(png|jpg|jpeg)`).test(x))[0];
				if (artwork) meta.push(`--artwork "${folder}/${artwork}"`);
				else if (req.url.query.topic == "true") {
					if (config.debug) console.log("is topic and no artwork exists");
					exec(`"${bin}youtube-dl" -f bestvideo --get-url https://www.youtube.com/watch?v=${id}`, function(err, stdo) {
						if (err) return console.warn(err);
						var vidurl = stdo.toString().replace("\n", "");
						exec(`"${bin}ffprobe" -v error -select_streams v:0 -show_entries stream=width -of default=nw=1 "${vidurl}"`, function(err, stdo) {
							if (err) return console.warn(err);
							var reso = +stdo.split("=")[1];
							var size = reso/2.6193724420191|0;
							if (config.debug) console.log(reso, size);
							exec(`"${bin}ffmpeg" -i "${vidurl}" -ss 00:00:02 -vframes 1 -vf crop=${size}:${size}:${reso/17.454545454545453|0}:${reso/17.61467889908257|0} "${folder}/${album}.png"`, function(err) {
								if (err) return console.warn(err);
								meta.push(`--artwork "${folder}/${album}.png"`);
								addMeta();
							});
						});
					});
					return;
				}
				addMeta();
			}
		});