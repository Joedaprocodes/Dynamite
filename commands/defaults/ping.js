// Change {sock, msg, args} to {sock, mek, args}
async function pingLogic({sock, mek, args}) {
    // Now mek.key.remoteJid will work
    const from = mek.key.remoteJid;
    
    // Calculate latency
    const timestamp = mek.messageTimestamp * 1000;
    const latency = Date.now() - timestamp;

    await sock.sendMessage(from, 
        { text: `Pong! 🏓\nResponse time: ${latency}ms` }, 
        { quoted: mek }
    );
}

module.exports = {
    name: 'ping',
    description: 'Check bot speed and latency.',
    usage: '.ping',
    run: async (ctx) => {
        await pingLogic(ctx);
    }
};