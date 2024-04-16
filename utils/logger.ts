import { appendFile } from "node:fs/promises";
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import chalk from 'chalk';
import { format } from 'date-fns';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const logFolder = resolve(`${__dirname}/logs`);

const colorMap = new Map(
    [
    ['MAIN', 'whiteBright'],
    ['TABLE', 'yellowBright'],
    ['CUP', 'blueBright'],
    ['BOT', 'green'],
])

export const log = (string: string) : string => {
    const now = new Date();
    const dateString = format(now, 'yyyy-MM-dd');
    const timeString = format(now, 'HH:mm:ss.SSS');
    const [deviceId, message] = string.split(/^(?<deviceId>[A-Z]+?):/ig).filter(Boolean);
    const chalkColor = colorMap.get(deviceId) || 'white';
    console.log(`${chalk[chalkColor](deviceId)} ${message}`);
    appendFile(`${logFolder}/${dateString}.log`, `[${timeString}] ${deviceId} : ${message}\r\n`, 'utf8');
    return string
}