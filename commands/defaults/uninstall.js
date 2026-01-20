const axios = require("axios");
const fs = require("fs");
const path = require("path");

module.exports = {
  name: "install",
  description: "Installs a command from the official Dynamite command repo.",
  usage: ".install [command_name]",
  author: "Joedaprocodes",
  run: async (ctx) => {
    const { sock, args, isOwner, from } = ctx;

    if (!isOwner) return;

    const pluginName = args[0]?.toLowerCase();
    if (!pluginName) {
      return sock.sendMessage(from, {
        text: "> Please provide a cmd name. Example: .install bible",
      });
    }

    // 1. Define paths once at the top
    const installDir = path.resolve(__dirname, "..", "installed");
    const targetPath = path.join(installDir, `${pluginName}.js`);

    // 2. Check existence locally
    if (fs.existsSync(targetPath)) {
      return sock.sendMessage(from, { 
        text: `> *${pluginName}* is already installed. Use .uninstall first to update it.` 
      });
    }

    const rawUrl = `https://raw.githubusercontent.com/Joedaprocodes/dynamiteCmds/refs/heads/main/${pluginName}.js`;

    try {
      await sock.sendMessage(from, { text: `> Searching for *${pluginName}*...` });

      const response = await axios.get(rawUrl);
      const content = response.data;

      if (typeof content !== 'string' || content.includes('<!DOCTYPE html>')) {
         throw new Error("[ ERRO ] Invalid file content received (Check if file is public).");
      }

      // 3. Ensure folder exists
      if (!fs.existsSync(installDir)) {
        fs.mkdirSync(installDir, { recursive: true });
      }

      // 4. Save using the path we defined earlier
      fs.writeFileSync(targetPath, content);

      await sock.sendMessage(from, {
        text: `> *Success!* \n\n> cmd *${pluginName}* installed successfully.`,
      });

    } catch (err) {
      const msg = err.response?.status === 404 
        ? `> cmd *${pluginName}* not found in the repo.` 
        : `> Error: ${err.message}`;
      await sock.sendMessage(from, { text: msg });
    }
  },
};
