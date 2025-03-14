/**
 * MobX/MST Testing Utilities
 * 
 * This file contains utilities for testing MobX/MST models, including:
 * - Configuration for MobX in test environment
 * - Utilities for handling async reactions
 * - Utilities for tracking model changes
 * - Utilities for snapshot testing
 */

import { configure, reaction, _resetGlobalState, IReactionDisposer, autorun } from 'mobx';
import { getSnapshot, IStateTreeNode, onPatch, IJsonPatch, flow, isStateTreeNode, getType } from 'mobx-state-tree';

// Configure MobX for strict mode in tests
configure({ enforceActions: 'always' });

/**
 * Waits for all MobX reactions to complete
 * @param timeout Maximum time to wait in milliseconds
 * @returns Promise that resolves when all reactions are processed
 */
export const waitForReactions = (timeout = 100): Promise<void> => {
  return new Promise((resolve) => {
    let disposed = false;
    const disposer = reaction(
      () => Date.now(),
      () => {
        if (!disposed) {
          disposed = true;
          disposer();
          resolve();
        }
      }
    );
    
    // Set a timeout to ensure the promise resolves even if no reactions occur
    setTimeout(() => {
      if (!disposed) {
        disposed = true;
        disposer();
        resolve();
      }
    }, timeout);
  });
};

/**
 * Interface for model changes
 */
export interface IModelChange {
  path: string[];
  oldValue: any;
  newValue: any;
}

/**
 * Tracks changes to a model and returns a history of patches
 * @param model The MST model to track
 * @returns Object with patches array and dispose function
 */
export const trackModelChanges = <T extends IStateTreeNode>(model: T) => {
  const patches: any[] = [];
  const disposer = onPatch(model, (patch) => {
    patches.push(patch);
  });
  
  return {
    patches,
    dispose: disposer,
    getLatestPatches: () => [...patches],
    clearPatches: () => {
      patches.length = 0;
    },
    // Add a getChanges method for backward compatibility with tests
    getChanges: () => [...patches]
  };
};

/**
 * Creates a snapshot of the current model state
 * @param model The MST model to snapshot
 * @param excludeProps Optional array of property names to exclude from the snapshot
 * @returns A deep copy of the model state
 */
export const createModelSnapshot = <T extends IStateTreeNode>(
  model: T,
  excludeProps: string[] = []
) => {
  const snapshot = JSON.parse(JSON.stringify(getSnapshot(model)));
  
  // Remove excluded properties
  excludeProps.forEach(prop => {
    delete snapshot[prop];
  });
  
  return snapshot;
};

/**
 * Type for a spy function that tracks calls
 */
export interface SpyFunction<T extends (...args: any[]) => any> {
  (...args: Parameters<T>): ReturnType<T>;
  calls: Array<{
    args: Parameters<T>;
    result?: ReturnType<T>;
    error?: Error;
  }>;
  reset: () => void;
}

/**
 * Creates a spy function that tracks calls to the original function
 * @param originalFn The function to spy on
 * @returns A spy function that tracks calls
 */
export function createSpy<T extends (...args: any[]) => any>(
  originalFn: T
): SpyFunction<T> {
  const calls: Array<{
    args: Parameters<T>;
    result?: ReturnType<T>;
    error?: Error;
  }> = [];

  const spy = ((...args: Parameters<T>): ReturnType<T> => {
    const call: {
      args: Parameters<T>;
      result?: ReturnType<T>;
      error?: Error;
    } = { args };
    calls.push(call);
    
    try {
      const result = originalFn(...args);
      call.result = result;
      return result;
    } catch (error) {
      call.error = error as Error;
      throw error;
    }
  }) as SpyFunction<T>;

  spy.calls = calls;
  spy.reset = () => {
    calls.length = 0;
  };

  return spy;
}

/**
 * Spies on a method of an MST model
 * @param model The MST model containing the method
 * @param methodName The name of the method to spy on
 * @returns The spy function
 */
export function spyOnModelMethod<
  T extends IStateTreeNode,
  K extends keyof T,
  F extends T[K] & ((...args: any[]) => any)
>(model: T, methodName: K): SpyFunction<F> {
  const originalMethod = model[methodName] as F;
  const spy = createSpy(originalMethod.bind(model));
  
  // @ts-ignore - We're deliberately overriding a property
  model[methodName] = spy;
  
  return spy;
}

/**
 * Reset the MobX global state
 * This is useful for cleaning up after tests
 */
export const resetMobXState = (): void => {
  _resetGlobalState();
  
  // Reconfigure MobX with test settings
  configure({
    enforceActions: 'never',
    computedRequiresReaction: false,
    reactionRequiresObservable: false,
    observableRequiresReaction: false,
    disableErrorBoundaries: true
  });
};

/**
 * Setup function to be called in beforeEach for tests that use MobX
 */
export const setupMobXTest = (): void => {
  resetMobXState();
};

/**
 * Cleanup function to be called in afterEach for tests that use MobX
 */
export const cleanupMobXTest = (): void => {
  resetMobXState();
};

/**
 * Utility for testing asynchronous flows in MST models
 * @param flowFn The flow function to test
 * @param args Arguments to pass to the flow function
 * @returns A promise that resolves with the result of the flow
 */
export const testFlow = async <T extends (...args: any[]) => Generator<any, any, any>>(
  flowFn: T,
  ...args: Parameters<T>
): Promise<ReturnType<T>> => {
  // Create a flow from the generator function
  const flowAction = flow(flowFn);
  
  // Execute the flow with the provided arguments
  const result = await flowAction(...args);
  
  // Wait for any reactions triggered by the flow
  await waitForReactions();
  
  return result as ReturnType<T>;
};

/**
 * Utility for simulating time-based operations
 * @param ms The number of milliseconds to advance the timer
 * @returns A promise that resolves after the specified time
 */
export const advanceTime = async (ms: number): Promise<void> => {
  // Use Jest's timer mocks to advance time
  jest.advanceTimersByTime(ms);
  
  // Wait for any reactions triggered by the time advancement
  await waitForReactions();
};

/**
 * Interface for property change tracking
 */
export interface IPropertyChangeTracker<T> {
  dispose: () => void;
  changes: Array<{
    oldValue: T;
    newValue: T;
  }>;
  reset: () => void;
}

/**
 * Tracks changes to a specific property of a model
 * @param model The model containing the property
 * @param propertyName The name of the property to track
 * @returns An object with the changes and a dispose function
 */
export function trackPropertyChanges<T extends IStateTreeNode, K extends keyof T>(
  model: T,
  propertyName: K
): IPropertyChangeTracker<T[K]> {
  const changes: Array<{
    oldValue: T[K];
    newValue: T[K];
  }> = [];
  
  // Keep track of the current value
  let currentValue = model[propertyName];
  
  // Set up a reaction to track changes to the property
  const disposer = reaction(
    () => model[propertyName],
    (newValue) => {
      const oldValue = currentValue;
      currentValue = newValue;
      
      changes.push({
        oldValue,
        newValue
      });
    },
    { fireImmediately: false }
  );
  
  return {
    dispose: disposer,
    changes,
    reset: () => {
      changes.length = 0;
    }
  };
}

/**
 * Utility for testing reactions to specific model changes
 * @param model The model to observe
 * @param selector Function that selects the value to observe
 * @param callback Function to call when the value changes
 * @returns A dispose function to clean up the reaction
 */
export function observeModel<T extends IStateTreeNode, V>(
  model: T,
  selector: (model: T) => V,
  callback: (newValue: V, oldValue: V) => void
): () => void {
  // Keep track of the current value
  let currentValue = selector(model);
  
  return reaction(
    () => selector(model),
    (newValue) => {
      const oldValue = currentValue;
      currentValue = newValue;
      
      callback(newValue, oldValue);
    },
    { fireImmediately: false }
  );
}

/**
 * Utility for validating a model's structure
 * @param model The model to validate
 * @param expectedProperties Array of property names that should exist on the model
 * @returns True if the model has all expected properties, false otherwise
 */
export function validateModelStructure<T extends IStateTreeNode>(
  model: T,
  expectedProperties: string[]
): boolean {
  if (!isStateTreeNode(model)) {
    return false;
  }
  
  const snapshot = getSnapshot(model);
  return expectedProperties.every(prop => prop in snapshot);
} 