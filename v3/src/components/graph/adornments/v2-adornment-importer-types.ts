import { IAdornmentsBaseStore, IAdornmentsBaseStoreSnapshot } from "./store/adornments-base-store"

export type AdornmentPostProcessorFn = (store: IAdornmentsBaseStore) => void

export interface IV2AdornmentImporterResult {
  adornmentsStore: IAdornmentsBaseStoreSnapshot
  postProcessors: AdornmentPostProcessorFn[]
}
