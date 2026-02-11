const JimpPackage = require('jimp');
const { Jimp } = JimpPackage;

try {
    console.log('Jimp class:', Jimp);
    const image = new Jimp(100, 100);
    console.log('Image created');

    // Check static methods or top level functions
    if (Jimp.distance) console.log('Jimp.distance exists');
    else console.log('Jimp.distance DOES NOT exist');

    if (JimpPackage.distance) console.log('JimpPackage.distance exists');

} catch (e) {
    console.error(e);
}
