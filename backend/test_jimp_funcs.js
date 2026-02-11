const { Jimp, distance, diff } = require('jimp');

async function test() {
    try {
        const img1 = new Jimp(10, 10, 0xFFFFFFFF);
        const img2 = new Jimp(10, 10, 0x000000FF);

        console.log('Testing distance...');
        if (typeof distance === 'function') {
            const d = distance(img1, img2);
            console.log('Distance:', d);
        } else {
            console.log('distance is NOT a function');
        }

        console.log('Testing diff...');
        if (typeof diff === 'function') {
            const di = diff(img1, img2);
            console.log('Diff result:', di);
            console.log('Diff percent:', di.percent);
        } else {
            console.log('diff is NOT a function');
        }

    } catch (e) {
        console.error(e);
    }
}

test();
