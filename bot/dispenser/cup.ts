import { Gpio as GPIO } from "pigpio";
import { Drink } from "../../drink/drink";
import { Dispenser } from "./dispenser";
import { log } from "../../utils/logger"
import { sleep } from "../../utils/sleep";


const CYCLE_LENGHT = 700;
const RELEASE_PULSE_WIDTH = 2200;
const ARM_PULSE_WIDTH = 800;

export class Cup implements Dispenser {
    servo: GPIO;
    detector: GPIO;

    constructor(pinObject : {servo: GPIO, detector: GPIO}) {
        const {servo, detector} = pinObject;
        this.servo = servo;
        this.detector = detector;
    };

    acceptTask (current : Drink | undefined, _next: Drink | undefined) : Promise<boolean | Error> {
        // already a (full?) cup in position
        return new Promise(async (resolve, reject) => {
            if (current === undefined) {
                resolve(true);
                return false;
            }

            if (this.detector.digitalRead() === 0) {
                reject(Error(log('CUP: Already a cup in position')));
                return false;
            }
            
            this.detector.once('alert', () => {
                log('CUP: cup registered in position');
                resolve(true);
            });
            
            log('CUP: releasing cup');
            this.servo.servoWrite(RELEASE_PULSE_WIDTH);
            await sleep(CYCLE_LENGHT);
            this.servo.servoWrite(ARM_PULSE_WIDTH);
        });
    }
    
    async selfTest() {
        log('CUP: self-test sequence');
        this.servo.servoWrite(ARM_PULSE_WIDTH);
        await sleep(CYCLE_LENGHT);
        this.servo.servoWrite(RELEASE_PULSE_WIDTH);
        await sleep(CYCLE_LENGHT);
        this.servo.servoWrite(ARM_PULSE_WIDTH);
        await sleep(CYCLE_LENGHT);
        return true;
    }

    async headsUp(_drink : Drink) {
        return true;
    }
}