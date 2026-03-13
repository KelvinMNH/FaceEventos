const fs = require('fs');
const { Evento } = require('./backend/src/models');
Evento.findAll().then(evs => {
    let out = '';
    evs.forEach(e => {
        out += `ID:${e.id} LEN:${e.uuid ? e.uuid.length : 'NULL'} UUID:[${e.uuid || 'NULL'}]\n`;
    });
    fs.writeFileSync('C:\\Users\\kelvin.higino\\Documents\\UniEventos\\all_uuids_log.txt', out);
    console.log("File written to all_uuids_log.txt");
    process.exit();
}).catch(e => {
    console.error(e);
    process.exit(1);
});
