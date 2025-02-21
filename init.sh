#!/usr/bin/env bash
# A setup script to install Node.js (23.x), pigpio, and MuleTakt-9000 on an Ubuntu/Raspberry Pi system.

# Exit immediately if any command fails and treat unset variables as an error
set -euo pipefail

echo "=== [1/9] Updating and upgrading the system packages ==="
sudo apt-get update -y
sudo apt-get upgrade -y

echo "=== [2/9] Installing Node.js 23.x (LTS) via NodeSource ==="
# Download the Node.js 23.x setup script from NodeSource and run it
curl -fsSL https://deb.nodesource.com/setup_23.x -o nodesource_setup.sh
echo "Running NodeSource setup script..."
sudo -E bash nodesource_setup.sh

echo "=== [3/9] Installing Node.js and other packages ==="
sudo apt-get install -y nodejs
# Additional tools needed for compiling C++ addons and python-based setups
sudo apt-get install -y unzip make g++ build-essential python3-setuptools

echo "=== [4/9] Downloading and installing pigpio from source ==="
# Use wget to get the pigpio master.zip, then unzip, compile, and install
wget https://github.com/joan2937/pigpio/archive/master.zip
unzip master.zip
cd pigpio-master
make
sudo make install
cd ..

echo "=== [5/9] Starting pigpio daemon once to confirm install ==="
sudo pigpiod
sleep 1
echo "Pigpio daemon started. Will set up systemd service next."

echo "=== [6/9] Creating systemd service for pigpiod ==="
# Write a minimal pigpiod.service file
sudo bash -c 'cat > /etc/systemd/system/pigpiod.service <<EOF
[Unit]
Description=Pigpio daemon
After=network.target

[Service]
ExecStart=/usr/bin/pigpiod -l
ExecStop=/usr/bin/pigs pq
Type=forking

[Install]
WantedBy=multi-user.target
EOF'

echo "Reloading systemd, enabling and starting pigpiod service..."
sudo systemctl daemon-reload
sudo systemctl enable pigpiod
sudo systemctl start pigpiod

echo "=== [7/9] Cloning MuleTakt-9000 from GitHub ==="
cd ~
git clone https://github.com/a1xon/MuleTakt-9000
cd MuleTakt-9000

echo "=== [8/9] Updating global npm, installing node-gyp, TypeScript, etc. ==="
sudo npm install --global npm@latest node-gyp@latest typescript
npm config set node_gyp "$(npm prefix -g)/lib/node_modules/node-gyp/bin/node-gyp.js"

echo "Installing MuleTakt-9000 dependencies locally..."
npm install

echo "=== [9/9] Running MuleTakt-9000 main script ==="
npx tsx ./main.ts

echo "=== Setup complete! ==="
echo "If everything went well, your MuleTakt-9000 app is running or ready to run."
