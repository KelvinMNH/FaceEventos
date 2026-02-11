const Jimp = require('jimp');
console.log('Export type:', typeof Jimp);
console.log('Export keys:', Object.keys(Jimp));
if (Jimp.default) {
    console.log('Default export keys:', Object.keys(Jimp.default));
}
