/**
 * MobX/MST Testing Utilities
 * 
 * This file contains utilities for testing MobX/MST models, including:
 * - Configuration for MobX in test environment
 * - Utilities for handling async reactions
 * - Utilities for tracking model changes
 * - Utilities for snapshot testing
 */

import { configure, reaction, _resetGlobalState } from 'mobx';
import { getSnapshot, IStateTreeNode, onPatch, IJsonPatch } from 'mobx-state-tree';
import { IReactionDisposer } from 'mobx';

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
    }
  };
};

/**
 * Creates a snapshot of the current model state
 * @param model The MST model to snapshot
 * @returns A deep copy of the model state
 */
export const createModelSnapshot = <T extends IStateTreeNode>(model: T) => {
  return JSON.parse(JSON.stringify(getSnapshot(model)));
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