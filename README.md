# 🧨 Dynamite WhatsApp Bot

Dynamite is a high-performance, Professional looking, modular WhatsApp bot built with **Baileys**. It features a robust local caching system to minimize server requests, advanced group administration tools, and an easy-to-use command installation system.

---

## ✨ Key Features

- **⚡ High Performance:** Uses `node-cache` for group metadata to prevent rate-limiting.
- **🛡️ Advanced Moderation:** Built-in Anti-Link, Anti-Badword, and Warning systems.
- **🔗 Pairing Code Login:** No need to scan QRs; log in using your phone number directly in the terminal.
- **📦 Modular Commands:** Add new features by simply dropping a `.js` file into the `commands/` folder.
- **💾 Persistent Storage:** Automatically saves chat history and group configurations to local JSON files.

---

## 🚀 Getting Started

### 1. Prerequisites

- [Termux](https://termux.dev/) (If running on Android)

### 2. Installation for PCs

```bash
# Clone the repository
git clone https://github.com/Joedaprocodes/Dynamite.git

# Enter the directory
cd Dynamite

# Install dependencies
npm install

```

### 2. Installation for Android (Copy and Paste into termux)

```bash
pkg update && pkg upgrade -y && \
pkg install git -y && \
git clone https://github.com/Joedaprocodes/Dynamite.git && \
cd Dynamite && \
chmod +x termux_setup.sh && \
./termux_setup.sh
```

### 4. Running the Bot

```bash
# Only use this command when you want to login/setup
npm run setup

```

```bash
# To run with PM2 after login/setup
npm start

```

```bash
# To show logs with PM2 after login/setup
npm run logs

```

```bash
# To show status with PM2 after login/setup
npm run status

```

```bash
# To stop Dynamite with PM2 after login/setup
npm stop

```

Follow the terminal prompts to enter your phone number and receive your **8-digit pairing code**.

---

## 🛠️ Commands Structure

Dynamite uses a structured command system:

- `commands/defaults/`: Core system commands (Management, GC, Status).
- `commands/installed/`: Community or custom plugins.

### Using the Default commands

| Command                    | Description                                                       |
| -------------------------- | ----------------------------------------------------------------- |
| `.who`                     | Shows user lid                                                    |
| `.cmds`                    | See all commands                                                  |
| `.ping`                    | pong 🏓                                                           |
| `.update`                  | Update to the latest version                                      |
| `.update check`            | Checks for update                                                 |
| `.clearcache`              | Wipes the temporary in-memory store and deletes the store file.   |
| `.getconfig`               | Displays all bot settings from config.json exactly as they are    |
| `.install <cmd name>`      | Installs a command from the official Dynamite command repo.       |
| `.uninstall <cmd name>`    | Uninstalls a command from the official Dynamite command repo.     |
| `.logout`                  | Logs out the bot and you have to run setup with `npm run setup`   |
| `.restart`                 | restarts the bot                                                  |
| `.shutdown`                | shuts down the bot                                                |
| `.setconfig <key> <value>` | configures the bot settings should run a .restart to save changes |
| `.status`                  | shows bot process status                                          |
| `.sync`                    | synchronizes the group participants; to be used in group          |
| `.tagall`                  | tags all group members                                            |
| `.gc <subcommand>`         | For group chat management                                         |

### Using the group controller command (`.gc`)

| Command                            | Description                                                                          |
| ---------------------------------- | ------------------------------------------------------------------------------------ |
| `.gc mute [mins]`                  | Mute group for a specified minute and forever until unmute if not time is not passed |
| `.gc unmute [mins]`                | Unmute group chat                                                                    |
| `.gc kick @user`                   | Kicks a member                                                                       |
| `.gc warn @user`                   | Warns a member                                                                       |
| `.gc rwarn @user`                  | Resets warns count for a member                                                      |
| `.gc status`                       | View active protections (Anti-link, etc.)                                            |
| `.gc config antilink <on/off>`     | Enable link protection                                                               |
| `.gc config antibadwords <on/off>` | Enable word usage protection                                                         |
| `.gc mkadmin @user`                | Promotes member to an admin                                                          |
| `.gc rmadmin @user`                | Demotes member from an admin                                                         |
| `.gc setname <text>`               | Change group name                                                                    |
| `.gc setdesc <text>`               | Change group description                                                             |
| `.gc disband`                   | (Danger) Clear all members and leave                                                 |

### Using the setconfig command (`.setconfig`)

| Command                        | Description                                                                                               |
| ------------------------------ | --------------------------------------------------------------------------------------------------------- |
| `.setconfig mkowner <value>`   | Makes a user a bot owner can initially be done in the bot's dm, value is user's linked identity (...@lid) |
| `.setconfig rmowner <value>`   | Removes a user as bot owner, value is user's linked identity (...@lid)                                    |
| `.setconfig ownername <value>` | Configure ownername value is text even with spaces and emojis                                             |
| `.setconfig botname <value>`   | Configure botname value is text even with spaces and emojis                                               |
| `.setconfig setprefix <value>` | set command prefix e.g from "." to "!" or "%"                                                             |
| `.setconfig typing <value>`    | Sets the bot's typing status to <on/off>, on is recommended                                               |
| `.setconfig autoread <value>`  | Sets the bot's autoread status to <on/off>, on is recommended                                             |
| `.setconfig repo <value>`      | Changing this changes the repository where the updates is coming from intended for beta testers           |

---

## To script commands for contribution or add it to the commands/defaults folder privately (doesn't even need a bot restart to work)

```javascript
async function commandLogic({ sock, args, mek, command, isOwner, isGroup, senderJid, from, store, msgBody, config, isBotAdmin, isUserAdmin }) {
  //sock is the connection socket
  //args are the arguments after the command in an array
  //mek is the message key
  //command is the file name aka command key
  //isOwner returns boolean to check if message is coming from owner
  //isGroup returns boolean to check if message is coming from group
  //senderJid is the sender's jid
  //from is the message address
  //store holds the bot's chat and group configs
  //msgBody returns the message that triggered this command
  //config returns the user's configuration
  //isBotAdmin returns boolean to check if bot is admin
  //isUserAdmin returns boolean to check if message sender is admin

  await sock.sendMessage(
    from,
    {
      text: `> Testing new command.\n> Note: The name of the file is the command usage`,
    },
    { quoted: mek },
  );
}

module.exports = {
  name: "<commands name>",
  description: "command description",
  usage: "command usage explanation",
  author: "Unknown", // your name
  run: async (ctx) => {
    await moduleLogic(ctx); //change to your functionLogic
  },
};
```

## 🏗️ Technical Architecture

- **The Store:** Manages `baileys_store.json` to keep track of chats and contacts.
- **The Cache:** `global.groupCache` stores metadata in RAM for instant access during admin checks.
- **The Handler:** `main.js` manages the logic flow (Read receipts -> Anti-link -> Command execution).

---

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.

---

### 🌟 Support

Developed by **Joedaprocodes**. If you find this bot useful, consider giving the repo a ⭐!

---
