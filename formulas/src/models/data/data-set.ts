import { IAttribute } from "./attribute";
import { IValueType } from "./attribute-types";

interface ICollection {
  id: string;
  attributes: IAttribute[];
}

interface ICollectionModel {
  id: string;
}

interface CaseInfo {
  childItemIds: string[]
}

interface IItem {
  __id__: string;
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
}
