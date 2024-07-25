// const query = 'import * as Domain from "../../domain"'
// const query = 'import {Entity} from "../../domain/entity"'
// const query = 'import {Entity, SecondEntity} from "../../domain/entity"'
// const query = 'import {Entity as SomeEntity} from "../../domain/entity"'
const query = 'import {Entity, SecondEntity as SomeEntity} from "../../domain/entity"'
import Bridge from "./modules/Bridge";

(async function (){
    try {
        const bridge = new Bridge()
        const result = await bridge.query(query)
    }catch (err){
        console.error(err)
        process.exit(1)
    }
})()