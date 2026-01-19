// const fs = require('fs');
// const path = require("path");

// const listCommands = async (basePath) => {
//   const folders = ['defaults', 'installed'];
//   let allCommands = [];

//   for (const folder of folders) {
//     const folderPath = path.join(basePath, folder);
//     if (fs.existsSync(folderPath)) {
//       const files = fs.readdirSync(folderPath).filter(file => file.endsWith('.js'));
//       allCommands.push(...files.map(file => file.replace('.js', '')));
//     }
//   }
//   return allCommands;
// };
// module.exports = { listCommands };

const fs = require('fs');
const path = require("path");

const listCommands = async (basePath) => {
  const subFolders = ['defaults', 'installed'];
  let allCommands = [];

  // Check if the basePath actually contains the subfolders
  const hasSubfolders = subFolders.some(folder => 
    fs.existsSync(path.join(basePath, folder))
  );

  if (hasSubfolders) {
    // Logic for index.js: Scan subfolders
    for (const folder of subFolders) {
      const folderPath = path.join(basePath, folder);
      if (fs.existsSync(folderPath)) {
        const files = fs.readdirSync(folderPath).filter(file => file.endsWith('.js'));
        allCommands.push(...files.map(file => file.replace('.js', '')));
      }
    }
  } else {
    // Logic for cmds.js: Scan the folder provided directly
    if (fs.existsSync(basePath)) {
      const files = fs.readdirSync(basePath).filter(file => file.endsWith('.js'));
      allCommands.push(...files.map(file => file.replace('.js', '')));
    }
  }
  
  return allCommands;
};

module.exports = { listCommands };