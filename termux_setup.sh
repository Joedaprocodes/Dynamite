#!/data/data/com.termux/files/usr/bin/bash

# Define colors for better UI
GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

termux-setup-storage
termux-wake-lock

echo -e "${CYAN}--- Dynamite Bot Setup for Termux ---${NC}"

# 1. Update Termux Packages
echo -e "${YELLOW}Updating Termux packages...${NC}"
pkg update -y && pkg upgrade -y

# 2. Install Required Tools
echo -e "${YELLOW}Installing Node.js, Git, and PM2...${NC}"
pkg install nodejs -y
pkg install git -y
git config --global user.email "user@dynamite.com"
git config --global user.name "Dynamite user"
pkg install ffmpeg -y 
npm install -g pm2  # Installs PM2 globally for background running

# 3. Create necessary directories
echo -e "${YELLOW}Creating Dynamite folders...${NC}"
mkdir -p session storage/files commands/defaults commands/installed config

# 4. Install Dependencies
if [ -f "package.json" ]; then
    echo -e "${YELLOW}Installing NPM packages...${NC}"
    npm install
else
    echo -e "${YELLOW}Initializing npm and installing core libraries...${NC}"
    npm init -y
    npm install --save --ignore-scripts
    npm install baileys pino node-cache axios chalk@4.1.2
    npm install -g pm2
fi

# 5. Set Permissions
chmod +x index.js

echo -e "${GREEN}Setup Complete!${NC}"
echo -e "${CYAN}--------------------------------------------------${NC}"
echo -e "To see the Pairing code and login, run: ${YELLOW}npm run setup${NC}"
echo -e "To run in background later, run: ${YELLOW}npm start${NC}"
echo -e "To check background status, run: ${YELLOW}npm run status${NC}"
echo -e "To show logs, run: ${YELLOW}npm run logs${NC}"
echo -e "To stop the bot, run: ${RED}npm stop${NC}"
echo -e "${CYAN}--------------------------------------------------${NC}"

sleep 2

# 6. RUN THE BOT (Foreground first to scan QR)
npm run setup
