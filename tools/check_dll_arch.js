const fs = require('fs');
const path = require('path');

function getDllArch(file) {
    const buffer = fs.readFileSync(file);
    const peOffset = buffer.readUInt32LE(0x3C);
    const machine = buffer.readUInt16LE(peOffset + 4);
    if (machine === 0x014C) return 'x86 (32-bit)';
    if (machine === 0x8664) return 'x64 (64-bit)';
    return 'Unknown (0x' + machine.toString(16) + ')';
}

['FTRAPI.dll', 'ftrScanAPI.dll'].forEach(dll => {
    const fullPath = path.join(__dirname, 'bridge', dll);
    try {
        console.log(`${dll}: ${getDllArch(fullPath)}`);
    } catch (e) {
        console.log(`${dll}: Error reading - ${e.message}`);
    }
});
