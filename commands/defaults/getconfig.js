const fs = require("fs");
const path = require("path");

async function getConfigLogic({ sock, mek, isOwner, config }) {
  const from = mek.key.remoteJid;

  // 1. Security Check
  if (!isOwner) {
    return await sock.sendMessage(
      from,
      { text: "> Access Denied: Owner only." },
      { quoted: mek },
    );
  }

  try {
    let response = `*> CURRENT CONFIGURATION*\n\n`;

    response += `\n> Owner(s):: ${config?.owner.join(", ")}`;
    response += `\n> Owner name:: ${config?.ownerName}`;
    response += `\n> Bot name:: ${config?.botName}`;
    response += `\n> Cmd Prefix:: \`${config?.cmdPrefix}\``;
    response += `\n> Typing:: ${config?.typing ? "`on`" : "`off`"}`;
    response += `\n> Autoread:: ${config?.autoread ? "`on`" : "`off`"}`;
    response += `\n> Repo(to get updates):: ${config?.repo}`;

    response += "\n\n> To edit these, use the `.setconfig` command.";

    await sock.sendMessage(from, { text: response }, { quoted: mek });
  } catch (err) {
    console.error("GetConfig Error:", err);
    await sock.sendMessage(
      from,
      { text: "> Error: Could not read config file." },
      { quoted: mek },
    );
  }
}

module.exports = {
  name: "getconfig",
  description: "Displays all bot settings from config.json exactly as they are",
  usage: ".getconfig",
  author: "Joedaprocodes",
  run: async (ctx) => {
    // ctx contains { sock, mek, isOwner, etc. }
    await getConfigLogic(ctx);
  },
};
