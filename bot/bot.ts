import { Gpio as GPIO } from 'pigpio';
import { Table } from "./table"
import { Dispenser } from "./dispenser/dispenser"
import { Drink } from "../drink/drink"
import { log } from "../utils/logger"

import { Cup } from "./dispenser/cup";

const GPIO_MAP = {
    TABLE: {
        ENDSTOP: new GPIO(27, { mode: GPIO.INPUT, pullUpDown: GPIO.PUD_UP, alert: true }).glitchFilter(10000)
    },
    CUP: {
        SERVO: new GPIO(4, { mode: GPIO.OUTPUT }),
        DETECTOR: new GPIO(17, { mode: GPIO.INPUT, pullUpDown: GPIO.PUD_UP, alert: true }).glitchFilter(10000)
    }
}


export class Bot {
    table: Table;
    queue: Drink[] = [];
    dispensers: Dispenser[];
    active: Boolean = false;
    constructor() {
        log('BOT: initialize');
        this.table = new Table({ endstop: GPIO_MAP.TABLE.ENDSTOP });
        this.dispensers = [
            new Cup({ servo: GPIO_MAP.CUP.SERVO, detector: GPIO_MAP.CUP.DETECTOR })
        ]
    };

    acceptDrink() {
        log('BOT: drink requested');
        this.queue.push(new Drink());
        if (!this.active) {
            this.run();
        }
    };

    async run() {
        this.active = true;

        while (this.table.positions.some(Boolean) || this.queue.length > 0) {
            if (this.queue.length > 0) {
                this.table.positions.unshift(this.queue.pop());
            }

            const duties = [];
            for (const [index, dispenser] of this.dispensers.entries()) {
                duties.push(dispenser.acceptTask(this.table.positions[index], this.table.positions[index - 1]));
            }
            try {
                await Promise.all(duties);
            } catch (err) {
                log(`BOT: ${err}`);
            }
            await this.table.turn(1);
        }

        this.active = false;
        log(`BOT: No active drinks anymore`);
    }
}