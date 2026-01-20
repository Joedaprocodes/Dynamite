const Baileys = require("baileys");
const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
  jidNormalizedUser,
} = Baileys;
const {
  rmSync,
  existsSync,
  writeFileSync,
  readFileSync,
  mkdirSync,
} = require("fs");
const path = require("path");
const pino = require("pino");
const chalk = require("chalk");
const readline = require("readline");
const NodeCache = require("node-cache");

// 1. Load Configuration
const { handleMessages } = require("./main.js");
const { listCommands } = require("./functions.js");

/**
 * --- STORE CONFIGURATION ---
 */
const msgRetryCounterCache = new NodeCache();
const groupCache = new NodeCache({ stdTTL: 0, useClones: false });
global.groupCache = groupCache;

const createStore = () => {
  const chats = new Map();
  const contacts = {};
  const messages = {};
  const groups = {};

  return {
    chats,
    contacts,
    messages,
    groups,
    bind: (ev) => {
  ev.on("chats.upsert", (newChats) => {
    newChats.forEach((chat) => chats.set(chat.id, chat));
  });
  ev.on("contacts.upsert", (newContacts) => {
    newContacts.forEach((contact) => {
      contacts[contact.id] = contact;
    });
  });
  ev.on("messages.upsert", (m) => {
    const msg = m.messages[0];
    const jid = msg.key.remoteJid;
    if (!messages[jid]) messages[jid] = [];
    
    messages[jid].push(msg);
    
    // LIMIT: Keep only the last 15 messages per chat to prevent storage bloat
    if (messages[jid].length > 15) {
      messages[jid].shift(); 
    }
  });
},

    writeToFile: (path, groupPath) => {
      try {
        // 1. Get all keys from the group cache
        const cacheKeys = global.groupCache.keys();
        const cachedMetadata = global.groupCache.mget(cacheKeys);

        const data = JSON.stringify(
          { 
            chats: Array.from(chats.values()), 
            contacts, 
            messages,
            // 2. Include the metadata cache in the save file
            groupMetadataCache: cachedMetadata 
          },
          null,
          2,
        );
        writeFileSync(path, data);
        writeFileSync(groupPath, JSON.stringify(groups, null, 2));
      } catch (err) {
        console.error(
          chalk.bgRed.white("[ WRIT ]"),
          chalk.red("Error saving store:"),
          err,
        );
      }
    },

 readFromFile: (path, groupPath) => {
  // --- 1. HANDLE BAILEYS STORE (Chats, Contacts, Metadata Cache) ---
  if (existsSync(path)) {
    try {
      const rawData = readFileSync(path, "utf-8");

      // Check if file exists but is empty/invalid to prevent JSON.parse errors
      if (!rawData || rawData.trim() === "" || rawData === "{}") {
        console.log(chalk.yellow("[ READ ] Store file is empty. Waiting for first auto-save..."));
      } else {
        const data = JSON.parse(rawData);

        // Safely load Chats
        if (Array.isArray(data.chats)) {
          data.chats.forEach((chat) => chats.set(chat.id, chat));
        }

        // Safely load Contacts and Messages
        Object.assign(contacts, data.contacts || {});
        Object.assign(messages, data.messages || {});

        // Safely restore the Group Metadata Cache (The "Brain")
        if (data.groupMetadataCache) {
          const cacheEntries = Object.entries(data.groupMetadataCache).map(([key, val]) => ({
            key,
            val
          }));
          global.groupCache.mset(cacheEntries);
          console.log(
            chalk.bgGreen.black("[ CACH ]"),
            chalk.green(`Restored ${cacheEntries.length} groups from storage.`)
          );
        }
      }
    } catch (e) {
      console.log(
        chalk.bgRed.white("[ ERRO ]"),
        chalk.red(`Failed to parse store file: ${e.message}`)
      );
      // Optional: uncomment the line below to reset a corrupt file
      // writeFileSync(path, JSON.stringify({ chats: [], contacts: {}, messages: {}, groupMetadataCache: {} }));
    }
  }

  // --- 2. HANDLE GROUP CONFIG (gcconfig.json) ---
  if (existsSync(groupPath)) {
    try {
      const groupRaw = readFileSync(groupPath, "utf-8");
      if (groupRaw && groupRaw.trim() !== "" && groupRaw !== "{}") {
        const groupData = JSON.parse(groupRaw);
        Object.assign(groups, groupData);
        console.log(chalk.cyan(`[ READ ] Loaded group configurations.`));
      }
    } catch (e) {
      console.log(
        chalk.bgRed.white("[ ERRO ]"),
        chalk.red("Error reading group config: " + e.message)
      );
    }
  }
},

  };
};

const ensureConfigExists = () => {
  const configDir = path.join(__dirname, "config");
  const configPath = path.join(configDir, "config.json");

  const templates = {
    "config.json": {
      owner: [],
      ownerName: "Joedaprocodes",
      botName: "Dynamite",
      cmdPrefix: ".",
      autoread: true,
      repo: "https://github.com/Joedaprocodes/Dynamite.git",
    },
    "gcconfig.json": {},
    "installedCmds.json": [],
  };

  if (!existsSync(configDir)) {
    mkdirSync(configDir, { recursive: true });
  }

  // Create files if they don't exist
  Object.keys(templates).forEach((fileName) => {
    const filePath = path.join(configDir, fileName);
    if (!existsSync(filePath)) {
      writeFileSync(filePath, JSON.stringify(templates[fileName], null, 2));
      console.log(chalk.green(`Generated default ${fileName}`));
    }
  });

  // Safely load the config into global scope
  global.config = JSON.parse(readFileSync(configPath, "utf-8"));
};

// Execute at startup
ensureConfigExists();

const store = createStore();
global.store = store;

if (!existsSync("./storage")) mkdirSync("./storage", { recursive: true });
if (!existsSync("./commands/installed"))
  mkdirSync("./commands/installed", { recursive: true });

store.readFromFile("./storage/baileys_store.json", "./config/gcconfig.json");

setInterval(() => {
  store.writeToFile("./storage/baileys_store.json", "./config/gcconfig.json");
}, 30_000);

let commandsList;
let pairingCodeSent = false; // Prevents double-requesting

const question = (text) => {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) =>
    rl.question(text, (ans) => {
      rl.close();
      resolve(ans);
    }),
  );
};

async function startBot() {
  commandsList = await listCommands("./commands");
  const { version } = await fetchLatestBaileysVersion();
  const { state, saveCreds } = await useMultiFileAuthState(`./session`);

  const sock = makeWASocket({
    version,
    logger: pino({ level: "silent" }),
    printQRInTerminal: false,
    cachedGroupMetadata: async (jid) => groupCache.get(jid),
    browser: ["Ubuntu", "Chrome", "20.0.04"],
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "silent" })),
    },
    markOnlineOnConnect: true,
    generateHighQualityLinkPreview: true,
    msgRetryCounterCache,
    connectTimeoutMs: 60000,
    defaultQueryTimeoutMs: 60000,
  });

  store.bind(sock.ev);

  // --- 2. PAIRING CODE LOGIC (Moved outside the listener) ---
  if (!sock.authState.creds.registered && !pairingCodeSent) {
    pairingCodeSent = true;
    console.log(
      chalk.bgYellow.white("[ SESS ]"),
      chalk.yellow("No session found. Preparing login..."),
    );

    // Ask for number immediately
    const phoneNumber = await question(
      chalk.cyan("[ INPU ] Enter your WhatsApp number (with country code): "),
    );
    const cleanedNumber = phoneNumber.replace(/[^0-9]/g, "");

    // Small delay to let the socket establish before requesting the code
    setTimeout(async () => {
      try {
        let code = await sock.requestPairingCode(cleanedNumber);
        code = code?.match(/.{1,4}/g)?.join("-") || code;
        console.log(
          chalk.white("\nYour Pairing Code: ") +
            chalk.bgWhite.black(` ${code} `),
        );
      } catch (err) {
        console.error(
          chalk.red("\nError requesting pairing code:"),
          err.message,
        );
        pairingCodeSent = false; // Reset so user can try again
      }
    }, 5000);
  }

  // --- 3. CONNECTION HANDLER (Now only handles status) ---
  sock.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect } = update;

    if (connection === "open") {
      console.log(
        chalk.bgGreen.white("[ SUCC ]"),
        chalk.green(`${config.botName} is Online!`),
      );

      await sock.sendPresenceUpdate("available");

      // 1. Prepare Notification Logic
      const owners = Array.isArray(config.owner)
        ? config.owner
        : [config.owner];

      const bootMsg =
        `*${config.botName} is now Online!* 🚀\n\n` +
        `*Owner:* ${config.ownerName || "Admin"}\n` +
        `*Prefix:* "${config.cmdPrefix}"\n` +
        `*Time:* ${new Date().toLocaleString()}`;

      // 2. Loop through all owners and send the message
      for (const ownerID of owners) {
        try {
          const formattedId = ownerID.includes("@")
            ? ownerID
            : `${ownerID}@s.whatsapp.net`;

          await sock.sendMessage(jidNormalizedUser(formattedId), {
            text: bootMsg,
            contextInfo: {
              externalAdReply: {
                title: config.botName,
                body: "System Status: Active",
                // You can change this URL to your own image
                thumbnailUrl: "https://josh-web361.vercel.app/favicon.ico",
                sourceUrl: "https://josh-web361.vercel.app",
                mediaType: 1,
                renderLargerThumbnail: true,
              },
            },
          });
        } catch (e) {
          console.log(
            chalk.bgRedBright.white("[ ERRO ]"),
            chalk.redBright(`Could not notify owner: ${ownerID}`),
          );
        }
      }
    }

    if (connection === "close") {
      const statusCode = lastDisconnect?.error?.output?.statusCode;
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

      console.log(
        chalk.bgRed.white("[ CONN ]"),
        chalk.red(`Connection closed. Status: ${statusCode}`),
      );

      if (statusCode === DisconnectReason.loggedOut) {
        console.log(
          chalk.bgRed.white("[ CONN ]"),
          chalk.red("Logged out. Deleting session..."),
        );
        rmSync(path.join(__dirname, "session"), {
          recursive: true,
          force: true,
        });
        process.exit(0);
      }

      if (shouldReconnect) {
        console.log(
          chalk.bgCyan.white("[ CONN ]"),
          chalk.cyan("Attempting to reconnect..."),
        );
        setTimeout(() => startBot(), 5000);
      }
    }
  });

  // --- MESSAGE HANDLER ---
  sock.ev.on("messages.upsert", async (chatUpdate) => {
    try {
      const mek = chatUpdate.messages[0];
      if (!mek.message || mek.key.remoteJid === "status@broadcast") return;

      const from = mek.key.remoteJid;
      const isGroup = from.endsWith("@g.us");
      const rawSender = isGroup ? mek.key.participant : from;
      console.log(chalk.blue(`[ MESG ] From: ${from} ${isGroup ? "in group" : "in private"}`))
      if (!rawSender) return;

      // Initialize group config
      if (isGroup && !store.groups[from]) {
        store.groups[from] = {
          id: from,
          config: {
            antibadwords: false,
            antilink: false,
            welcome: false,
            goodbye: false,
            tagalltext: "Group Announcement:",
            welcomeText: "",
            goodbyeText: "",
            onbadword: "warn",
            onlink: "kick",
            warnCount: 3,
            linkwhitelist: [],
            participantsallowedcommands: [],
            badwords: [],
            userWarns: {},
          },
        };
      }

      const senderJid = jidNormalizedUser(rawSender);
      const isOwner =
        (Array.isArray(config.owner) ? config.owner : [config.owner]).some(
          (id) =>
            jidNormalizedUser(
              id.includes("@") ? id : `${id}@s.whatsapp.net`,
            ) === senderJid,
        ) || mek.key.fromMe;

      if (!isGroup && !isOwner) return;

      const msgBody = (
        mek.message.conversation ||
        mek.message.extendedTextMessage?.text ||
        mek.message.imageMessage?.caption ||
        mek.message.videoMessage?.caption ||
        ""
      ).trim();

      let command = null;
      let args = [];

      if (msgBody.startsWith(config.cmdPrefix)) {
        const words = msgBody.slice(config.cmdPrefix.length).trim().split(/ +/);
        command = words.shift().toLowerCase();
        args = words;

        if (!commandsList.includes(command)) {
          if (!isGroup)
            await sock.sendMessage(from, { text: `*Unknown:* ${command}` });
          return;
        }
        console.log(chalk.bgWhite.black("COMMAND"), chalk.yellow(command));
      }

      await handleMessages({
        sock,
        mek,
        command,
        args,
        isOwner,
        isGroup,
        groupConfig: isGroup ? store.groups[from].config : null,
        senderJid,
        from,
        store,
        msgBody,
        config,
      });
    } catch (err) {
      console.error(
        chalk.bgWhite.red("[ EXEC ]"),
        chalk.red("Upsert Error:"),
        err,
      );
    }
  });

  sock.ev.on("creds.update", saveCreds);
  // Automatically sync when the bot joins a new group
sock.ev.on("groups.upsert", async (groups) => {
    for (const group of groups) {
        try {
            console.log(chalk.cyan(`[AUTO-SYNC] Joined new group: ${group.id}. Fetching metadata...`));
            const metadata = await sock.groupMetadata(group.id);
            global.groupCache.set(group.id, metadata);
        } catch (e) {
            console.error("Auto-sync failed:", e);
        }
    }
});

}

startBot();
