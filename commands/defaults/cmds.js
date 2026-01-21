const { config } = require("process");
const { listCommands } = require("../../functions.js");
const path = require("path");

async function cmdsLogic(ctx) {
  const { sock, mek, isOwner, from, isUserAdmin, config } = ctx;

  if (!isOwner || isUserAdmin) return;

  try {
    // __dirname is ".../commands/defaults"
    // In cmds.js
    const defaultsPath = __dirname; // Points to Dynamite/commands/defaults
    const installedPath = path.join(__dirname, "../installed"); // Points to Dynamite/commands/installed

    const defaultCmds = await listCommands(defaultsPath);
    const installedCmds = await listCommands(installedPath);

    const totalCommands = defaultCmds.length + installedCmds.length;

    let menuText = `*${global.config?.botName || "Dynamite"} Menu*\n\n`;
    menuText += `*Total Commands:* ${totalCommands}\n`;
    menuText += `_Note some commands might be restricted to owners even if not tagged (Owner Only)_\n\n`;
    menuText += `_Type ${global.config?.cmdPrefix || "."}[command] .usage for help_\n`;

    const ownerCommands = [
      "clearcache",
      "getconfig",
      "install",
      "logout",
      "restart",
      "setconfig",
      "shutdown",
      "status",
      "uninstall",
      "update",
    ];
    // DEFAULTS
    menuText += "*DEFAULTS:*";
    if (defaultCmds.length === 0) {
      menuText += "_None_\n";
    } else {
      defaultCmds.sort().forEach((cmd) => (menuText += `\n> ${config.cmdPrefix}${cmd}${ownerCommands.includes(cmd) ? " (Owner Only)" : ""}`));
    }

    // INSTALLED
    menuText += "\n*INSTALLED:*";
    if (installedCmds.length === 0) {
      menuText += "_None_\n";
    } else {
      installedCmds.sort().forEach((cmd) => (menuText += `\n> ${config.cmdPrefix}${cmd}`));
    }

    await sock.sendMessage(from, { text: menuText }, { quoted: mek });
  } catch (err) {
    console.error("Menu Error:", err);
  }
}

module.exports = {
  name: "cmds",
  description: "Check available commands.",
  usage: "cmds",
  author: "Joedaprocodes",
  run: async (ctx) => {
    await cmdsLogic(ctx);
  },
};
