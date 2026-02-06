const { syncDB } = require('./src/models');

console.log("🔄 Starting Force Sync...");
syncDB().then(() => {
    console.log("✅ Force Sync Complete.");
    process.exit(0);
}).catch(err => {
    console.error("❌ Force Sync Failed:", err);
    process.exit(1);
});
