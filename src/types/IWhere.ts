import IRule from "./IRule";

export default interface IWhere {
    type: string
    where: {
        type: string,
        rules: IRule[]
    }
}