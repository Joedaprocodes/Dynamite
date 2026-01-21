module.exports = {
  name: "sync",
  description: "Manually refresh group metadata and admin permissions.",
  usage: ".sync",
  author: "Joedaprocodes",
  run: async (ctx) => {
    const { sock, from, isGroup, isOwner, isUserAdmin } = ctx;

    if (!isGroup) return;

    // Optional: Only allow admins/owner to sync to prevent member spam
    if (!isOwner && !isUserAdmin) return;

    try {
      await sock.sendMessage(from, {
        text: "> *Syncing...* Fetching latest group metadata.",
      });

      // The "Heavy" API call happens only here
      const metadata = await sock.groupMetadata(from);

      // Update the global cache
      global.groupCache.set(from, metadata);

      await sock.sendMessage(from, {
        text: `> *Sync Successful*
                \n\n*Group name:* ${metadata.subject}
                \n*Members count:* ${metadata.participants.length}
                \n> Group participants list updated.`,
      });
    } catch (e) {
      console.error(e);
      await sock.sendMessage(from, {
        text: "> *Sync Failed:* Rate limit might still be active. Wait a minute and try again.",
      });
    }
  },
};
