import _functionCategoryInfoArray from "../assets/json/function-strings.json5"

interface FunctionArgInfo {
  description: string
  name: string
  optional?: boolean    // defaults to false (i.e. required)
  type: string
}
export interface FunctionInfo {
  args: FunctionArgInfo[]
  description: string
  displayName: string
  examples: string[]
  maxArgs?: number
  minArgs?: number
}

interface FunctionCategoryInfo {
  category: string
  displayName: string
  functions: FunctionInfo[]
}

export const functionCategoryInfoArray: FunctionCategoryInfo[] = _functionCategoryInfoArray
