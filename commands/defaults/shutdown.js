const { exec } = require("child_process");

async function shutdownLogic({ sock, mek, isOwner, config }) {
  const from = mek.key.remoteJid;

  // 1. Security Check
  if (!isOwner) return;

  try {
    const botName = config.botName || "Dynamite";

    // 3. Notify and Save Store
    await sock.sendMessage(
      from,
      { text: `> *Shutting down _${botName}_...* ` },
      { quoted: mek },
    );

    // Optional: Force a store save before exiting to prevent data loss
if (global.store) {
    // Define absolute paths
    const storageDir = path.join(__dirname, '../../storage');
    const configDir = path.join(__dirname, '../../config');

    // Ensure folders exist before writing
    if (!fs.existsSync(storageDir)) fs.mkdirSync(storageDir, { recursive: true });
    if (!fs.existsSync(configDir)) fs.mkdirSync(configDir, { recursive: true });

    const storePath = path.join(storageDir, 'baileys_store.json');
    const configPath = path.join(configDir, 'gcconfig.json');

    global.store.writeToFile(storePath, configPath);
}

    
//    if (global.store) {
   //   global.store.writeToFile(
     //   "../storage/baileys_store.json",
//        "../config/gcconfig.json",
  //    );
//    }

    // 4. Execute PM2 Stop with Delay
    setTimeout(() => {
      exec(`pm2 stop Dynamite`, (error, stdout, stderr) => {
        if (error) {
          console.error(`PM2 Stop Error: ${error}`);
          return;
        }
      });
    }, 2000);
  } catch (err) {
    console.error("Shutdown Error:", err);
    await sock.sendMessage(from, { text: "> Error: Failed to stop process." });
  }
}

module.exports = {
  name: "shutdown",
  description: "Stops the bot process via PM2",
  usage: ".shutdown",
  author: "Joedaprocodes",
  run: async (ctx) => {
    await shutdownLogic(ctx);
  },
};
