// eslint-disable-next-line import/no-cycle
import { DGCollection } from "./dg-collection"

export interface DGDataContextAPI {
  getCollectionForAttribute: (attrId: string) => DGCollection | undefined
  getCollectionForCase: (caseId: string) => DGCollection | undefined
}
