import { IAnyStateTreeNode } from "mobx-state-tree"

interface IGlobalValue {
  value: number;
  name: string;
  id: string;
}

export interface IGlobalValueManager {
  getValueById(id: string): IGlobalValue | undefined;
  getValueByName(name: string): IGlobalValue | undefined;
  globals: Map<string, IGlobalValue>;
}

export function getGlobalValueManager(node: IAnyStateTreeNode): IGlobalValueManager {
  // FIXME: need to use a registration system
  return {
    getValueById(id: string) { return undefined },
    getValueByName(name: string) { return undefined },
    globals: new Map<string, IGlobalValue>()
  }
}
