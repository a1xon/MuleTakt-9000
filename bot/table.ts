import { Drink } from "../drink/drink"
import { Gpio as GPIO } from 'pigpio';
import { log } from "../utils/logger"
import { clearTimeout, setTimeout } from "node:timers";
import { sleep } from "../utils/sleep";
import { setFlagsFromString } from 'v8';
import { runInNewContext } from 'vm';

const START_FREQ = 100; // Starting frequency in Hz
const END_FREQ = 5_000; // Ending frequency in Hz
const ACCELERATION_DURATION = 200;
const DECELERATION_DURATION = 200;
const STEPS_COUNT = 100; // Number of steps for acceleration and deceleration
const DUTY_CYCLE = 500_000; 
const PULSE_WIDTH = 1; // 1 microsecond pulse width

const TEST_TURNS = 3;

const ACCELERATE_STEPS = 100;
const ACCELERATE_MIN_MS = 200;
const SPEED_MS = 10;

const TIMEOUT_SINGLE_STEP = 15_000;

setFlagsFromString('--expose_gc');
const gc = runInNewContext('gc'); // nocommit

export enum ENUM_DIRECTION {
    CW = "CW",
    CCW = "CCW"
}

/**
 * Function to generate an S-curve factor
 * @param t - Current time
 * @param T - Total time
 * @returns A factor to apply to the frequency
 */
const sCurveFactor = (t: number, T: number): number => {
    return t < T / 2
        ? 2 * Math.pow(t / T, 2)
        : 1 - 2 * Math.pow((T - t) / T, 2);
};

export class Table {
    positions: (Drink | undefined)[] = Array.from({ length: 10 }, () => undefined);
    turning: boolean = false;
    stopRequested: boolean = false;
    slotsToTurnLeft: number = 0;
    PINS: { [PIN: string]: GPIO };

    constructor(pinObject: { [PIN: string]: GPIO }) {
        this.PINS = pinObject;
        this.PINS.ENABLE.digitalWrite(1);
    }


    /**
    * Function to set the step pulse frequency using hardware PWM
    * @param frequency - The frequency of the step pulses in Hz
    */
    setStepFrequency(frequency: number) {
        if (frequency === 0) {
            this.PINS.STEP.digitalWrite(0);
        } else {
            this.PINS.STEP.hardwarePwmWrite(Math.round(frequency), DUTY_CYCLE);
        }
    };

    /**
     * Function to accelerate the step signals with an S-curve profile
     * @param stepPin - GPIO pin to set frequency on
     * @param startFreq - The starting frequency of the steps (in Hz)
     * @param endFreq - The ending frequency of the steps (in Hz)
     * @param duration - The duration of acceleration in milliseconds
     */
    async accelerate(startFreq: number, endFreq: number, duration: number, stopRequested: () => boolean) {
        const stepTime = duration / STEPS_COUNT; // Time per step change
        const freqRange = endFreq - startFreq;

        for (let i = 0; i <= STEPS_COUNT; i++) {
            if (stopRequested()) {
                await this.decelerate(startFreq + (i * (freqRange / STEPS_COUNT)), startFreq, duration - (i * stepTime), stopRequested);
                return;
            }
            const currentTime = i * stepTime;
            const factor = sCurveFactor(currentTime, duration);
            const currentFreq = startFreq + factor * freqRange;
            this.setStepFrequency(currentFreq);
            await new Promise(resolve => setTimeout(resolve, stepTime));
        }
    };

    /**
     * Function to decelerate the step signals with an S-curve profile
     * @param step - GPIO pin to set frequency on
     * @param startFreq - The starting frequency of the steps (in Hz)
     * @param endFreq - The ending frequency of the steps (in Hz)
     * @param duration - The duration of deceleration in milliseconds
     */
    async decelerate (startFreq: number, endFreq: number, duration: number, stopRequested: () => boolean) {
        const stepTime = duration / STEPS_COUNT; // Time per step change
        const freqRange = startFreq - endFreq;

        for (let i = 0; i <= STEPS_COUNT; i++) {
            if (stopRequested()) return;
            const currentTime = i * stepTime;
            const factor = sCurveFactor(currentTime, duration);
            const currentFreq = startFreq - factor * freqRange;
            this.setStepFrequency(currentFreq);
            await new Promise(resolve => setTimeout(resolve, stepTime));
        }
        this.setStepFrequency(0); // Stop the motor
    };


    async turn(slotsToTurn: number = 1, direction: ENUM_DIRECTION = ENUM_DIRECTION.CCW): Promise<boolean | Error> {

        if (this.turning) {
            log(`TABLE: still turning`);
            return Error(`still turning`);
        } else {
            log(`TABLE: turn ${slotsToTurn} slot${slotsToTurn > 1 ? 's' : ''}`);
        }

        this.slotsToTurnLeft = slotsToTurn;
        this.turning = true;
        this.stopRequested = false;

        return new Promise((resolve, reject) => {

            const timeout = setTimeout(() => {
                log(`TABLE: timeout while turning`);
                reject(Error(`timeout while turning`));
            }, TIMEOUT_SINGLE_STEP);


            const alertHandler = (endstopLevel: 0 | 1) => {
                if (endstopLevel === 1) {
                    this.slotsToTurnLeft--;
                    log(`TABLE:  slots to go ${this.slotsToTurnLeft}`);
                    this.positions.pop();
                    this.positions.unshift(undefined);

                    // reset timeout for possible next turns
                    timeout.refresh();

                    if (this.slotsToTurnLeft === 0) {
                        clearTimeout(timeout);
                        log(`TABLE: reached requested slot`);
                        this.PINS.ENDSTOP.removeListener('alert', alertHandler);
                        this.turning = false;
                        resolve(true);
                        gc();
                    }
                }
            };

            this.PINS.ENDSTOP.addListener('alert', alertHandler);

            this.run(direction).catch(err => {
                clearTimeout(timeout);
                this.turning = false;
                this.PINS.ENDSTOP.removeListener('alert', alertHandler);
                reject(err);
            });
        });
    };

    async run(direction: ENUM_DIRECTION): Promise<void> {
        this.PINS.ENABLE.digitalWrite(0);
        if (direction === ENUM_DIRECTION.CCW) {
            this.PINS.DIRECTION.digitalWrite(0);
        } else {
            this.PINS.DIRECTION.digitalWrite(1);
        }

        await this.accelerate(START_FREQ, END_FREQ, ACCELERATION_DURATION, () => this.stopRequested);
        if (this.stopRequested) {
            await this.decelerate(END_FREQ, START_FREQ, DECELERATION_DURATION, () => this.stopRequested);
            this.PINS.ENABLE.digitalWrite(1);
            return;
        }

        const stepInterval = 1000 / END_FREQ;

        while (this.slotsToTurnLeft > 0 && !this.stopRequested) {
            this.setStepFrequency(END_FREQ);
            await new Promise(resolve => setTimeout(resolve, stepInterval));
        }

        await this.decelerate(END_FREQ, START_FREQ, DECELERATION_DURATION, () => this.stopRequested);
        this.PINS.ENABLE.digitalWrite(1);
    };

    async selfTest(): Promise<boolean | Error> {
        log(`TABLE: start self test`)
        for (const direction of [ENUM_DIRECTION.CW]) {
            //await this.turn(TEST_TURNS, direction);
            for (let r = 0; r < 2; r++) {
                await sleep(2000);
                await this.turn(4, direction);
            }
            // await this.turn(10, direction);
            // await sleep(2000);
            // try {
            //     log(`TABLE: spinning ${TEST_TURNS} ${direction}`);
            // } catch (err) {
            //     log(`TABLE: error while self testing ${direction} - ${err}`);
            //     return Error(err as string);
            // }
        }
        return true;
    };
};