import { ISerializedActionCall } from "mobx-state-tree"
import { IAddCaseOptions, ICase } from "./data-set"

// TODO: define the types for the rest of the actions

export interface AddCasesAction extends ISerializedActionCall {
  name: "addCases"
  args: [ICase[], IAddCaseOptions | undefined]
}

export interface SetCaseValuesAction extends ISerializedActionCall {
  name: "setCaseValues"
  args: [ICase[]]
}

export interface RemoveCasesAction extends ISerializedActionCall {
  name: "removeCases"
  args: [string[]]
}

export const isSetCaseValuesAction = (action: ISerializedActionCall): action is SetCaseValuesAction =>
              action.name === "setCaseValues"

export interface SelectAllAction extends ISerializedActionCall {
  name: "selectAll"
  args: [boolean]
}

export interface SelectCasesAction extends ISerializedActionCall {
  name: "selectCases"
  args: [string[], boolean]
}

export interface SetSelectedCasesAction extends ISerializedActionCall {
  name: "setSelectedCases"
  args: [string[]]
}

export type SelectionAction = SelectAllAction | SelectCasesAction | SetSelectedCasesAction

export const isSelectionAction = (action: ISerializedActionCall): action is SelectionAction =>
              ["selectAll", "selectCases", "setSelectedCases"].includes(action.name)
