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

    const targetFile = path.join(path.resolve(__dirname, "..", "installed"), `${pluginName}.js`);

if (fs.existsSync(targetFile)) {
    return sock.sendMessage(from, { 
        text: `> *${pluginName}* is already installed. Use .uninstall first if you want to update it.` 
    });
}


    // 1. Raw URL pointing to your repository
    const rawUrl = `https://raw.githubusercontent.com/Joedaprocodes/dynamiteCmds/refs/heads/main/${pluginName}.js`;

    try {
      await sock.sendMessage(from, {
        text: `> Searching for *${pluginName}*...`,
      });

      const response = await axios.get(rawUrl);
      const content = response.data;

      // Ensure we actually got code and not a 404 text string
      if (typeof content !== 'string' || content.includes('<!DOCTYPE html>')) {
         throw new Error("[ ERRO ] Invalid file content received.");
      }

      // 2. FIXED PATH: Go up one level from 'defaults' then into 'installed'
      const installDir = path.resolve(__dirname, "..", "installed");
      
      if (!fs.existsSync(installDir)) {
        fs.mkdirSync(installDir, { recursive: true });
      }

      const targetPath = path.join(installDir, `${pluginName}.js`);

      // 3. Save the file
      fs.writeFileSync(targetPath, content);

      await sock.sendMessage(from, {
        text: `> *Success!*\n> cmd *${pluginName}* installed successfully.`,
      });

    } catch (err) {
      if (err.response && err.response.status === 404) {
        await sock.sendMessage(from, {
          text: `> cmd *${pluginName}* not found in the repo.`,
        });
      } else {
        await sock.sendMessage(from, { text: `> Error: ${err.message}` });
      }
    }
  },
};
