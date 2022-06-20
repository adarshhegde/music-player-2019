let fs = require("fs");
let path = require("path");
let escapeRegExp = string => {
    return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

let replaceAll = (str, term, replacement) => {
    return str.replace(new RegExp(escapeRegExp(term), 'g'), replacement);
}

class Template {

    constructor(filepath, params = { root: "public" }, variabledef = {}) {
        this.request;
        this.response;
        if (!filepath) throw Error(filepath);
        this.filepath = path.join(params.root, filepath);
        this.variabledef = variabledef;
    }


    gen(request, response, extra) {

        var that = this;

        new Promise((res, rej) => {

            fs.readFile(that.filepath, "utf8", (err, data) => {

                if (err) rej(err);

                res(data);
            });

        }).then((data) => {

            Object.keys(that.variabledef).forEach(variable => {

                data = replaceAll(data, variable, that.variabledef[variable](extra));

            });
            response.send(data);

        }).catch((x) => {
            response.send(500, "Internal Server Error </br> " + x);
        });
    }
}

module.exports = Template;