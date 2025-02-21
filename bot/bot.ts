import { Gpio as GPIO } from 'pigpio';
import { Table } from "./table"
import { Dispenser } from "./dispenser/dispenser"
import { Drink } from "../drink/drink"
import { log } from "../utils/logger"

import { Cup } from "./dispenser/cup";

export const GPIO_MAP = {
    TABLE: {
        ENDSTOP: new GPIO(6, { mode: GPIO.INPUT, alert: true }).glitchFilter(1000),
        STEP: new GPIO(13, { mode: GPIO.OUTPUT }),
        ENABLE: new GPIO(19, { mode: GPIO.OUTPUT }),
        DIRECTION: new GPIO(26, { mode: GPIO.OUTPUT }),
    },
    CUP: {
        SERVO: new GPIO(10, { mode: GPIO.OUTPUT }),
        DETECTOR: new GPIO(9, { mode: GPIO.INPUT, pullUpDown: GPIO.PUD_UP, alert: true }).glitchFilter(1000)
    }
}

export class Bot {
    table: Table;
    queue: Drink[] = [];
    dispensers: Dispenser[];
    active: Boolean = false;
    constructor() {
        log('BOT: initialize');
        this.table = new Table(GPIO_MAP.TABLE);
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

    async run(): Promise<Boolean | Error> {
        this.active = true;
        log(`BOT: Starting to run`);

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
                // return Error(err);
            }
            try {
                await this.table.turn();
            } catch (err) {
                log(`BOT: ${err}`);
            }
        }

        this.active = false;
        log(`BOT: No active drinks anymore and stopping`);
        return true;
    }

    async selfTest(): Promise<Boolean | Error> {
        log(`BOT: Start Self Test`);
        await this.table.selfTest();
        for (const dispenser of this.dispensers) {
            await dispenser.selfTest();
        }
        return true;
    };
}