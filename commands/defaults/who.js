const { jidNormalizedUser } = require("baileys");

module.exports = {
    name: 'who',
    description: 'Fetch the hidden LID (Lightning ID) of a user.',
    usage: '.who [@user | reply]',
    run: async (ctx) => {
        const { sock, mek, args, isOwner, isUserAdmin, from, store } = ctx;

        // 1. Permission Check
        // Allow if Owner OR if Group Admin
        if (!isOwner && !isUserAdmin) {
            return sock.sendMessage(from, { text: "Access Denied: Admins or Owner only." });
        }

        // 2. Determine the Target User
        let targetJid = null;
        
        // Priority 1: Check for Mentions
        const mentioned = mek.message?.extendedTextMessage?.contextInfo?.mentionedJid;
        if (mentioned && mentioned.length > 0) {
            targetJid = mentioned[0];
        }
        
        // Priority 2: Check for Reply
        // If no mention, check if replying to someone
        if (!targetJid) {
            const replyParticipant = mek.message?.extendedTextMessage?.contextInfo?.participant;
            if (replyParticipant) {
                targetJid = replyParticipant;
            }
        }

        // If no target found
        if (!targetJid) {
            return sock.sendMessage(from, { text: "Please tag a user or reply to their message." });
        }

        // 3. Normalize the JID (removes :DeviceID stuff)
        const normalizedTarget = jidNormalizedUser(targetJid);

        // 4. Look up in Store
        // The store is passed via 'ctx' from your main.js
        const contact = store.contacts[normalizedTarget] || {};

        // 5. Send Result
        if (contact.lid) {
            await sock.sendMessage(from, { 
                text: `*User Identity Found*\n\n *User:* @${normalizedTarget.split('@')[0]}\n *LID:* \`${contact.lid}\``,
                mentions: [normalizedTarget]
            });
        } else {
            // Fallback if LID is not in cache yet
            await sock.sendMessage(from, { 
                text: `*LID Not Found in Cache*\n\nUser: @${normalizedTarget.split('@')[0]}\nStandard ID: \`${normalizedTarget}\`\n\n(The bot hasn't synced this user's LID yet. Try getting them to message the bot directly.)`,
                mentions: [normalizedTarget]
            });
        }
    }
};
