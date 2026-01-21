const { jidNormalizedUser } = require("baileys");

async function gchatLogic({
  sock,
  mek,
  args,
  isOwner,
  isUserAdmin,
  isBotAdmin,
  isGroup,
  groupConfig,
  store,
  from,
}) {
  if (!isGroup) return;

  // Authorization Checks
  if (!isUserAdmin && !isOwner) return; // Exit silently
  if (!isBotAdmin)
    return sock.sendMessage(
      mek.key.remoteJid,
      {
        text: "> I need to be an admin first!",
      },
      { quoted: mek },
    );

  if (!store.groups[from]) {
    store.groups[from] = { config: { userWarns: {} } };
  }

  //   const from = mek.key.remoteJid;
  const subCommand = args[0]?.toLowerCase();
  const query = args.slice(1).join(" ");

  // Helper to get targets from mentions OR replies
  const getTargets = () => {
    let users =
      mek.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
    const replied = mek.message?.extendedTextMessage?.contextInfo?.participant;
    if (replied) users.push(replied);
    return [...new Set(users)];
  };

  switch (subCommand) {
    // 1. CONFIGURATION (Toggles features)
    case "config": {
      const key = args[1]?.toLowerCase();
      const value = args[2]?.toLowerCase();
      const validKeys = ["antilink", "antibadwords", "welcome", "goodbye"];

      if (!key || !validKeys.includes(key)) {
        return sock.sendMessage(from, {
          text: `Valid keys: ${validKeys.join(", ")}`,
        });
      }

      if (value === "on") {
        // groupConfig[key] = true;
        store.groups[from].config[key] = true;
      } else if (value === "off") {
        // groupConfig[key] = false;
        store.groups[from].config[key] = false;
      } else {
        return sock.sendMessage(
          from,
          {
            text: `> Usage: .gc config ${key} on/off`,
          },
          { quoted: mek },
        );
      }

      await sock.sendMessage(
        from,
        {
          text: `> Success! *${key}* is now ${store.groups[from].config[key] ? "on" : "off"}`,
        },
        { quoted: mek },
      );
      break;
    }

    // 2. MUTE/UNMUTE
    case "mute":
      await sock.groupSettingUpdate(from, "announcement");
      let muteText = "> Group muted. Only admins can send messages.";

      // Check for minutes argument
      if (args[1] && !isNaN(args[1])) {
        const minutes = parseInt(args[1]);
        muteText = `> Group muted for ${minutes} minute(s).`;
        setTimeout(async () => {
          await sock.groupSettingUpdate(from, "not_announcement");
          await sock.sendMessage(
            from,
            {
              text: "> Mute time is over. Group unmuted.",
            },
            { quoted: mek },
          );
        }, minutes * 60000);
      }
      await sock.sendMessage(
        from,
        {
          text: muteText,
        },
        { quoted: mek },
      );
      break;

    case "unmute":
      await sock.groupSettingUpdate(from, "not_announcement");
      await sock.sendMessage(
        from,
        {
          text: "> Group unmuted. Everyone can send messages.",
        },
        { quoted: mek },
      );
      break;

    // 3. MEMBER MANAGEMENT
    case "kick":
      const toKick = getTargets();
      if (toKick.length === 0)
        return sock.sendMessage(
          from,
          {
            text: "> Tag someone or reply to their message to kick.",
          },
          { quoted: mek },
        );
      await sock.groupParticipantsUpdate(from, toKick, "remove");
      break;

    case "warn":
      const toWarn = getTargets()[0];
      if (!toWarn)
        return sock.sendMessage(
          from,
          {
            text: "> Tag a user to warn or reply to their message.",
          },
          { quoted: mek },
        );

      if (!store.groups[from].config.userWarns) {
        store.groups[from].config.userWarns = {};
      }

      const warnLimit = store.groups[from].config.warnCount || 3;
      store.groups[from].config.userWarns[toWarn] =
        (store.groups[from].config.userWarns[toWarn] || 0) + 1;

      if (store.groups[from].config.userWarns[toWarn] >= warnLimit) {
        await sock.sendMessage(
          from,
          {
            text: `> User reached warn limit (${warnLimit}). Kicking...`,
          },
          { quoted: mek },
        );
        await sock.groupParticipantsUpdate(from, [toWarn], "remove");
        delete store.groups[from].config.userWarns[toWarn];
      } else {
        await sock.sendMessage(
          from,
          {
            text: `> User warned. (${store.groups[from].config.userWarns[toWarn]}/${warnLimit})`,
          },
          { quoted: mek },
        );
      }
      break;

    case "rwarn": {
      const toReset = getTargets()[0];
      if (!toReset) {
        return sock.sendMessage(
          from,
          {
            text: "> Tag a user or reply to their message to reset their warnings.",
          },
          { quoted: mek },
        );
      }

      // Check if the user even has warnings to begin with
      const userWarns = store.groups[from].config.userWarns;
      if (!userWarns || !userWarns[toReset]) {
        return sock.sendMessage(
          from,
          {
            text: "> This user has no warnings to reset.",
          },
          { quoted: mek },
        );
      }

      // Remove the user from the warning tracking object
      delete store.groups[from].config.userWarns[toReset];

      await sock.sendMessage(
        from,
        {
          text: `> Success! Warnings for @${toReset.split("@")[0]} have been reset to 0.`,
          mentions: [toReset],
        },
        { quoted: mek },
      );
      break;
    }

    case "mkadmin":
      const toPromote = getTargets();
      if (toPromote.length === 0)
        return sock.sendMessage(
          from,
          {
            text: "> Tag users to make admin.",
          },
          { quoted: mek },
        );
      await sock.groupParticipantsUpdate(from, toPromote, "promote");
      break;

    case "rmadmin":
      const toDemote = getTargets();
      if (toDemote.length === 0)
        return sock.sendMessage(
          from,
          {
            text: "> Tag users to remove as admin.",
          },
          { quoted: mek },
        );
      await sock.groupParticipantsUpdate(from, toDemote, "demote");
      break;

    // 4. METADATA
    case "setname":
      if (!query)
        return sock.sendMessage(
          from,
          {
            text: "> Provide a name. Usage: .gc setName New Name",
          },
          { quoted: mek },
        );
      await sock.groupUpdateSubject(from, query);
      break;

    case "setdesc":
      if (!query)
        return sock.sendMessage(
          from,
          {
            text: "> Provide a description.",
          },
          { quoted: mek },
        );
      await sock.groupUpdateDescription(from, query);
      break;

    // 5. DANGER ZONE (Cache Based)
    case "disband":
      if (args[1] === "-f") {
        // STEP 1: Get participants from CACHE ONLY
        const cachedMetadata = global.groupCache
          ? global.groupCache.get(from)
          : null;

        if (!cachedMetadata || !cachedMetadata.participants) {
          return sock.sendMessage(
            from,
            {
              text: "> Error: Group participants not found in cache.\nPlease run *.sync* first to load group data.",
            },
            { quoted: mek },
          );
        }

        const botId = jidNormalizedUser(sock.user.id);
        // Filter out the bot itself
        const participants = cachedMetadata.participants
          .map((p) => p.id)
          .filter((id) => id !== botId);

        await sock.sendMessage(
          from,
          {
            text: `> Disbanding group... Removing ${participants.length} members.`,
          },
          { quoted: mek },
        );

        // STEP 2: Safe Batch Removal (5 users per second to avoid overflow)
        for (let i = 0; i < participants.length; i += 5) {
          const batch = participants.slice(i, i + 5);
          await sock.groupParticipantsUpdate(from, batch, "remove");
          await new Promise((resolve) => setTimeout(resolve, 1000)); // 1s delay
        }

        // STEP 3: Leave
        await sock.groupLeave(from);
      } else {
        await sock.sendMessage(
          from,
          {
            text: "> *WARNING*: This will remove ALL members and delete the group.\nUse *.gc disband -f* to confirm.",
          },
          { quoted: mek },
        );
      }
      break;
  }
  
        case "status": {
      const config = store.groups[from].config;
      const userWarns = config.userWarns || {}; 
      const warnLimit = config.warnCount || 3;  

      // CHANGE 'const' TO 'let' HERE
      let stats = 
        `*Group Settings:*\n\n` +
        `Anti-Link:: ${config.antilink ? "`on`" : "`off`"}\n` +
        `Anti-Badword:: ${config.antibadwords ? "`on`" : "`off`"}\n` +
        `Welcome:: ${config.welcome ? "`on`" : "`off`"}\n` +
        `Warn Limit:: \`${warnLimit}\`\n\n`;

      stats += `*Member Warnings:*`; // This will now work perfectly
      
      const warnedJids = Object.keys(userWarns);
      if (warnedJids.length === 0) {
        stats += `\n> No users currently have warnings.`;
      } else {
        warnedJids.forEach((jid, index) => {
          const count = userWarns[jid];
          stats += `\n${index + 1}. ${jid.split("@")[0]} : \`[${count}/${warnLimit}]\``;
        });
      }

      await sock.sendMessage(
        from,
        {
          text: stats
        },
        { quoted: mek }
      );
      break;
    }


    default:
      await sock.sendMessage(
        from,
        {
          text: "> Available: config, mute, unmute, kick, warn, rwarn, mkadmin, rmadmin, setName, setDesc, status, disband",
        },
        { quoted: mek },
      );
  }
}

module.exports = {
  name: "gc",
  description: "Advanced Group Administration Tools",
  usage: `gc <subcommand>

*MODERATION*
> *mute [mins]* : Close group chat
> *unmute* : Open group chat
> *kick @user* : Kick member
> *warn @user* : Warn member
> *rwarn @user* : Reset warn for member

*SETTINGS*
> *config antilink on/off*
> *config welcome on/off*
> *status* : Check settings

*ADMIN*
> *mkadmin @user* : Promote
> *rmadmin @user* : Demote
> *setname <text>* : Change Subject
> *disband -f* : Destroy group`,
  author: "Joedaprocodes",
  run: async (ctx) => {
    await gchatLogic(ctx);
  },
};
