const fs = require('fs');
const sharp = require('sharp');
const streamifier = require("streamifier");
module.exports = function resize(obj, format, width, height) {
    const readStream = streamifier.createReadStream(obj);
    let transform = sharp();

    if (format) {
        transform = transform.toFormat(format);
    }

if (width || height) {
    transform = transform.resize(width, height);
}

    return readStream.pipe(transform);
};