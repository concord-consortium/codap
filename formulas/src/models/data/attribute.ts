export interface IAttribute {
  id: string;
  name: string;
  title: string;
  strValues: string[]
  // The official return type is number, but in reality it can be undefined
  numValue(index: number): number | undefined
}
