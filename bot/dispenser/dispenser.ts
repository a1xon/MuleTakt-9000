import {Drink} from "../../drink/drink"

export interface Dispenser {
    acceptTask : (current : Drink, next: Drink) => Promise<boolean | Error>;
    headsUp : (drink: Drink) => Promise<boolean | Error>;
    selfTest : () => Promise<boolean | Error>;
}