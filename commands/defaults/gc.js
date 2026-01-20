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

        case "disband":
            if (args[1] === "-f") {
                const groupMetadata = await sock.groupMetadata(from);
                const participants = groupMetadata.participants.map(p => p.id);
                // Remove everyone except the bot/owner might be safer, but full disband:
                await sock.sendMessage(from, {
                    text: "Disbanding group..."
                });
                for (let p of participants) {
                    if (p !== jidNormalizedUser(sock.user.id)) {
                        await sock.groupParticipantsUpdate(from, [p], "remove");
                    }
                }
                await sock.groupLeave(from);
            } else {
                await sock.sendMessage(from, {
                    text: "Are you sure? Use `.gc disband -f` to confirm."
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
                text: "Available: mute, unmute, kick, warn, mkadmin, rmadmin, setName, setDesc, status, disband"
            });
    }
}



module.exports = {
    name: 'gc',
    description: 'Advanced Group Administration Tools',
    usage: `
*--- MODERATION ---*
• *.gc mute [mins]* - Close group. Optional: set timer (e.g., .gc mute 30).
• *.gc unmute* - Open group to all members.
• *.gc kick [@user/reply]* - Remove a user from the group.
• *.gc warn [@user/reply]* - Add a strike. At 3 warns, user is kicked.

*--- ADMINISTRATION ---*
• *.gc mkadmin [@user/reply]* - Promote user to Admin.
• *.gc rmadmin [@user/reply]* - Demote an Admin to Member.
• *.gc status* - Show current group settings and protection status.
• *.gc config [key] [on/off]* - Toggle features (antilink, welcome, etc.).

*--- METADATA ---*
• *.gc setName [text]* - Change the group title.
• *.gc setDesc [text]* - Change the group description.

*--- DANGER ZONE ---*
• *.gc disband -f* - Removes all members and leaves the group.
`,
    run: async (ctx) => {
        await gchatLogic(ctx);
    }
};>