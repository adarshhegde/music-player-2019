process.stdin.resume();
process.stdin.setEncoding('utf8');
var request = require('request');

// your code goes here


process.stdin.on('data', function (chunk) {

request.post(
    'https://musiq-adhegde001.c9users.io/kek',
    { json: (chunk.split("\n"))},
    function (error, response, body) {
        if (!error && response.statusCode == 200) {
            console.log(body)
        }
    }
);
});

