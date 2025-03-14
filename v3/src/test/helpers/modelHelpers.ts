/**
 * Model Test Helpers
 * 
 * This file contains utilities for testing MST models.
 */

import { types, IAnyModelType, IStateTreeNode, getSnapshot, applySnapshot, flow } from 'mobx-state-tree';
import { waitForReactions } from '../mobx/mobxTestSetup';

/**
 * Create a model instance with the given properties
 * 
 * @param modelType - The MST model type to create
 * @param props - The properties to initialize the model with
 * @returns A model instance
 */
export function createModelInstance<T extends IAnyModelType>(
  modelType: T,
  props: any = {}
): IStateTreeNode {
  return modelType.create(props);
}

/**
 * Apply a partial snapshot to a model and wait for reactions to complete
 * 
 * @param model - The model to update
 * @param snapshot - The partial snapshot to apply
 * @returns A promise that resolves when all reactions have completed
 */
export async function updateModel(
  model: IStateTreeNode,
  snapshot: Partial<any>
): Promise<void> {
  // Get the current snapshot
  const currentSnapshot = getSnapshot(model);
  
  // Apply the new snapshot (merged with the current snapshot)
  applySnapshot(model, {
    ...currentSnapshot,
    ...snapshot
  });
  
  // Wait for all reactions to complete
  await waitForReactions();
}

/**
 * Create a model with a specific action that can be used to test action effects
 * 
 * @param actionName - The name of the action to create
 * @param actionImplementation - The implementation of the action
 * @returns A model type with the specified action
 */
export function createModelWithAction<T extends (...args: any[]) => any>(
  actionName: string,
  actionImplementation: T
): {
  modelType: IAnyModelType;
  create: (props?: any) => IStateTreeNode & { [key: string]: T };
} {
  // Create a model type with the specified action
  const ModelType = types
    .model(`ModelWith${actionName}`, {})
    .actions(self => {
      const actions: Record<string, any> = {};
      actions[actionName] = actionImplementation;
      return actions;
    });
  
  return {
    modelType: ModelType,
    create: (props = {}) => ModelType.create(props)
  };
}

/**
 * Create a model with a specific view that can be used to test computed properties
 * 
 * @param viewName - The name of the view to create
 * @param viewImplementation - The implementation of the view
 * @returns A model type with the specified view
 */
export function createModelWithView<T extends () => any>(
  viewName: string,
  viewImplementation: T
): {
  modelType: IAnyModelType;
  create: (props?: any) => IStateTreeNode & { [key: string]: ReturnType<T> };
} {
  // Create a model type with the specified view
  const ModelType = types
    .model(`ModelWith${viewName}`, {})
    .views(self => {
      const views: Record<string, any> = {};
      views[viewName] = viewImplementation;
      return views;
    });
  
  return {
    modelType: ModelType,
    create: (props = {}) => ModelType.create(props)
  };
}

/**
 * Create a model with a volatile state that can be used to test volatile properties
 * 
 * @param volatileName - The name of the volatile property to create
 * @param volatileValue - The value of the volatile property
 * @returns A model type with the specified volatile property
 */
export function createModelWithVolatile<T>(
  volatileName: string,
  volatileValue: T
): {
  modelType: IAnyModelType;
  create: (props?: any) => IStateTreeNode & { [key: string]: T };
} {
  // Create a model type with the specified volatile property
  const ModelType = types
    .model(`ModelWith${volatileName}`, {})
    .volatile(() => {
      const volatileProps: Record<string, any> = {};
      volatileProps[volatileName] = volatileValue;
      return volatileProps;
    });
  
  return {
    modelType: ModelType,
    create: (props = {}) => ModelType.create(props)
  };
}

/**
 * Create a model with a flow that can be used to test async actions
 * 
 * @param flowName - The name of the flow to create
 * @param flowImplementation - The implementation of the flow
 * @returns A model type with the specified flow
 */
export function createModelWithFlow<T extends (...args: any[]) => Generator<any, any, any>>(
  flowName: string,
  flowImplementation: T
): {
  modelType: IAnyModelType;
  create: (props?: any) => IStateTreeNode & { [key: string]: (...args: Parameters<T>) => Promise<ReturnType<T>> };
} {
  // Create a model type with the specified flow
  const ModelType = types
    .model(`ModelWith${flowName}`, {})
    .actions(self => {
      const actions: Record<string, any> = {};
      actions[flowName] = flow(flowImplementation);
      return actions;
    });
  
  return {
    modelType: ModelType,
    create: (props = {}) => ModelType.create(props)
  };
}

/**
 * Create a test environment for a model with dependencies
 * 
 * @param modelType - The model type to test
 * @param dependencies - The dependencies to inject
 * @returns An object with the model instance and utilities for testing
 */
export function createTestEnvironment<T extends IAnyModelType>(
  modelType: T,
  dependencies: Record<string, any> = {}
): {
  model: IStateTreeNode;
  dependencies: Record<string, any>;
  updateModel: (snapshot: Partial<any>) => Promise<void>;
  getSnapshot: () => any;
} {
  // Create the model instance with dependencies
  const model = modelType.create({}, dependencies);
  
  return {
    model,
    dependencies,
    updateModel: (snapshot: Partial<any>) => updateModel(model, snapshot),
    getSnapshot: () => getSnapshot(model)
  };
} 