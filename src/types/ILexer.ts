import IToken from "./IToken";

export default interface ILexer{
    init: (string: string) => void
    getNextToken: () => IToken
}