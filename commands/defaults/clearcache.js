const fs = require('fs');
const path = require('path');

async function clearCacheLogic({ mek, isOwner, sock }) {
  const from = mek.key.remoteJid;

  // 1. Security Check
  if (!isOwner) {
    return await sock.sendMessage(from, { 
      text: "*Access Denied:* Only the owner can clear system cache." 
    });
  }

  try {
    // 2. Clear the Store in RAM
    // Using global.store as defined in your index.js
    global.store.chats.clear();
    global.store.contacts = {};
    global.store.messages = {};

    // 3. Delete the JSON file from the storage folder
    // Based on your previous code, store is in ../storage/
    const storePath = path.resolve(__dirname, "../../storage/baileys_store.json");
    
    if (fs.existsSync(storePath)) {
      fs.unlinkSync(storePath);
    }

    await sock.sendMessage(from, { 
      text: "*Cache Cleared Successfully!*\n\nRAM data wiped and `baileys_store.json` deleted. The bot will now rebuild its memory as new messages arrive." 
    }, { quoted: mek });

  } catch (err) {
    console.error("ClearCache Error:", err);
    await sock.sendMessage(from, { text: "*Error:* Failed to clear cache." });
  }
}

module.exports = {
  name: "clearcache",
  description: "Wipes the temporary in-memory store and deletes the store file.",
  usage: ".clearcache",
  run: async (ctx) => {
    // ctx contains { sock, mek, command, args, isOwner, etc. }
    await clearCacheLogic(ctx);
  }
};