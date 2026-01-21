const fs = require("fs");
const path = require("path");
const { jidNormalizedUser } = require("baileys");

const delay = (ms) => new Promise((res) => setTimeout(res, ms));
const badWords = [
  'gandu', 'madarchod', 'bhosdike', 'bsdk', 'fucker', 'bhosda', 
  'lauda', 'laude', 'betichod', 'chutiya', 'maa ki chut', 'behenchod', 
  'behen ki chut', 'tatto ke saudagar', 'machar ki jhant', 'jhant ka baal', 
  'randi', 'chuchi', 'boobs', 'boobies', 'tits', 'idiot', 'nigga', 'fuck', 
  'dick', 'bitch', 'bastard', 'asshole', 'asu', 'awyu', 'teri ma ki chut', 
  'teri maa ki', 'lund', 'lund ke baal', 'mc', 'lodu', 'benchod',

  // Additional offensive words
  'shit', 'damn', 'hell', 'piss', 'crap', 'bastard', 'slut', 'whore', 'prick',
  'motherfucker', 'cock', 'cunt', 'pussy', 'twat', 'wanker', 'douchebag', 'jackass', 
  'moron', 'retard', 'scumbag', 'skank', 'slutty', 'arse', 'bugger', 'sod off',

  'chut', 'laude ka baal', 'madar', 'behen ke lode', 'chodne', 'sala kutta',
  'harami', 'randi ki aulad', 'gaand mara', 'chodu', 'lund le', 'gandu saala',
  'kameena', 'haramzada', 'chamiya', 'chodne wala', 'chudai', 'chutiye ke baap',

  'fck', 'fckr', 'fcker', 'fuk', 'fukk', 'fcuk', 'btch', 'bch', 'bsdk', 'f*ck','assclown',
  'a**hole', 'f@ck', 'b!tch', 'd!ck', 'n!gga', 'f***er', 's***head', 'a$$', 'l0du', 'lund69',

  'spic', 'chink', 'cracker', 'towelhead', 'gook', 'kike', 'paki', 'honky', 
  'wetback', 'raghead', 'jungle bunny', 'sand nigger', 'beaner',

  'blowjob', 'handjob', 'cum', 'cumshot', 'jizz', 'deepthroat', 'fap', 
  'hentai', 'MILF', 'anal', 'orgasm', 'dildo', 'vibrator', 'gangbang', 
  'threesome', 'porn', 'sex', 'xxx',

  'fag', 'faggot', 'dyke', 'tranny', 'homo', 'sissy', 'fairy', 'lesbo',

  'weed', 'pot', 'coke', 'heroin', 'meth', 'crack', 'dope', 'bong', 'kush', 
  'hash', 'trip', 'rolling'
];

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
    config,
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
          await delay(2000);
          await sock.sendMessage(from, { text });
          await sock.sendPresenceUpdate("paused", from);
        };

        // B. Handle Action: KICK
        if (groupConfig.onlink === "kick") {
          // Remove immediately for speed
          await sock.groupParticipantsUpdate(from, [senderJid], "remove");

          // Then notify the group
          await sock.sendPresenceUpdate("composing", from);
          await sendResponse(
            `${senderJid.split("@")[0]} has been removed for sharing unauthorized links.`,
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

          await sock.sendPresenceUpdate("composing", from);
          await delay(2000);
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
          await sock.sendPresenceUpdate("paused", from);
        }

        return; // Stop processing further
      }
    }
  }

  // 2.5 --- ADMIN-AWARE ANTI-BADWORD LOGIC ---
  if (isGroup && groupConfig?.antibadwords && isBotAdmin) {
    // Check if msgBody contains any word from the badWords list
    const customWords = groupConfig?.badwords || [];
    const hasBadWord = [...customWords, ...badWords].some((word) =>
      msgBody.toLowerCase().includes(word.toLowerCase()),
    );

    if (hasBadWord && !isOwner && !isUserAdmin) {
      // A. Delete the offensive message immediately
      await sock.sendMessage(from, { delete: mek.key });
      console.log(`[ ANBW ] Deleted message from: ${senderJid}`);

      // Helper to handle presence + delay + message (reusing your structure)
      const sendBadwordResponse = async (text) => {
        await sock.sendPresenceUpdate("composing", from);
        await delay(2000);
        await sock.sendMessage(from, { text, mentions: [senderJid] });
        await sock.sendPresenceUpdate("paused", from);
      };

      // B. Handle Action (Reusing the WARN system)
      if (!groupConfig.userWarns) groupConfig.userWarns = {};
      if (!groupConfig.userWarns[senderJid])
        groupConfig.userWarns[senderJid] = 0;

      groupConfig.userWarns[senderJid] += 1;
      const currentWarns = groupConfig.userWarns[senderJid];
      const maxWarns = groupConfig.warnCount || 3;

      if (currentWarns >= maxWarns) {
        groupConfig.userWarns[senderJid] = 0; // Reset warnings
        await sendBadwordResponse(
          `@${senderJid.split("@")[0]} was removed for repeated use of forbidden language.`,
        );
        await sock.groupParticipantsUpdate(from, [senderJid], "remove");
      } else {
        await sendBadwordResponse(
          `@${senderJid.split("@")[0]}, that kind of language is not allowed here!\n\n*Warning:* ${currentWarns}/${maxWarns}`,
        );
      }

      return; // Stop processing further (don't run commands if they contain bad words)
    }
  }

  if (config.autoread) {
    await sock.readMessages([mek.key]);
  }
  // 3. --- OWNER COMMAND PROTECTION (SILENT) ---
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

  if (command && ownerCommands.includes(command) && !isOwner) {
    console.log(`[ SECU ] Unauthorized owner command ignored: ${command}`);
    return;
  }
  if (!command) return;
  // 4. --- COMMAND HANDLING ---
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
      const usageText = `*Command:*  ${config.cmdPrefix}${command}
      \n> *Desc:* ${cmd?.description}
      \n> *Usage:* ${cmd?.usage}
      \n> *Author:* ${cmd?.author || "Unknown"}
      `;

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
    console.error(`[ ERRO ] ${command}:`, err);
  }
}

module.exports = { handleMessages };
