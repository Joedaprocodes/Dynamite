const {
    rmSync,
    existsSync
} = require("fs");
const path = require("path");
const chalk = require("chalk");

module.exports = {
    name: 'logout',
    description: 'Disconnects the bot and deletes the current session.',
    usage: '.logout',
    run: async (ctx) => {
        const {
            sock,
            msg,
            isOwner,
            from
        } = ctx;

        // 1. Security Check: Only the owner can use this
        if (!isOwner) {
            return sock.sendMessage(from, {
                text: "This command is restricted to the Bot Owner."
            });
        }

        try {
            await sock.sendMessage(from, {
                text: "Logging out and deleting session... Goodbye!"
            });

            // 2. Tell WhatsApp to invalidate the session
            await sock.logout();

            // 3. Define the session path
            const sessionPath = path.join(__dirname, "../session");

            // 4. Delete the folder
            if (existsSync(sessionPath)) {
                rmSync(sessionPath, {
                    recursive: true,
                    force: true
                });
                console.log(chalk.bgRed.white("[ SESS ] Session folder deleted successfully."));
            }

            // 5. Terminate the process
            console.log(chalk.red("Bot logged out by owner. Shutting down..."));
            process.exit(0);
        } catch (err) {
            console.error(err);
            await sock.sendMessage(from, {
                text: `Error during logout: ${err.message}`
            });
        }
    }
};