import IBridge from "../types/IBridge";
import Parser from "./Parser";
import util from "node:util"
import IValue from "../types/IValue";
import ISelect from "../types/IImport";
import IFrom from "../types/IFrom";
import IWhere from "../types/IWhere";

export default class Bridge implements IBridge{

    public async query(queryStr: string){
        const parser = new Parser()
        const ast = parser.parse(queryStr)

        console.log(util.inspect(ast, false, null, true))

        // const query = this.converter(ast)

        // console.log(query)

    }

    private converter(ast): string{
        const list = ast.body.list
        const query = {find: null, collection: null}

        let  i = 0

        while (i < list.length){
            const exp = list[i]
            const queryItem = this.switchExp(exp)

            if(queryItem.type === 'find'){
                query.find = queryItem.text
            }else if(queryItem.type === 'collection'){
                query.collection = queryItem.text
            }

            if(queryItem.type === 'operator'){
                let i = 0
                let opr = ''
                while (i < queryItem.text.length){
                    opr = opr + ',' + queryItem.text[i]
                    i++
                }

                opr = opr.slice(1)

                query.find = `${opr}`  + ',' + query.find
            }

            i++
        }

        return `db.getCollection("${query.collection}").find(${query.find})`
    }

    private switchExp(exp: ISelect | IFrom | IWhere){
        switch (exp.type){
            case 'selectExp':
               return this.selectCase(exp)
            case 'fromExp':
                return this.fromCase(exp)
            case 'whereExp':
                return this.whereCase(exp)
        }
    }

    private whereCase(exp){
        const rules = exp.where.rules
        const operators = []

        let i = 0

        while (i < rules.length){
            const rule = rules[i]

            if(rule.type === 'or'){
                let or = {'$or': []}
                const rules = rule.rules
                let j = 0
                while (j < rules.length){
                    const {field, expression} = rules[j]
                    const text = field.text

                    switch (expression.type){
                        case 'equal':
                            or.$or.push(this.caseOperators(text, '$eq', expression.value.text))
                            break
                        case 'greaterThan':
                            or.$or.push(this.caseOperators(text, '$gt', expression.value.text))
                            break
                        case 'greaterThanOrEqual':
                            or.$or.push(this.caseOperators(text, '$gte', expression.value.text))
                            break
                        case 'lessThan':
                            or.$or.push(this.caseOperators(text, '$lt', expression.value.text))
                            break
                        case 'lessThanOrEqual':
                            or.$or.push(this.caseOperators(text, '$lte', expression.value.text))
                            break
                        case 'notEqual':
                            or.$or.push(this.caseOperators(text, '$ne', expression.value.text))
                            break
                    }

                    j++
                }

                operators.push(JSON.stringify(or))
                i++
                continue
            }

            const {field, expression} = rule
            const text = field.text

            switch (expression.type){
                case 'equal':
                    operators.push(this.caseOperators(text, '$eq', expression.value.text))
                    break
                case 'greaterThan':
                    operators.push(this.caseOperators(text, '$gt', expression.value.text))
                    break
                case 'greaterThanOrEqual':
                    operators.push(this.caseOperators(text, '$gte', expression.value.text))
                    break
                case 'lessThan':
                    operators.push(this.caseOperators(text, '$lt', expression.value.text))
                    break
                case 'lessThanOrEqual':
                    operators.push(this.caseOperators(text, '$lte', expression.value.text))
                    break
                case 'notEqual':
                    operators.push(this.caseOperators(text, '$ne', expression.value.text))
                    break
            }

            i++
        }

        return {type: 'operator', text: operators }
    }

    private caseOperators(text: string, operator: string, val: string): string{
        let value = `{'${text}': {'${operator}': ${val}}}`
        return value
    }

    private fromCase(exp): IValue{
        const words = exp.from.words
        let text = words.text

        if(words.property !== null){
            text += '.' + words.property.text
        }

        return {type: 'collection', text}
    }

    private selectCase(exp): IValue{
        const fieldList = exp.select.list
        let i = 0
        let find = ''

        while (i < fieldList.length){
            const field = fieldList[i]

            if(field.type === 'separator'){
                find = ''
            }

            if(field.type === 'field'){
                find = find + ', ' + field.name.text
            }

            i++
        }

        let text = find.slice(1)

        return {type: 'find', text:`{${text}}`}
    }
}
