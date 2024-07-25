import IField from "./IField";

export default interface IImport {
    type: string,
    import: {
        type: string
        list: IField[]
    }
}