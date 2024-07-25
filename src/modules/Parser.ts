import IParser from "../types/IParser";
import IProgram from "../types/IProgram";
import IToken from "../types/IToken";
import ILexer from "../types/ILexer";
import Lexer from "./Lexer";
import IValue from "../types/IValue";
import IOperator from "../types/IOperator";
import IRule from "../types/IRule";
import IWhere from "../types/IWhere";
import IField from "../types/IField";
import IFrom from "../types/IFrom";
import IOr from "../types/IOr";
import IImport from "../types/IImport";

export default class Parser implements IParser{
    private lexer: ILexer
    private currentToken: IToken
    private query: string

    constructor() {
        this.lexer = new Lexer()
    }

    public parse(query: string): IProgram{
        this.query = query
        this.lexer.init(this.query)
        this.currentToken = this.lexer.getNextToken()

        const program = {
            type: 'Program',
            body: {
                type: 'queryList',
                list: []
            }
        }

        while (this.getCurrentToken().value !== 'EOF'){
            const length = program.body.list.length
            const expression = this.parseExpression(length)

            program.body.list.push(expression)
        }

        this.validateAST(program)

        return program
    }

    private validateAST(program): void{
        if (program.body.list.length < 2){
            if (program.body.list[0].type !== 'importExp'){
                throw new SyntaxError(`Not found IMPORT keyword in query in first position "${this.query.slice(0, this.getCurrentToken().pos)}"`)
            }
        }

        if(program.body.list.length < 3){
            if(program.body.list.length !== 2){
                throw new SyntaxError(`Query is not have full information. Maybe FROM not your query`)
            }
            if (program.body.list[1].type !== 'fromExp'){
                throw new SyntaxError(`Not found FROM keyword in query in second position "${this.query.slice(0, this.getCurrentToken().pos)}"`)
            }
        }
    }

    private parseExpression(length: number): IImport | IWhere | IFrom{
        return this.parseTerm(length)
    }

    private parseTerm(length: number): IImport | IWhere | IFrom {
        const exp = this.parseFactor()

        switch (exp.value.toUpperCase()){
            case 'IMPORT':
                if(length !== 0){
                    throw new SyntaxError(`Unexpected token value. Expected: IMPORT`)
                }
                return this.caseImport()
            case 'FROM':
                if(length !== 1){
                    throw new SyntaxError(`Unexpected token value: FROM, expected: SELECT or WHERE`)
                }
                return this.caseFrom()
            case 'WHERE':
                if(length !== 2){
                    throw new SyntaxError(`Unexpected token value: WHERE, expected: SELECT or FROM`)
                }
                return this.caseWhere()
        }

    }

    private caseImport(): IImport{
        const importExp = {type: 'importExp', import: {type: 'fieldList', list: []}}

        if(this.getCurrentToken().value === '*'){
            let operator = {type: 'separator', name: { type: 'operator', text: this.getCurrentToken().value}}

            this.currentToken = this.lexer.getNextToken()

            if(this.getCurrentToken().value === 'as'){
                operator = this.renameWithAs(operator)
                this.currentToken = this.lexer.getNextToken()
            }

            importExp.import.list.push(operator)

            return importExp
        }

        if(this.getCurrentToken().value === '{'){
            this.currentToken = this.lexer.getNextToken()

            while (this.isOperatorOrString()){
                if (this.getCurrentToken().value === '}'){
                    this.currentToken = this.lexer.getNextToken()
                    break
                }

                const listLength = importExp.import.list.length

                // comma validation and get another field if they have
                const anotherField = this.commaValidation(listLength)

                if(anotherField !== null){
                    importExp.import.list.push(anotherField)
                    continue
                }

                // get first string
                if (listLength === 0){
                    let field = this.getFirstFieldToSelect()

                    if(this.getCurrentToken().value === 'as'){
                        field = this.renameWithAs(field)
                        this.currentToken = this.lexer.getNextToken()
                    }

                    importExp.import.list.push(field)

                    continue
                }
            }
        }

        return importExp
    }

    private renameWithAs(operator){
        let opr = {...operator, rename: null}

        this.currentToken = this.lexer.getNextToken()

        opr.rename = { type: 'word', text: this.getCurrentToken().value }

        return opr
    }

    private underScore(): string{
            this.currentToken = this.lexer.getNextToken()

            if(this.getCurrentToken().type === 'string'){
                const value = '_' + this.getCurrentToken().value
                return value
            }
    }

    private commaValidation(listLength: number): IField{
        if(this.getCurrentToken().value === ','){
            // isEmpty
            if(listLength === 0){
                throw new SyntaxError(`Unexpected token in "${this.query.slice(0, this.getCurrentToken().pos)} " this value "${this.getCurrentToken().value}", expected: field`)
            }

            this.currentToken = this.lexer.getNextToken()

            if(this.getCurrentToken().type === 'string'){
                const name = this.getStringField()
                let field = {type: 'field', name: name}

                if(this.getCurrentToken().value === 'as'){
                    field = this.renameWithAs(field)
                    this.currentToken = this.lexer.getNextToken()
                }

                return field
            }

            throw new SyntaxError(`Unexpected token position this value "${this.getCurrentToken().value}" in "${this.query.slice(0, this.getCurrentToken().pos)} ", expected: first ","`)
        }

        return null
    }

    private getFirstFieldToSelect(): IField{

        if (this.getCurrentToken().type === 'string'){
            const name = this.getStringField()
            const field = {type: 'field', name: name}

            return field
        }

        throw new SyntaxError(`Unexpected token in "${this.query.slice(0, this.getCurrentToken().pos)} " this value "${this.getCurrentToken().value}", expected: ","`)
    }

    private getStringField(): IValue{
        const value = this.getCurrentToken().value

        this.currentToken = this.lexer.getNextToken()

        if(this.getCurrentToken().value === '_'){
            const underScore = this.underScore()

            this.currentToken = this.lexer.getNextToken()
            return { type: 'word', text: value + underScore}
        }

        return{ type: 'word', text: value}
    }

    private caseFrom(): IFrom{
        const fromExp = {type: 'fromExp', from: {type: 'path', text: ''}}
        while (this.isOperatorOrString()){
            if(this.getCurrentToken().value === '"' || this.getCurrentToken().value === '`' || this.getCurrentToken().value === "'"){
                let path = ''

                while (this.isOperatorOrString()){
                    path += this.getCurrentToken().value
                    this.currentToken = this.lexer.getNextToken()
                }

                fromExp.from.text = path
                continue
            }

            throw new SyntaxError(`Unexpected token position this value "${this.getCurrentToken().value}" in "${this.query.slice(0, this.getCurrentToken().pos)} ", expected: string field`)
        }

        return fromExp
    }

    private caseWhere(): IWhere{
        const whereExp = {type: 'whereExp', where: {type: 'whereRules', rules: []}}

        while (this.isOperatorOrString()){
            const rule = this.ruleGeneratorForWhere()

            if(this.getCurrentToken().value === 'or'){
                const or = this.orExpression(rule)

                whereExp.where.rules.push(or)
            }else {
                whereExp.where.rules.push(rule)
            }

            while (this.getCurrentToken().type === 'keyword'){
                if(this.getCurrentToken().value === 'and'){
                    this.currentToken = this.lexer.getNextToken()

                    const rule = this.ruleGeneratorForWhere()
                    whereExp.where.rules.push(rule)
                }
            }
        }

        return whereExp
    }

    private orExpression(rule: IRule): IOr{
        const or = {
            type: 'or',
            rules: [rule]
        }

        this.currentToken = this.lexer.getNextToken()

        const orRule = this.ruleGeneratorForWhere()

        or.rules.push(orRule)

        return or
    }

    private ruleGeneratorForWhere(): IRule{
        const rule: IRule = {type: 'rule', field: null, expression: null}

        if(this.getCurrentToken().type === 'string'){
            rule.field = this.getStringField()
        }

        const expression = this.switchOperators()

        if(expression === null){
            throw new SyntaxError(`Unexpected token position this value "${this.getCurrentToken().value}" in "${this.query.slice(0, this.getCurrentToken().pos)} ", expected: operator`)
        }

        rule.expression = expression

        return rule
    }

    private isOperatorOrString(): boolean{
        return  this.getCurrentToken().type === 'operator' || this.getCurrentToken().type === 'string'
    }

    private switchOperators(): IOperator{
        let expression = null

        switch (this.getCurrentToken().value){
            case '=':
                expression = this.operator('equal')
                break
            case '>':
                expression = this.operator('greaterThan')
                break
            case '<':
                expression = this.operator('lessThan')
                break
            case '!':
                expression = this.operator('not')
                break
        }

        return expression
    }

    private operator(exp: string): IOperator{
        const expression: IOperator = {type: exp, value: null}

        this.currentToken = this.lexer.getNextToken()

        // notEqual
        if(exp === 'not'){
            this.isEqual()
            expression.type = exp + 'Equal'
            this.currentToken = this.lexer.getNextToken()
        }

        // greaterThanOrEqual or lessThanOrEqual
        if(this.getCurrentToken().value === '='){
            if(exp === 'greaterThan' || exp === 'lessThan'){
                expression.type = exp + 'OrEqual'
                this.currentToken = this.lexer.getNextToken()
            }else {
                throw new SyntaxError(`Unexpected token position this value "${this.getCurrentToken().value}" in "${this.query.slice(0, this.getCurrentToken().pos)} ", expected: greaterThan or lessThan`)
            }
        }

        const {text, type} = this.loopDigitsAndOperators(exp)

        expression.value = {type: type + 'Literal', text}

        return expression
    }

    private isEqual(): void{
        if(this.getCurrentToken().value !== '='){
            throw new SyntaxError(`Unexpected token position this value "${this.getCurrentToken().value}" in "${this.query.slice(0, this.getCurrentToken().pos)} ", expected: "="`)
        }
    }

    private loopDigitsAndOperators(exp: string): IValue{
        let text = ''
        let type = ''

        while (this.getCurrentToken().type === 'operator' || this.getCurrentToken().type === 'number' || this.getCurrentToken().type === 'string'){
            if(this.getCurrentToken().value === "'" || this.getCurrentToken().value === '"' || this.getCurrentToken().value === '`'){
                type = 'string'
                text += this.getCurrentToken().value
                this.currentToken = this.lexer.getNextToken()
                continue
            }

            if (this.getCurrentToken().type === 'number'){
                type = this.getCurrentToken().type
                text += this.getCurrentToken().value
                this.currentToken = this.lexer.getNextToken()
                continue
            }

            if (this.getCurrentToken().type === 'string'){
                if(exp === 'greaterThan' || exp === 'lessThan'){
                    throw new SyntaxError(`Unexpected token position this value "${this.getCurrentToken().value}" in "${this.query.slice(0, this.getCurrentToken().pos)} ", expected: first "=" or number`)
                }

                type = this.getCurrentToken().type
                text += this.getCurrentToken().value
                this.currentToken = this.lexer.getNextToken()
                continue
            }

            throw new SyntaxError(`Unexpected token position this value "${this.getCurrentToken().value}" in "${this.query.slice(0, this.getCurrentToken().pos)} ", expected: first ","`)
        }

        return {text, type}
    }

    private parseFactor(): IToken{
        return this.eat('keyword')
    }

    private getCurrentToken(): IToken{
        return this.currentToken
    }

    private eat(tokenType: string): IToken{
        const token = this.getCurrentToken()

        if(token === null){
            throw new SyntaxError(`Unexpected token, expected: ${tokenType}`)
        }

        if(token.type !== tokenType){
            throw new SyntaxError(`Unexpected token type ${token.type} ${token.value}, expected: ${tokenType}`)
        }

        this.currentToken = this.lexer.getNextToken()

        return token
    }
}
