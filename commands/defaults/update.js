const { exec } = require("child_process");

async function updateLogic(ctx) {
  const { sock, mek, args, isOwner, config } = ctx;
  const from = mek.key.remoteJid;
  const REPO_URL = config.repo;

  if (!isOwner) return;

  const mode = args[0]?.toLowerCase();

  // Helper function to run terminal commands
  const runCmd = (cmd) => {
    return new Promise((resolve, reject) => {
      exec(cmd, (err, stdout, stderr) => {
        if (err) reject(stderr || err.message);
        else resolve(stdout);
      });
    });
  };

  try {
    // 1. Check if Git is initialized, if not, initialize it
    try {
      await runCmd("git rev-parse --is-inside-work-tree");
    } catch {
      await sock.sendMessage(from, { text: "Initializing Git repository..." });
      await runCmd("git init");
      await runCmd(`git remote add origin ${REPO_URL}`);
    }

    if (mode === "check") {
      await sock.sendMessage(from, { text: "Checking for updates..." });
      await runCmd("git fetch origin main");
      const status = await runCmd("git status -uno");

      if (status.includes("Your branch is up to date")) {
        await sock.sendMessage(from, { text: "Everything is up to date." });
      } else {
        await sock.sendMessage(from, {
          text: "New updates found! Type `.update` to download them.",
        });
      }
    } else if(!mode) {
      // 2. APPLY UPDATE
      await sock.sendMessage(from, { text: "Downloading updates..." });

      // Force pull to overwrite local changes if necessary
      await runCmd("git fetch --all");
      const pullResults = await runCmd("git reset --hard origin/main");

      if (pullResults.includes("HEAD is now at")) {
        await sock.sendMessage(from, {
          text: "Update successful! Re-installing dependencies...",
        });

        // 3. Auto-install new packages if any
        await runCmd("npm install");

        await sock.sendMessage(from, { text: "All done! Restarting bot if you initially ran *npm start / npm run start*... \nElse you would need to restart manually" });
        process.exit(0);
      }
    }
  } catch (err) {
    console.error(err);
    await sock.sendMessage(from, { text: `Git Error: ${err}` });
  }
}

module.exports = {
  name: "update",
  description: "Update bot from public repository",
  usage: ".update check or .update",
  run: async (ctx) => {
    await updateLogic(ctx);
  },
};
