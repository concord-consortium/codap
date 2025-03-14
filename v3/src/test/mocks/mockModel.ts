import { types, IModelType, IStateTreeNode, Instance } from 'mobx-state-tree';

/**
 * Creates a mock MST model with the specified properties and methods
 * @param properties Object containing property definitions
 * @param methods Object containing method implementations
 * @returns A model instance with the specified properties and methods
 */
export function mockModel<P extends Record<string, any>, M extends Record<string, Function>>(
  properties: P,
  methods: M = {} as M
): P & M {
  // Create a model type with the specified properties
  const modelProperties: Record<string, any> = {};
  
  // Convert each property to an appropriate MST type
  Object.entries(properties).forEach(([key, value]) => {
    if (typeof value === 'string') {
      modelProperties[key] = types.optional(types.string, value);
    } else if (typeof value === 'number') {
      modelProperties[key] = types.optional(types.number, value);
    } else if (typeof value === 'boolean') {
      modelProperties[key] = types.optional(types.boolean, value);
    } else if (Array.isArray(value)) {
      modelProperties[key] = types.optional(types.array(types.frozen()), value);
    } else if (value === null) {
      modelProperties[key] = types.maybeNull(types.frozen());
    } else if (value === undefined) {
      modelProperties[key] = types.optional(types.frozen(), {});
    } else if (typeof value === 'object') {
      modelProperties[key] = types.optional(types.frozen(), value);
    } else {
      modelProperties[key] = types.optional(types.frozen(), value);
    }
  });
  
  // Create the model type
  const MockModel = types
    .model('MockModel', modelProperties)
    .actions((self) => {
      const actions: Record<string, Function> = {};
      
      // Add each method to the actions
      Object.entries(methods).forEach(([key, method]) => {
        actions[key] = function(...args: any[]) {
          return method.apply(self, args);
        };
      });
      
      return actions;
    });
  
  // Create and return an instance of the model
  return MockModel.create(properties) as unknown as P & M;
}

/**
 * Creates a partial mock of an existing MST model type
 * @param modelType The MST model type to partially mock
 * @param properties Properties to override in the mock
 * @param methods Methods to override in the mock
 * @returns An instance of the model with overridden properties and methods
 */
export function partialMockModel<
  MT extends IModelType<any, any>,
  P extends Partial<Instance<MT>>,
  M extends Record<string, Function>
>(
  modelType: MT,
  properties: P,
  methods: M = {} as M
): Instance<MT> & M {
  // Create default properties based on the model's property types
  const defaultProps = {};
  
  // Create an instance with the provided properties
  const instance = modelType.create(properties as any) as Instance<MT>;
  
  // Add mock methods
  Object.entries(methods).forEach(([key, method]) => {
    // @ts-ignore - We're deliberately overriding methods
    instance[key] = function(...args: any[]) {
      return method.apply(instance, args);
    };
  });
  
  return instance as Instance<MT> & M;
} 