const Jimp = require('jimp');

try {
    console.log('Jimp version:', require('jimp/package.json').version);
    console.log('Creating image...');
    const image = new Jimp(100, 100, (err, image) => {
        if (err) throw err;
        console.log('Image created successfully!');
    });
} catch (e) {
    console.error('Error:', e);
}
