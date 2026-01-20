const axios = require("axios");
const fs = require("fs");
const path = require("path");
const chalk = require("chalk");

module.exports = {
  name: "install",
  description: "Installs a command from the official Dynamite plugin repo.",
  usage: ".install [command_name]",
  author: "Joedaprocodes",
  run: async (ctx) => {
    const { sock, args, isOwner, from } = ctx;

    if (!isOwner) return;

    const pluginName = args[0]?.toLowerCase();
    if (!pluginName) {
      return sock.sendMessage(from, {
        text: "> Please provide a plugin name. Example: .install bible",
      });
    }

    // 1. Construct the Raw GitHub URL
    const rawUrl = `https://raw.githubusercontent.com/Joedaprocodes/dynamiteCmds/refs/heads/main/${pluginName}.js`;

    try {
      await sock.sendMessage(from, {
        text: `> Searching for *${pluginName}* in the repository...`,
      });

      // 2. Attempt to fetch the file
      const response = await axios.get(rawUrl);
      const content = response.data;

      // 3. Define local destination
      const installDir = path.join(__dirname, "installed");
      if (!fs.existsSync(installDir)) {
        fs.mkdirSync(installDir, { recursive: true });
      }

      const targetPath = path.join(installDir, `${pluginName}.js`);

      // 4. Save the file locally
      fs.writeFileSync(targetPath, content);

      // 5. Success Message
      await sock.sendMessage(from, {
        text: `> *Plugin Installed!* \n\n> Command: \`.${pluginName}\``,
      });
    } catch (err) {
      if (err.response && err.response.status === 404) {
        await sock.sendMessage(from, {
          text: `> Plugin *${pluginName}* was not found in the repository.`,
        });
      } else {
        await sock.sendMessage(from, { text: `> Error: ${err.message}` });
      }
    }
  },
};
