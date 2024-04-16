import { Drink } from "../drink/drink"
import { Gpio as GPIO } from 'pigpio';
import { log } from "../utils/logger"

const ACCELERATE_STEPS = 100;
const ACCELERATE_MIN_MS = 200;
const SPEED_MS = 10;

export class Table {
    positions: Drink[] = Array.from({length: 10}, () => undefined);
    turning: boolean;
    endstop: GPIO;
    stepPin: GPIO;
    directionPin: GPIO;
    constructor(gpioObject: {endstop: GPIO}) {
        Object.assign(this, gpioObject);
    }

    async turn(slotsToTurn: number) : Promise<boolean> {
        log(`TABLE: turn ${slotsToTurn} slot${slotsToTurn > 1 ? 's' : ''}`);

        return new Promise ((resolve) => {
            const alertHandler = (level) => {
                if (level === 1) {
                    slotsToTurn--;
                    log(`TABLE:  slots to go ${slotsToTurn}`);
                    this.positions.pop();
                    this.positions.unshift(undefined);

                    if (slotsToTurn === 0) {
                        log(`TABLE: reached requested slot`);
                        this.endstop.removeListener('alert', alertHandler);
                        resolve(true);
                    }
                }
            };

            this.endstop.addListener('alert', alertHandler);
        });
    };
};