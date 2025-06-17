export interface BoundaryManager {
  isBoundarySet(name?: string): boolean;
  hasBoundaryDataError(name?: string): boolean;
  isBoundaryDataPending(name?: string): boolean;
  hasBoundaryData(name?: string): boolean;
  boundaryKeys: string[];
  getBoundaryData(boundarySet: string, boundaryKey: string): unknown | undefined;
  boundariesLoaded: boolean;
}

// TODO: we need to provide an global implementation of the boundary manager to the formula manager
// For now we just provide a dummy implementation
export const boundaryManager: BoundaryManager = {
  isBoundarySet: () => false,
  hasBoundaryDataError: () => false,
  isBoundaryDataPending: () => false,
  hasBoundaryData: () => false,
  boundaryKeys: [],
  getBoundaryData: () => undefined,
  boundariesLoaded: false
}
