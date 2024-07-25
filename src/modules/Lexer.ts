import ILexer from "../types/ILexer";
import IToken from "../types/IToken";

export default class Lexer implements ILexer{
    private string: string
    private pos: number
    private keywords: string[]

    constructor() {
        this.keywords = ['IMPORT', 'SELECT', 'FROM', "WHERE", 'AND', 'OR', 'AS'] // keywords must be Uppercase!
        this.pos = 0
    }

    public init(str: string): void {
        this.string = str
    }

    private getChar(): string{
        if(this.isEOF(this.string[this.pos])){
            return 'EOF'
        }
        return this.string[this.pos]
    }

    public getNextToken(): IToken {
        // EOF
        if(this.getChar() === 'EOF'){
            return {value: 'EOF', pos: this.pos + 1, type: 'EOF'}
        }

        // Operator
        if (this.isOperator(this.getChar())){
            const operator = this.getChar()
            this.pos += 1
            return {value: operator, pos: this.pos, type: 'operator'}
        }

        // Space ignoring
        if(this.getChar() === ' '){
            this.pos += 1
            return this.getNextToken()
        }

        // String or Keyword
        if(this.isString(this.getChar())){
            let str = ''

            while (this.isString(this.getChar())){
                str += this.getChar()
                this.pos += 1

                if(this.pos === this.string.length){
                    break
                }
            }

            if(this.isKeyword(str)){
                return  {value: str, pos: this.pos, type: 'keyword'}
            }

            return  {value: str, pos: this.pos, type: 'string'}
        }

        // Number
        if(this.isNumber(this.getChar())){
            let num = ''

            while (this.isNumber(this.getChar())){
                num += this.getChar()
                this.pos += 1

                if(this.pos === this.string.length){
                    break
                }
            }

            return  {value: num, pos: this.pos, type: 'number'}
        }

        throw new SyntaxError(`Syntax Error in this position ${this.pos} with this symbol ${this.getChar()}`)
    }

    private isNumber(char: string): boolean{
        return 48 <= char.charCodeAt(0) && char.charCodeAt(0) <= 57
    }

    private isEOF(char: string): boolean{
        return char === undefined
    }

    private isKeyword(string: string): boolean{
        return this.keywords.includes(string.toUpperCase())
    }

    private isOperator(char: string): boolean{
       return 33 <= char.charCodeAt(0) && char.charCodeAt(0) <= 47 || 58 <= char.charCodeAt(0) && char.charCodeAt(0) <= 64 || 91 <= char.charCodeAt(0) && char.charCodeAt(0) <= 96 || 123 <= char.charCodeAt(0) && char.charCodeAt(0) <= 127
    }

    private isString(char: string): boolean{
       return 97 <= char.toLowerCase().charCodeAt(0) && char.toLowerCase().charCodeAt(0) <= 122
    }
}