sudo apt-get update -y
sudo apt-get upgrade -y
curl -fsSL https://deb.nodesource.com/setup_21.x | sudo -E bash - && sudo apt-get install -y nodejs
sudo apt-get install unzip make g++ build-essential python3-setuptools -y
wget https://github.com/joan2937/pigpio/archive/master.zip
unzip master.zip
cd pigpio-master
make
sudo make install
sudo pigpiod
cd ~
