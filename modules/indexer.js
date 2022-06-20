const fs = require("fs");
const path = require("path");

class scan{
        constructor(root, max_depth = -1) {
            this.root = root;
            this.res = [];
         //   this.rec(root);
            return this;
        }

        rec(dir, c_depth = 0) {
        
            var ls = fs.readdirSync(dir);
            var depth = c_depth;
            var dirs = [];
            for (let i = 0; i < ls.length; i++) {
                var fname = ls[i];
                var abs_path = path.join(dir, fname);
                var info = fs.lstatSync(abs_path);
                var isdir = info.isDirectory();
                if (isdir)  dirs.push(abs_path);
                for (let j = 0; j < dirs.length; j++) {
                    this.rec(dirs[j], depth + 1);
                }
                if (/\.(mp3)$/.test(fname))  this.res.push(abs_path);
                dirs = [];
            }
    
        }

        rescan() {
            this.res = [];
            this.rec(this.root);
            return this;
        }

        scan() {
            this.res = [];
            this.rec(this.root);
            return this;
        }
}


module.exports = scan;