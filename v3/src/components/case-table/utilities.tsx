import { IDataSet } from "../../data-model/data-set"

export const getUniqueAttributeName = (baseName: string, data?: IDataSet) => {
  let attrNum = 0
  let newName = ""
    const attrNameAlreadyExists = data?.attributes.filter(attr=> attr.name.includes(baseName))
    console.log("attrNameAlreadyExists", attrNameAlreadyExists)
    if (attrNameAlreadyExists && attrNameAlreadyExists.length > 0) {
      attrNum = (attrNameAlreadyExists.length + 1)
      console.log("attrNum", attrNum)
      newName = baseName + attrNum.toString()
    } else {
      newName = baseName
    }
    return newName
}
