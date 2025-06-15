interface IAttribute {
  id: string;
  name: string;
}
interface ICollection {
  id: string;
  attributes: IAttribute[];
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
}
