// eslint-disable-next-line import-x/no-cycle
import { DGCollection } from "./dg-collection"

export interface DGDataContextAPI {
  getCollectionForAttribute: (attrId: string) => DGCollection | undefined
  getCollectionForCase: (caseId: string) => DGCollection | undefined
}
