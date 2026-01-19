const fs = require("fs");
const path = require("path");

async function setConfigLogic({ sock, mek, args, isOwner }) {
  const from = mek.key.remoteJid;

  // 1. Security Check
  if (!isOwner) return;

  const key = args[0];
  let rawValue = args.slice(1).join(" "); 

  // 2. Validation
  if (!key || !rawValue) {
    return await sock.sendMessage(from, { text: `Usage: .setconfig <key> <value>` });
  }

  try {
    // 3. Resolve Path (Up two levels to root, then into config folder)
    const configPath = path.resolve(__dirname, "../../config/config.json");
    
    if (!fs.existsSync(configPath)) {
      return await sock.sendMessage(from, { text: "Error: config.json file not found." });
    }

    let config = JSON.parse(fs.readFileSync(configPath, "utf-8"));

    // Check if the key exists in config
    if (!config.hasOwnProperty(key)) {
      return await sock.sendMessage(from, { 
        text: `Invalid key. Available keys: ${Object.keys(config).join(", ")}` 
      });
    }

    const currentType = typeof config[key];
    let finalValue;

    // --- SMART TYPE CONVERSION ---
    // 1. Handle Booleans
    if (rawValue.toLowerCase() === "true" || rawValue.toLowerCase() === "false") {
        finalValue = rawValue.toLowerCase() === "true";
    } 
    // 2. Handle Arrays (e.g., owner field)
    else if (Array.isArray(config[key])) {
        finalValue = rawValue.split(",").map(id => id.trim());
    }
    // 3. Handle Numbers
    else if (!isNaN(rawValue) && rawValue.trim() !== "" && currentType === "number") {
        finalValue = Number(rawValue);
    }
    // 4. Default to String
    else {
        finalValue = rawValue;
    }

    // 4. Update and Save
    config[key] = finalValue;
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

    // Format display for confirmation
    const displayValue = Array.isArray(finalValue) ? finalValue.join(", ") : finalValue;

    await sock.sendMessage(from, { 
        text: `✅ Updated *${key}*\nValue: ${displayValue}\nType: ${Array.isArray(finalValue) ? "array" : typeof finalValue}\n\n_Note: You may need to .restart to apply system-level changes._` 
    }, { quoted: mek });

  } catch (err) {
    console.error("SetConfig Error:", err);
    await sock.sendMessage(from, { text: "Error: Failed to update configuration." });
  }
}

module.exports = {
  name: "setconfig",
  description: "Change bot settings and preserve data types (Array, Boolean, String).",
  usage: ".setconfig <key> <value>",
  run: async (ctx) => {
    // ctx contains { sock, mek, args, isOwner, etc. }
    await setConfigLogic(ctx);
  }
};