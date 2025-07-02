import { IValueType } from "./attribute-types";

export interface IItemID {
  __id__: string;
}

export interface ICaseID extends IItemID {
}

export interface IItem extends IItemID {
  [key: string]: IValueType;
}
export interface ICase extends IItem {
}

// used in IGroupedCase
export const symParent = Symbol.for("parent")

export interface IGroupedCase extends ICase {
  [symParent]?: string
}
export interface CaseInfo {
  childItemIds: string[]
  groupedCase: IGroupedCase
  childCaseIds?: string[]
}
