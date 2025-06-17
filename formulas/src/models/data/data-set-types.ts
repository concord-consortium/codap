export interface IItem {
  __id__: string;
}

export interface ICase extends IItem {}

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
