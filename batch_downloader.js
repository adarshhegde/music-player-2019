const fs = require("fs"),
path = require("path");
const { spawn } = require('child_process');

const url = "https://www.youtube.com/playlist?list=PLwBKmheWeln3oU4MH0M1KWI7Jp-vHSRRU";

    // const ls = spawn('youtube-dl.exe', ['-x',
    //     '-o', '/music/%(title)s.%(ext)s',
    //     '--audio-format', 'mp3',
    //     '--audio-quality', '320K',
    //     '--no-playlist',
    //     `${uri}`]
    // );

    const ls = spawn('youtube-dl.exe',
    ["--get-id",
    "--skip-download",
    `${uri}`]
    );

    ls.stdin.setEncoding('utf-8');


    ls.stdout.on('data', (data) => {
        console.log(data);
    });

    ls.stderr.on('data', (data) => {
        console.err(data);
    });

    ls.on('close', (code) => {
        console.log(`child process exited with code ${code}`);
});