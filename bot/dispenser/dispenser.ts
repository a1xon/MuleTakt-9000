import {Drink} from "../../drink/drink"

export interface Dispenser {
    acceptTask : (current : Drink | undefined, next: Drink | undefined) => Promise<boolean | Error>;
    headsUp : (drink: Drink) => Promise<boolean | Error>;
    selfTest : () => Promise<boolean | Error>;
}