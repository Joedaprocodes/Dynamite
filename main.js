const fs = require("fs");
const path = require("path");
const { jidNormalizedUser } = require("baileys");

async function handleMessages(context) {
  const {
    sock,
    mek,
    command,
    args,
    isOwner,
    isGroup,
    groupConfig,
    from,
    senderJid,
    store,
    msgBody,
    config
  } = context;

    // 1. --- CACHED ADMIN STATUS ---
  let isBotAdmin = false;
  let isUserAdmin = false;

  if (isGroup) {
    // Look in our global cache instead of calling the API
    const groupMetadata = global.groupCache.get(from);

    if (groupMetadata) {
      const participants = groupMetadata.participants || [];
      const botJid = jidNormalizedUser(sock.user.id);
      const botLid = sock.user.lid ? jidNormalizedUser(sock.user.lid) : null;
      const senderJidNormalized = jidNormalizedUser(senderJid);

      const botPart = participants.find((p) => {
        const pId = jidNormalizedUser(p.id);
        return pId === botJid || (botLid && pId === botLid);
      });

      const userPart = participants.find(
        (p) => jidNormalizedUser(p.id) === senderJidNormalized,
      );

      isBotAdmin = !!botPart?.admin;
      isUserAdmin = !!userPart?.admin;
    } else {
      // Optional: Log once that cache is empty
      // console.log(`[SYSTEM] No metadata for ${from}. Run .gc sync`);
    }
  }


  // 2. --- ADMIN-AWARE ANTI-LINK LOGIC ---
  if (isGroup && groupConfig?.antilink && isBotAdmin) {
    const linkRegex = /https?:\/\/\S+|www\.\S+/gi;
    const linksFound = msgBody.match(linkRegex);

    if (linksFound && !isOwner && !isUserAdmin) {
      // Whitelist check
      const whitelist = groupConfig.linkwhitelist || [];
      const isWhitelisted = linksFound.every((link) => {
        return whitelist.some((whitelisted) =>
          link.toLowerCase().includes(whitelisted.toLowerCase()),
        );
      });

      if (!isWhitelisted) {
        // A. Delete Forbidden Link Immediately
        await sock.sendMessage(from, { delete: mek.key });
        console.log(`[ANTILINK] Deleted link from: ${senderJid}`);

        // Helper to handle presence + delay + message
        const sendResponse = async (text) => {
          await sock.sendPresenceUpdate("composing", from);
          await new Promise((res) => setTimeout(res, 2000));
          await sock.sendMessage(from, { text, mentions: [senderJid] });
          await sock.sendPresenceUpdate("paused", from);
        };

        // B. Handle Action: KICK
        if (groupConfig.onlink === "kick") {
          await sock.groupParticipantsUpdate(from, [senderJid], "remove");
          await sendResponse(
            `@${senderJid.split("@")[0]} has been removed for sharing unauthorized links.`,
          );
        }

        // C. Handle Action: WARN
        else if (groupConfig.onlink === "warn") {
          // Initialize warning object if missing
          if (!groupConfig.userWarns) groupConfig.userWarns = {};
          if (!groupConfig.userWarns[senderJid])
            groupConfig.userWarns[senderJid] = 0;

          groupConfig.userWarns[senderJid] += 1;
          const currentWarns = groupConfig.userWarns[senderJid];
          const maxWarns = groupConfig.warnCount || 3;

          if (currentWarns >= maxWarns) {
            groupConfig.userWarns[senderJid] = 0; // Reset
            await sendResponse(
              `@${senderJid.split("@")[0]} reached the warning limit (${maxWarns}/${maxWarns}) and has been removed.`,
            );
            await sock.groupParticipantsUpdate(from, [senderJid], "remove");
          } else {
            await sendResponse(
              `@${senderJid.split("@")[0]}, links are not allowed!\n\n*Warning:* ${currentWarns}/${maxWarns}\n_Reach ${maxWarns} and you will be kicked._`,
            );
          }
        }
        return; // Stop processing further
      }
    }
  }

  // 3. --- OWNER COMMAND PROTECTION (SILENT) ---
  const ownerCommands = [
    "restart",
    "shutdown",
    "clearcache",
    "getconfig",
    "setconfig",
    "status",
    "cmds",
  ];
  
  if (command && ownerCommands.includes(command) && !isOwner) {
    console.log(`[SECURITY] Unauthorized owner command ignored: ${command}`);
    return;
  }

  // 4. --- COMMAND HANDLING ---
  if (!command) {
    await sock.sendPresenceUpdate("paused", from);
    return;
  }

  // if (config.typing) await sock.sendPresenceUpdate("composing", from);

  try {
    const getCommandPath = (cmdName) => {
      const folders = ["defaults", "installed"];
      for (const folder of folders) {
        const fullPath = path.resolve(
          __dirname,
          `./commands/${folder}/${cmdName}.js`,
        );
        if (fs.existsSync(fullPath)) return fullPath;
      }
      return null;
    };

    const commandPath = getCommandPath(command);
    if (!commandPath) return;

    delete require.cache[require.resolve(commandPath)];
    const cmd = require(commandPath);

    // .usage logic
    if (args[0]?.toLowerCase() === ".usage") {
      const usageText = `*Command:* ${cmd.name.toUpperCase()}\n*Usage:* ${config.cmdPrefix}${cmd.usage}`;
      return await sock.sendMessage(from, { text: usageText }, { quoted: mek });
    }

    // RUN COMMAND
    await cmd.run({
      ...context,
      isBotAdmin,
      isUserAdmin,
      pushName: mek.pushName || "User",
    });
  } catch (err) {
    console.error(`[ERROR] ${command}:`, err);
  }
}

module.exports = { handleMessages };
