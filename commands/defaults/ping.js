async function pingLogic({ sock, mek, args }) {
  const from = mek.key.remoteJid;

  // Convert to Number to be safe
  const timestamp = Number(mek.messageTimestamp) * 1000;

  // Use Math.max(0, ...) to ensure we never show a negative number
  const latency = Math.max(0, Date.now() - timestamp);

  await sock.sendMessage(
    from,
    { text: `Pong! 🏓\nResponse time: ${latency}ms` },
    { quoted: mek },
  );
}

module.exports = {
  name: "ping",
  description: "Check bot speed and latency.",
  usage: ".ping",
  author: "Joedaprocodes",
  run: async (ctx) => {
    await pingLogic(ctx);
  },
};
