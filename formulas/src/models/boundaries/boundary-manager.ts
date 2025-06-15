export interface BoundaryManager {
  hasBoundaryData(name?: string): boolean;
  boundaryKeys: string[];
}
