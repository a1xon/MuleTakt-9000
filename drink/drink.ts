export class Process {
    done: boolean;
    quantity: number;
    timingMs: null | number;
    constructor() {
        this.done = false;
        this.quantity = 1;
        this.timingMs = null;
    }
}

export class Drink {
    cup: Process;
    gingerbeer: Process;
    vodka: Process;
    lime: Process;
    ice: Process;
    stirr: Process;

    constructor() {
        this.cup = new Process();
        this.gingerbeer = new Process();
        this.vodka = new Process();
        this.lime = new Process();
        this.ice = new Process();
        this.stirr = new Process();
    }
}

