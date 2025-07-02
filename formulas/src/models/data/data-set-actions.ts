import { ICase } from "./data-set-types"

export interface SetCaseValuesAction {
  name: "setCaseValues"
  args: [ICase[], string[]]
}
