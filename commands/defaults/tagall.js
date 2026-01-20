async function tagAllLogic({
  sock,
  mek,
  args,
  isOwner,
  isGroup,
  isBotAdmin,
  isUserAdmin,
  from,
  groupConfig,
}) {
  if (!isGroup) return;
  if (!isOwner && !isUserAdmin) return;
  if (!isBotAdmin) {
    return await sock.sendMessage(from, {
      text: "> I need to be an *Admin* to tag everyone!",
    });
  }

  try {
    const groupMetadata = await sock.groupMetadata(from);
    const participants = groupMetadata.participants || [];

    const mainMessage =
      args.join(" ") || groupConfig?.tagalltext || "Hello everyone";

    let listText = `${mainMessage}\n\n`;
    let mentions = [];

    participants.forEach((mem, index) => {
      listText += `${index + 1}. @${mem.id.split("@")[0]}\n`;
      mentions.push(mem.id);
    });

    await sock.sendMessage(
      from,
      {
        text: listText,
        mentions,
      },
      { quoted: mek },
    );
  } catch (err) {
    console.error("TagAll Error:", err);
  }
}

module.exports = {
  name: "tagall",
  description: "Tags every member in the group",
  usage: "tagall [message]",
  author: "Joedaprocodes",
  run: async (ctx) => {
    await tagAllLogic(ctx);
  },
};
