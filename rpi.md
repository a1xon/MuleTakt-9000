sudo apt-get update -y
sudo apt-get upgrade -y
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash - && sudo apt-get install -y nodejs
sudo apt-get install unzip make g++ build-essential python3-setuptools -y
wget https://github.com/joan2937/pigpio/archive/master.zip
unzip master.zip
cd pigpio-master
make
sudo make install
sudo pigpiod

sudo nano /etc/systemd/system/pigpiod.service

"[Unit]
Description=Pigpio daemon
After=network.target

[Service]
ExecStart=/usr/bin/pigpiod -l
ExecStop=/usr/bin/pigs pq

[Install]
WantedBy=multi-user.target"

sudo systemctl daemon-reload
sudo systemctl enable pigpiod
sudo systemctl start pigpiod

cd ~
git clone https://github.com/a1xon/MuleTakt-9000
cd MuleTakt-9000/
sudo npm install --g npm@latest node-gyp@latest typescript
npm config set node_gyp $(npm prefix -g)/lib/node_modules/node-gyp/bin/node-gyp.js
npm install
npx tsx ./main.ts