import ISelect from "./IImport";

export default interface IProgram{
    type: string,
    body: {
        type: string,
        list: any[]
    }
}