process.stdin.resume();
process.stdin.setEncoding('utf8');


process.stdin.on('data', function (chunk) {
let lines = chunk.split('\n');
let n = lines[0];
let x = lines[1].split(" ");
var lane = []; 
var current = 1;
var valid = true;
for (let i = 0; i < x.size; i++) {
	while (lane.length !== 0 && lane[lane.length - 1] == current) {
		current++;
		lane.pop();
	}
	if (x[i] == current) {
		current++;
	} else if (lane.length !== 0 && lane[lane.length - 1] < x[i]) {
		valid = false;
		break;
	} else {
		lane.push(x[i]);
	}
}
if (valid) console.log("yes");
else console.log("no");
	
});