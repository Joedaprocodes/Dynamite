const os = require("os");

async function statusLogic({ sock, mek, isOwner }) {
  const from = mek.key.remoteJid;

  // 1. Security Check
  if (!isOwner) {
    return await sock.sendMessage(
      from,
      { text: "*Access Denied:* Only the bot owner can view system status." },
      { quoted: mek },
    );
  }

  // 2. System Calculations
  const uptime = process.uptime();
  const hours = Math.floor(uptime / 3600);
  const minutes = Math.floor((uptime % 3600) / 60);
  const seconds = Math.floor(uptime % 60);

  // RAM Usage for the Node process
  const processRam = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2);
  // Total System RAM
  const totalRam = (os.totalmem() / 1024 / 1024 / 1024).toFixed(2);
  const freeRam = (os.freemem() / 1024 / 1024 / 1024).toFixed(2);

  const statusText =
    `*BOT SYSTEM STATUS*\n\n` +
    `*Uptime:* ${hours}h ${minutes}m ${seconds}s\n` +
    `*Process RAM:* ${processRam} MB\n` +
    `*System RAM:* ${freeRam}GB / ${totalRam}GB Free\n` +
    `*Platform:* ${process.platform} (${os.arch()})\n` +
    `*CPU Load:* ${os.loadavg()[0].toFixed(2)}%\n` +
    `*Role:* Owner Verified`;
  await sock.sendMessage(from, { text: statusText }, { quoted: mek });
}

module.exports = {
  name: "status",
  description: "Check bot vitals and system performance.",
  usage: ".status",
  run: async (ctx) => {
    // ctx contains { sock, mek, isOwner, etc. }
    await statusLogic(ctx);
  },
};
