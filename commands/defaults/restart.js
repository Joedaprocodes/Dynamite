const { exec } = require("child_process");
const fs = require("fs");
const path = require("path");

async function restartLogic({ sock, mek, isOwner }) {
  const from = mek.key.remoteJid;

  // 1. Security Check
  if (!isOwner) {
    return await sock.sendMessage(
      from,
      { text: "> *Access Denied:* Owner only" },
      { quoted: mek },
    );
  }

  try {
    // 2. Resolve Config Path (Up two levels to root, then into config folder)
    const configPath = path.resolve(__dirname, "../../config/config.json");
    const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
    const botName = config.botName || "Dynamite";

    await sock.sendMessage(
      from,
      { text: `> *Restarting ${botName}...* \n> Please wait a moment.` },
      { quoted: mek },
    );

    // 3. Execute Restart with Delay
    // Delay ensures the "Restarting" message is actually sent to WhatsApp before the process kills itself
    setTimeout(() => {
      // npx pm2 restart [botName] or [all]
      exec(`pm2 restart Dynamite`, (error, stdout, stderr) => {
        if (error) {
          console.error(`[ ERRO ] PM2 Restart Error: ${error}`);
          return;
        }
      });
    }, 2000);
  } catch (err) {
    console.error("Restart Command Error:", err);
    await sock.sendMessage(from, {
      text: "> *Error:* Failed to read config or execute restart.",
    });
  }
}

module.exports = {
  name: "restart",
  description: "Restarts the bot using PM2",
  usage: ".restart",
  author: "Joedaprocodes",
  run: async (ctx) => {
    // ctx contains { sock, mek, isOwner, etc. }
    await restartLogic(ctx);
  },
};
