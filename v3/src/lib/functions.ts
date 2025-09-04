import _functionCategoryInfoArray from "../assets/json/function-strings.json5"

interface FunctionArgInfo {
  name: string
  type: string
  description: string
  optional?: boolean    // defaults to false (i.e. required)
}
export interface FunctionInfo {
  displayName: string
  description: string
  args: FunctionArgInfo[]
  examples: string[]
}

interface FunctionCategoryInfo {
  category: string
  displayName: string
  functions: FunctionInfo[]
}

export const functionCategoryInfoArray: FunctionCategoryInfo[] = _functionCategoryInfoArray
