export interface BoundaryManager {
  isBoundarySet(name?: string): boolean;
  hasBoundaryDataError(name?: string): boolean;
  isBoundaryDataPending(name?: string): boolean;
  hasBoundaryData(name?: string): boolean;
  boundaryKeys: string[];
  getBoundaryData(boundarySet: string, boundaryKey: string): unknown | undefined;
}
