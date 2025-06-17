import { IFormula } from "../formula/formula";
import { IAttribute } from "./attribute";
import { IValueType } from "./attribute-types";
import { ICollection } from "./collection";
import { CaseInfo, ICase, IGroupedCase, IItem } from "./data-set-types";

interface ICollectionModel {
  id: string;
}

export interface IDataSet {
  id: string;
  title: string;
  itemIdsHash: unknown;
  attrNameMap: {
    toJSON(): any;
  }
  collections: ICollection[];
  attributes: IAttribute[];
  getValue(itemId: string, attrId: string): IValueType;
  attrFromID(attrId: string): IAttribute | undefined;
  validateCases(): void;
  getAttribute(id: string): IAttribute | undefined;
  getCollectionIndex(collectionId?: string): number;
  getCollectionForAttribute(attributeId: string): ICollectionModel | undefined;
  getCollectionForCase(caseId: string): ICollectionModel | undefined;
  caseInfoMap: Map<string, CaseInfo>;
  getItemIndex(itemId: string): number | undefined;
  getValueAtItemIndex(index: number, attributeID: string): IValueType;
  items: readonly IItem[];
  setCaseValues(cases: ICase[]): void;
  getCasesForAttributes(attributeIds: string[]): IGroupedCase[];
  hasFilterFormula(): boolean;
  updateFilterFormulaResults(filterFormulaResults: { itemId: string, result: boolean }[], options: { replaceAll: boolean }): void;
  itemsNotSetAside: readonly string[];
  getItem(itemId: string): ICase | undefined;
  setFilterFormulaError(error: string): void;
  filterFormula?: IFormula;
}

export interface IDataSetWithFilterFormula extends IDataSet {
  filterFormula: IFormula
}

export function isFilterFormulaDataSet(dataSet?: IDataSet): dataSet is IDataSetWithFilterFormula {
  return !!dataSet?.hasFilterFormula
}
