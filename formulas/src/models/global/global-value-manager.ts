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

// A function that the host registers which we can use to get the global value manager
let _getGlobalValueManager: ((node: IAnyStateTreeNode) => IGlobalValueManager | undefined) | undefined

// The host can also say it doesn't have a global value manager. In this case we just
// use a default implementation that has no globals.
let _haveGlobalValueManager: boolean | undefined = undefined

// This function should be called by the host application to register a function
// that can be used to get the global value manager.
// The implementation of this function will depend on the host application.
// For example, in CODAP, it might look up the shared model manager from the environment of the node.
// Here, we are just defining the interface for such a function.
export function registerGlobalValueManagerLookupFunction(
  lookupFunction: ((node: IAnyStateTreeNode) => IGlobalValueManager | undefined) | undefined
): void {
  if (lookupFunction) {
    _getGlobalValueManager = lookupFunction;
    _haveGlobalValueManager = true;
  } else {
    _getGlobalValueManager = undefined;
    _haveGlobalValueManager = false;
  }
}

export function getGlobalValueManager(node: IAnyStateTreeNode): IGlobalValueManager {

  if (_haveGlobalValueManager == null) {
    throw new Error("Global value manager has not been registered. Please call registerGlobalValueManagerLookupFunction first.");
  }

  if (_haveGlobalValueManager === false) {
    return {
      getValueById(id: string) { return undefined },
      getValueByName(name: string) { return undefined },
      globals: new Map<string, IGlobalValue>()
    }
  }

  if (!_getGlobalValueManager) {
    throw new Error("Global value manager lookup function is not defined.");
  }

  const globalValueManager = _getGlobalValueManager(node);
  if (!globalValueManager) {
    throw new Error("Global value manager not found for the provided node.");
  }
  return globalValueManager
}
