import { initialize, terminate } from 'pigpio';
import { Bot } from "./bot/bot"
import { log } from "./utils/logger"
import { sleep } from "./utils/sleep"
process.setMaxListeners(0);


log('MAIN: = Mulenado v.0.1 =');
sleep(100);
log('MAIN: initialize pigpio');
initialize();
sleep(100);

process.on('SIGINT', () => {
  terminate();
  log('MAIN: SIGINT - Forcefully terminating');
});

process.on('SIGTERM', () => {
  terminate();
  log('MAIN: SIGTERM - Forcefully terminating');
});

const startUp = async () => {
  const bot = new Bot();
  // for (const dispenser of bot.dispensers) {
  //   await dispenser.selfTest();
  // }
  await sleep(5000);
  bot.acceptDrink();
  bot.acceptDrink();
  await sleep(30000);
  bot.acceptDrink();
  return true;
}

await startUp();