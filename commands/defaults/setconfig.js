const fs = require("fs");
const path = require("path");

async function setConfigLogic({ sock, mek, args, isOwner }) {
  const from = mek.key.remoteJid;

  // 1. Security Check
  if (!isOwner) return;

  const key = args[0];
  let rawValue = args.slice(1).join(" ");

  try {
    // 3. Resolve Path (Up two levels to root, then into config folder)
    const configPath = path.resolve(__dirname, "../../config/config.json");

    if (!fs.existsSync(configPath)) {
      return await sock.sendMessage(from, {
        text: "Error: config.json file not found.",
      });
    }

    let config = JSON.parse(fs.readFileSync(configPath, "utf-8"));

    switch (args[0]) {
      case "mkowner": {
        if (args[1].endsWith("@lid")) {
          config.owner.push(args[1]);
        } else {
          await sock.sendMessage(
            from,
            {
              text: "> Error: Failed to update configuration because it is not a valid lid.",
            },
            { quoted: mek },
          );
          return;
        }
        break;
      }
      case "rmowner": {
        if (args[1].endsWith("@lid")) {
          config.owner.pop(args[1]);
        } else {
          await sock.sendMessage(
            from,
            {
              text: "> Error: Failed to update configuration because it is not a valid lid.",
            },
            { quoted: mek },
          );
          return;
        }
        break;
      }
      case "ownername": {
        if (args[1]) {
          config.ownerName = args.join(" ");
        } else {
          await sock.sendMessage(
            from,
            {
              text: "> Error: Failed to update configuration because no name was passed",
            },
            { quoted: mek },
          );
          return;
        }
        break;
      }
      case "botname": {
        if (args[1]) {
          config.ownerName = args.join(" ");
        } else {
          await sock.sendMessage(
            from,
            {
              text: "> Error: Failed to update configuration because no name was passed",
            },
            { quoted: mek },
          );
          return;
        }
        break;
      }
      case "typing": {
        if (args[1]) {
          config.cmdPrefix = args[1];
        } else {
          await sock.sendMessage(
            from,
            {
              text: "> Error: Failed to update configuration ",
            },
            { quoted: mek },
          );
          return;
        }
        break;
      }
      case "typing": {
        if (args[1] == "on") {
          config.typing = true;
        } else if (args[1] == "off") {
          config.typing = false;
        } else {
          await sock.sendMessage(
            from,
            {
              text: "> Error: Failed to update configuration because typing gets only on/off argument",
            },
            { quoted: mek },
          );
          return;
        }
        break;
      }
      case "autoread": {
        if (args[1] == "on") {
          config.typing = true;
        } else if (args[1] == "off") {
          config.typing = false;
        } else {
          await sock.sendMessage(
            from,
            {
              text: "> Error: Failed to update configuration because autoread gets only on/off argument",
            },
            { quoted: mek },
          );
          return;
        }
        break;
      }
      case "repo": {
        if (args[1].startsWith("https://")) {
          config.repo = args[1];
        } else {
          await sock.sendMessage(
            from,
            {
              text: "> Error: Failed to update configuration because repo is not a valid link.",
            },
            { quoted: mek },
          );
          return;
        }
        break;
      }
    }

    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

    await sock.sendMessage(
      from,
      {
        text: `> Successfully updated Configuration`,
      },
      { quoted: mek },
    );
  } catch (err) {
    console.error("SetConfig Error:", err);
    await sock.sendMessage(from, {
      text: "Error: Failed to update configuration.",
    });
  }
}

module.exports = {
  name: "setconfig",
  description:
    "Change bot settings and preserve data types (Array, Boolean, String).",
  usage: ".setconfig mkowner/rmowner/ownername/botname/ <value>",
  author: "Joedaprocodes",
  run: async (ctx) => {
    // ctx contains { sock, mek, args, isOwner, etc. }
    await setConfigLogic(ctx);
  },
};
