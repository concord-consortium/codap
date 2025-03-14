/**
 * MST Model Mocking Utilities
 * 
 * This file contains utilities for mocking MST models in tests.
 */

import { types, IStateTreeNode, IAnyModelType } from 'mobx-state-tree';

/**
 * Create a mock MST model with the specified properties and methods
 * 
 * @param modelName - The name of the model to mock
 * @param mockProperties - An object containing the properties and methods to mock
 * @returns A mock MST model instance
 */
export function mockModel<T extends object>(
  modelName: string,
  mockProperties: T
): T & IStateTreeNode {
  // Create a dynamic model type with the mock properties
  const MockModelType = types
    .model(modelName, {})
    .volatile(() => {
      // Extract methods and non-method properties
      const methods: Record<string, any> = {};
      const volatileProps: Record<string, any> = {};
      
      // Separate methods from other properties
      Object.entries(mockProperties).forEach(([key, value]) => {
        if (typeof value === 'function') {
          methods[key] = value;
        } else {
          volatileProps[key] = value;
        }
      });
      
      return volatileProps;
    })
    .actions((self) => {
      const actions: Record<string, any> = {};
      
      // Add all methods as actions
      Object.entries(mockProperties).forEach(([key, value]) => {
        if (typeof value === 'function') {
          actions[key] = value;
        }
      });
      
      return actions;
    });
  
  // Create and return an instance of the mock model
  return MockModelType.create({}) as T & IStateTreeNode;
}

/**
 * Create a partial mock of an existing MST model type
 * This allows you to override specific properties or methods while keeping the rest of the model intact
 * 
 * @param modelType - The MST model type to partially mock
 * @param initialData - The initial data for the model
 * @param overrides - An object containing properties and methods to override
 * @returns A mock MST model instance
 */
export function partialMockModel<T extends IAnyModelType>(
  modelType: T,
  initialData: any = {},
  overrides: Record<string, any> = {}
): IStateTreeNode {
  // Create an instance of the original model
  const instance = modelType.create(initialData);
  
  // Apply overrides
  Object.entries(overrides).forEach(([key, value]) => {
    if (typeof value === 'function') {
      // For functions, we need to override the action
      const originalAction = (instance as any)[key];
      if (typeof originalAction === 'function') {
        (instance as any)[key] = value;
      }
    } else {
      // For properties, we can just set them
      (instance as any)[key] = value;
    }
  });
  
  return instance;
}

/**
 * Create a stub for an MST model that only implements the specified interface
 * This is useful when you need a minimal implementation that satisfies a type
 * 
 * @param modelName - The name of the model to stub
 * @param stubProperties - An object containing the properties and methods to stub
 * @returns A stub MST model instance
 */
export function stubModel<T extends object>(
  modelName: string,
  stubProperties: Partial<T>
): Partial<T> & IStateTreeNode {
  return mockModel(modelName, stubProperties) as Partial<T> & IStateTreeNode;
}

/**
 * Create a spy on a model method that tracks calls and allows assertions
 * 
 * @param model - The model instance
 * @param methodName - The name of the method to spy on
 * @returns An object with the spy and utilities for assertions
 */
export function spyOnModelMethod(
  model: IStateTreeNode,
  methodName: string
): {
  calls: any[][];
  callCount: number;
  reset: () => void;
} {
  const originalMethod = (model as any)[methodName];
  
  if (typeof originalMethod !== 'function') {
    throw new Error(`Method ${methodName} does not exist or is not a function`);
  }
  
  const calls: any[][] = [];
  
  // Replace the original method with a spy
  (model as any)[methodName] = function(...args: any[]) {
    calls.push([...args]);
    return originalMethod.apply(this, args);
  };
  
  return {
    calls,
    get callCount() {
      return calls.length;
    },
    reset: () => {
      calls.length = 0;
    }
  };
}