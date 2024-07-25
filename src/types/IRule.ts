import IOperator from "./IOperator";
import IValue from "./IValue";

export default interface IRule{
    type: string
    field: IValue
    expression: IOperator
}