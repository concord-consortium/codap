interface IGlobalValue {
  value: number;
  name: string;
  id: string;
}

export interface IGlobalValueManager {
  getValueById(id: string): IGlobalValue | undefined;
  globals: Map<string, IGlobalValue>;
}
