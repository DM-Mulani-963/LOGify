#!/bin/bash

# LOGify Linux Installer
# Installs dependencies, creates DB directory, and sets up environment.

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}LOGify Installer...${NC}"

# Check for root
if [ "$EUID" -ne 0 ]; then 
  echo -e "${YELLOW}Please run as root (sudo ./install.sh)${NC}"
  exit 1
fi

sudo chmod +x install.sh
# Check Requirements
if ! command -v python3 &> /dev/null; then
    echo -e "${RED}Python 3 is not installed.${NC}"
    exit 1
fi      

if ! command -v npm &> /dev/null; then
    echo -e "${YELLOW}Warning: npm is not installed. Web dashboard building will be skipped.${NC}"
    HAS_NPM=false
else
    HAS_NPM=true
fi

# Create Directories
PROJECT_DIR=$(pwd)
DB_DIR="$PROJECT_DIR/Logs_DB"

echo -e "Setting up in: $PROJECT_DIR"

if [ ! -d "$DB_DIR" ]; then
    mkdir -p "$DB_DIR"
    chmod 777 "$DB_DIR" # Ensure accessible
    echo -e "Created Logs_DB directory."
fi

# Install Python Requirements
echo -e "${GREEN}Installing Python Dependencies...${NC}"
# CLI dependencies
pip3 install --break-system-packages -e ./cli

# Server dependencies
pip3 install --break-system-packages -r ./server/requirements.txt

# Install Web Dependencies (if npm exists)
if [ "$HAS_NPM" = true ]; then
    echo -e "${GREEN}Installing Web Dependencies...${NC}"
    cd web
    npm install
    cd ..
fi

# Create Global Shim
echo -e "${GREEN}Configuring 'logify' command...${NC}"
# Find the installed binary or use python launch
if command -v logify &> /dev/null; then
    LOGIFY_BIN=$(command -v logify)
    echo -e "Found installed binary at: $LOGIFY_BIN"
    # Ensure it's in a global path if not already
else
    # Create a wrapper script in /usr/local/bin
    cat <<EOF > /usr/local/bin/logify
#!/bin/bash
export PYTHONPATH=$PROJECT_DIR
exec python3 -m logify.main "\$@"
EOF
    chmod +x /usr/local/bin/logify
    echo -e "Created global command: /usr/local/bin/logify"
fi

# Final Instructions
echo -e "${GREEN}Installation Complete!${NC}"
echo -e ""
echo -e "To start LOGify:"
echo -e "  1. Run the GUI (Server + Web):"
echo -e "     ${YELLOW}logify gui${NC}"
echo -e ""
echo -e "  2. Run a standard Scan:"
echo -e "     ${YELLOW}logify scan${NC}"
