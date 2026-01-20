const {
    jidNormalizedUser
} = require("baileys");

async function gchatLogic({
    sock,
    mek,
    args,
    isOwner,
    isUserAdmin,
    isBotAdmin,
    isGroup,
    groupConfig,
    store
}) {
    if (!isGroup) return;

    // Authorization Checks
    if (!isUserAdmin && !isOwner) return sock.sendMessage(mek.key.remoteJid, {
        text: "Admins only."
    });
    if (!isBotAdmin) return sock.sendMessage(mek.key.remoteJid, {
        text: "I need to be an admin first!"
    });

    const from = mek.key.remoteJid;
    const subCommand = args[0]?.toLowerCase();
    const query = args.slice(1).join(" ");

    // Helper to get targets from mentions OR replies
    const getTargets = () => {
        let users = mek.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
        const replied = mek.message?.extendedTextMessage?.contextInfo?.participant;
        if (replied) users.push(replied);
        return [...new Set(users)]; // Remove duplicates
    };

    switch (subCommand) {
        // 1. CONFIGURATION (Toggles features)
        case "config": {
            const key = args[1]?.toLowerCase();
            const value = args[2]?.toLowerCase();
            const validKeys = ["antilink", "antibadwords", "welcome", "goodbye"];

            if (!key || !validKeys.includes(key)) {
                return sock.sendMessage(from, {
                    text: `Valid keys: ${validKeys.join(", ")}`
                });
            }

            if (value === "on") {
                groupConfig[key] = true;
            } else if (value === "off") {
                groupConfig[key] = false;
            } else {
                return sock.sendMessage(from, {
                    text: `Usage: .gc config ${key} on/off`
                });
            }

            await sock.sendMessage(from, {
                text: `Success! *${key}* is now ${groupConfig[key] ? "ENABLED ✅" : "DISABLED ❌"}`
            });
            break;
        }

        // 2. MUTE/UNMUTE
        case "mute":
            await sock.groupSettingUpdate(from, 'announcement');
            let muteText = "Group muted. Only admins can send messages.";

            // Check for minutes argument
            if (args[1] && !isNaN(args[1])) {
                const minutes = parseInt(args[1]);
                muteText = `Group muted for ${minutes} minute(s).`;
                setTimeout(async () => {
                    await sock.groupSettingUpdate(from, 'not_announcement');
                    await sock.sendMessage(from, {
                        text: "Mute time is over. Group unmuted."
                    });
                }, minutes * 60000);
            }
            await sock.sendMessage(from, {
                text: muteText
            });
            break;

        case "unmute":
            await sock.groupSettingUpdate(from, 'not_announcement');
            await sock.sendMessage(from, {
                text: "Group unmuted. Everyone can send messages."
            });
            break;

        // 3. MEMBER MANAGEMENT
        case "kick":
            const toKick = getTargets();
            if (toKick.length === 0) return sock.sendMessage(from, {
                text: "Tag someone or reply to their message to kick."
            });
            await sock.groupParticipantsUpdate(from, toKick, "remove");
            break;

        case "warn":
            const toWarn = getTargets()[0];
            if (!toWarn) return sock.sendMessage(from, {
                text: "Tag a user to warn."
            });

            const warnLimit = groupConfig.warnCount || 3;
            groupConfig.userWarns[toWarn] = (groupConfig.userWarns[toWarn] || 0) + 1;

            if (groupConfig.userWarns[toWarn] >= warnLimit) {
                await sock.sendMessage(from, {
                    text: `User reached warn limit (${warnLimit}). Kicking...`
                });
                await sock.groupParticipantsUpdate(from, [toWarn], "remove");
                delete groupConfig.userWarns[toWarn];
            } else {
                await sock.sendMessage(from, {
                    text: `User warned. (${groupConfig.userWarns[toWarn]}/${warnLimit})`
                });
            }
            break;

        case "mkadmin":
            const toPromote = getTargets();
            if (toPromote.length === 0) return sock.sendMessage(from, {
                text: "Tag users to promote."
            });
            await sock.groupParticipantsUpdate(from, toPromote, "promote");
            break;

        case "rmadmin":
            const toDemote = getTargets();
            if (toDemote.length === 0) return sock.sendMessage(from, {
                text: "Tag users to demote."
            });
            await sock.groupParticipantsUpdate(from, toDemote, "demote");
            break;

        // 4. METADATA
        case "setname":
            if (!query) return sock.sendMessage(from, {
                text: "Provide a name. Usage: .gc setName New Name"
            });
            await sock.groupUpdateSubject(from, query);
            break;

        case "setdesc":
            if (!query) return sock.sendMessage(from, {
                text: "Provide a description."
            });
            await sock.groupUpdateDescription(from, query);
            break;

        // 5. DANGER ZONE (Cache Based)
        case "disband":
            if (args[1] === "-f") {
                // STEP 1: Get participants from CACHE ONLY
                const cachedMetadata = global.groupCache ? global.groupCache.get(from) : null;

                if (!cachedMetadata || !cachedMetadata.participants) {
                    return sock.sendMessage(from, {
                        text: "❌ Error: Group participants not found in cache.\nPlease run *.sync* first to load group data."
                    });
                }

                const botId = jidNormalizedUser(sock.user.id);
                // Filter out the bot itself
                const participants = cachedMetadata.participants
                    .map(p => p.id)
                    .filter(id => id !== botId);

                await sock.sendMessage(from, {
                    text: `Disbanding group... Removing ${participants.length} members.`
                });

                // STEP 2: Safe Batch Removal (5 users per second to avoid overflow)
                for (let i = 0; i < participants.length; i += 5) {
                    const batch = participants.slice(i, i + 5);
                    await sock.groupParticipantsUpdate(from, batch, "remove");
                    await new Promise(resolve => setTimeout(resolve, 1000)); // 1s delay
                }

                // STEP 3: Leave
                await sock.groupLeave(from);
            } else {
                await sock.sendMessage(from, {
                    text: "⚠️ *WARNING*: This will remove ALL members and delete the group.\nUse *.gc disband -f* to confirm."
                });
            }
            break;

        case "status":
            const stats = `*Group Settings:*\n\n` +
                `• Anti-Link: ${groupConfig.antilink ? "✅" : "❌"}\n` +
                `• Anti-Badword: ${groupConfig.antibadwords ? "✅" : "❌"}\n` +
                `• Welcome: ${groupConfig.welcome ? "✅" : "❌"}\n` +
                `• Warn Limit: ${groupConfig.warnCount}`;
            await sock.sendMessage(from, {
                text: stats
            });
            break;

        default:
            await sock.sendMessage(from, {
                text: "Available: config, mute, unmute, kick, warn, mkadmin, rmadmin, setName, setDesc, status, disband"
            });
    }
}

module.exports = {
    name: 'gc',
    description: 'Advanced Group Administration Tools',
    usage: `gc <subcommand>

*MODERATION*
> *mute [mins]* : Close group chat
> *unmute* : Open group chat
> *kick @user* : Kick member
> *warn @user* : Warn member

*SETTINGS*
> *config antilink on/off*
> *config welcome on/off*
> *status* : Check settings

*ADMIN*
> *mkadmin @user* : Promote
> *rmadmin @user* : Demote
> *setname <text>* : Change Subject
> *disband -f* : Destroy group`,
    run: async (ctx) => {
        await gchatLogic(ctx);
    }
};
