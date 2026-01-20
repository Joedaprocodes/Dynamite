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

### Example: Using the Group Controller (`.gc`)

| Sub-command              | Description                               |
| ------------------------ | ----------------------------------------- |
| `.gc status`             | View active protections (Anti-link, etc.) |
| `.gc config antilink on` | Enable link protection                    |
| `.gc mute 30`            | Close the group for 30 minutes            |
| `.gc disband -f`         | (Danger) Clear all members and leave      |

---

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
