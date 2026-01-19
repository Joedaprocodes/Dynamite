const fs = require("fs");
const path = require("path");

async function getConfigLogic({ sock, mek, isOwner, config }) {
  const from = mek.key.remoteJid;

  // 1. Security Check
  if (!isOwner) {
    return await sock.sendMessage(from, { text: "Access Denied: Owner only." }, { quoted: mek });
  }

  try {
    let response = `*CURRENT CONFIGURATION*\n\n`;

    // 3. Format Response
    Object.entries(config).forEach(([key, value]) => {
      // If the value is an array (like owners), join it for better readability
      const displayValue = Array.isArray(value) ? value.join(", ") : value;
      response += `*${key}*: ${displayValue}\n`;
    });
    
    response += "\n\nTo edit these, use the `.setconfig` command.";

    await sock.sendMessage(from, { text: response }, { quoted: mek });

  } catch (err) {
    console.error("GetConfig Error:", err);
    await sock.sendMessage(from, { text: "Error: Could not read config file." }, { quoted: mek });
  }
}

module.exports = {
  name: "getconfig",
  description: "Displays all bot settings from config.json exactly as they are",
  usage: ".getconfig",
  run: async (ctx) => {
    // ctx contains { sock, mek, isOwner, etc. }
    await getConfigLogic(ctx);
  }
};