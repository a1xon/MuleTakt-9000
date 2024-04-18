import { Drink } from "../drink/drink"
import { Gpio as GPIO } from 'pigpio';
import { log } from "../utils/logger"
import { clearTimeout, setTimeout } from "node:timers";

const ACCELERATE_STEPS = 100;
const ACCELERATE_MIN_MS = 200;
const SPEED_MS = 10;

const TIMEOUT_SINGLE_STEP = 5_000;

enum DIRECTION {
    CW,
    CCW
}

export class Table {
    positions: Drink[] = Array.from({ length: 10 }, () => undefined);
    turning: boolean;
    endstop: GPIO;
    stepPin: GPIO;
    directionPin: GPIO;
    constructor(gpioObject: { endstop: GPIO }) {
        Object.assign(this, gpioObject);
    }

    async turn(slotsToTurn: number = 1, direction: DIRECTION = DIRECTION.CCW): Promise<boolean | Error> {
        
        if (this.turning) {
            log(`TABLE: still turning`);
            return Error(`still turning`);
        } else {
            log(`TABLE: turn ${slotsToTurn} slot${slotsToTurn > 1 ? 's' : ''}`);
        }

        this.turning = true;

        return new Promise((resolve, reject) => {

            const timeout = setTimeout(() => {
                log(`TABLE: timeout while turning`);
                reject(Error(`timeout while turning`));
            }, TIMEOUT_SINGLE_STEP);


            const alertHandler = (endstopLevel: 0 | 1) => {
                if (endstopLevel === 1) {
                    slotsToTurn--;
                    log(`TABLE:  slots to go ${slotsToTurn}`);
                    this.positions.pop();
                    this.positions.unshift(undefined);

                    // reset timeout for possible next turns
                    timeout.refresh();

                    if (slotsToTurn === 0) {
                        clearTimeout(timeout);
                        log(`TABLE: reached requested slot`);
                        this.endstop.removeListener('alert', alertHandler);
                        this.turning = false;
                        resolve(true);
                    }
                }
            };

            this.endstop.addListener('alert', alertHandler);
        });
    };

    async selfTest(): Promise<boolean | Error> {
        log(`TABLE: start self test`)
        const testTurns : number = 3;
        for (const direction of [DIRECTION.CCW, DIRECTION.CW]) {
            try {
                log(`TABLE: spinning ${testTurns} ${direction}`);
                await this.turn(testTurns, direction);
            } catch (err) {
                log(`TABLE: error while self testing ${direction}`);
                return Error(err);
            }
        }
        return true;
    };
};