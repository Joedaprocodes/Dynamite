const fs = require("fs");
const path = require("path");
const chalk = require("chalk");

module.exports = {
    name: 'uninstall',
    description: 'Deletes an installed command and updates the registry.',
    usage: '.uninstall [command_name]',
    run: async (ctx) => {
        const { sock, args, isOwner, from } = ctx;

        if (!isOwner) return;

        const commandName = args[0]?.toLowerCase();
        if (!commandName) {
            return sock.sendMessage(from, { text: "Please provide the name of the command to uninstall.\nExample: .uninstall bible" });
        }

        // 1. Construct the path to the file
        // We add .js if the user didn't type it
        const fileName = commandName.endsWith(".js") ? commandName : `${commandName}.js`;
        const installedDir = path.join(__dirname, "installed");
        const filePath = path.join(installedDir, fileName);

        try {
            // 2. Check if file exists
            if (!fs.existsSync(filePath)) {
                return sock.sendMessage(from, { text: `Error: The command *${fileName}* was not found in the 'installed' folder.` });
            }

            // 3. Delete the file
            fs.unlinkSync(filePath);
            console.log(chalk.red(`[ DELE ] Removed ${fileName}`));

            // 4. Update the registry (installedCmds.json)
            const registryPath = path.join(__dirname, "../config/installedCmds.json");
            
            if (fs.existsSync(registryPath)) {
                let registry = JSON.parse(fs.readFileSync(registryPath, "utf-8"));
                
                // Filter out the deleted command
                const newRegistry = registry.filter(cmd => cmd !== fileName);
                
                fs.writeFileSync(registryPath, JSON.stringify(newRegistry, null, 2));
            }

            // 5. Restart to apply changes
            await sock.sendMessage(from, { 
                text: `🗑️ *Uninstalled Successfully!* \n\nFile: \`${fileName}\` has been deleted. \nRestarting Dynamite to clear memory...` 
            });

            setTimeout(() => process.exit(0), 2000);

        } catch (err) {
            console.error(err);
            await sock.sendMessage(from, { text: `Error deleting file: ${err.message}` });
        }
    }
};
