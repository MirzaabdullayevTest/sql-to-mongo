import IProgram from "./IProgram";

export default interface IParser{
    parse: (query: string) => IProgram
}