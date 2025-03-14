# Testing Utilities for CODAP v3

This document describes the testing utilities available in the CODAP v3 codebase.

## MobX Testing Utilities

Located in `src/test/mobx/mobxTestSetup.ts`.

### Basic Utilities

- `waitForReactions(timeout?: number)`: Waits for all MobX reactions to complete. Useful for ensuring that all reactions have finished before making assertions.

- `trackModelChanges(model: IAnyStateTreeNode)`: Tracks changes to a model and returns a history of patches. Returns an object with methods to get changes, clear patches, and dispose the tracker.

- `createModelSnapshot(model: IAnyStateTreeNode, excludeProps?: string[])`: Creates a snapshot of the current model state, optionally excluding specified properties.

### Mock Utilities

Located in `src/test/mobx/mockModel.ts`.

- `mockModel(name: string, props: Record<string, any>)`: Creates a mock model with the specified properties.

- `partialMockModel(modelType: IAnyModelType, initialProps: any, overrides: Record<string, any>)`: Creates a partial mock of an existing model type, overriding specified properties.

- `spyOnModelMethod(model: IAnyStateTreeNode, methodName: string)`: Spies on a method of a model, allowing you to track calls to the method.

### Advanced Utilities

- `testFlow(flowAction: (...args: any[]) => Generator<any, any, any>, ...args: any[])`: Tests an asynchronous flow function and waits for reactions to complete.

- `advanceTime(ms: number)`: Simulates the passage of time, useful for testing time-based operations like debouncing.

- `trackPropertyChanges(model: any, propertyName: string)`: Tracks changes to a specific property of a model, returning an object with the changes and a dispose function.

- `observeModel(model: any, selector: (m: any) => any, onChange: (newValue: any, oldValue: any) => void)`: Observes changes to a model and executes a callback function when the value changes.

- `validateModelStructure(model: any, expectedProps: string[])`: Validates that a model has the expected properties.

### Setup and Cleanup

- `setupMobXTest()`: Sets up the MobX environment for testing. Call this in `beforeEach`.

- `cleanupMobXTest()`: Cleans up the MobX environment after testing. Call this in `afterEach`.

## Test Data Utilities

Located in `src/test/data/testDataUtils.ts`.

### Case Creation

- `createTestCase(values: Record<string, any>, id?: string)`: Creates a test case with the given values and an optional ID.

- `createTestCases(count: number, valuesFn: (index: number) => Record<string, any>, idPrefix = 'case_')`: Creates a batch of test cases with sequential IDs.

### Attribute and Collection Creation

- `createAttributeDefinition(id: string, name: string, type: AttributeType = 'numeric')`: Creates a simple attribute definition for testing.

- `createCollectionDefinition(id: string, name: string, attributeIds: string[] = [])`: Creates a simple collection definition for testing.

### Sample Data Creation

- `createSampleDatasetStructure(options: { numCases?: number; includeNumeric?: boolean; includeCategorial?: boolean; includeDateTime?: boolean; } = {})`: Creates a sample dataset structure with attributes, collections, and cases.

### Hierarchical Data Creation

- `createHierarchicalData(depth = 3, childrenPerNode = 2)`: Creates a hierarchical data structure for testing with the specified depth and number of children per node.

- `createSampleHierarchicalData()`: Creates a sample hierarchical dataset for testing with a predefined structure.

## Usage Examples

### MobX Testing Utilities

```typescript
import { types } from 'mobx-state-tree';
import { 
  waitForReactions, 
  trackModelChanges, 
  setupMobXTest, 
  cleanupMobXTest 
} from '../test/mobx/mobxTestSetup';

// Define a model
const TestModel = types
  .model('TestModel', {
    value: types.number
  })
  .actions(self => ({
    setValue(newValue: number) {
      self.value = newValue;
    }
  }));

describe('My Test Suite', () => {
  beforeEach(() => {
    setupMobXTest();
  });

  afterEach(() => {
    cleanupMobXTest();
  });

  it('should track changes to a model', () => {
    // Create a model
    const model = TestModel.create({ value: 1 });
    
    // Start tracking changes
    const tracker = trackModelChanges(model);
    
    // Make some changes
    model.setValue(2);
    
    // Get the tracked changes
    const changes = tracker.getChanges();
    
    // Check that the changes were tracked correctly
    expect(changes.length).toBeGreaterThan(0);
    
    // Dispose the tracker
    tracker.dispose();
  });
});
```

### Test Data Utilities

```typescript
import { 
  createTestCase, 
  createAttributeDefinition, 
  createCollectionDefinition, 
  createSampleDatasetStructure 
} from '../test/data/testDataUtils';

describe('My Data Test Suite', () => {
  it('should create a test case', () => {
    const testCase = createTestCase({ attr1: 'value1', attr2: 42 });
    
    expect(testCase.__id__).toBeDefined();
    expect(testCase.attr1).toBe('value1');
    expect(testCase.attr2).toBe(42);
  });

  it('should create a sample dataset', () => {
    const dataset = createSampleDatasetStructure({
      numCases: 5,
      includeNumeric: true,
      includeCategorial: true
    });
    
    expect(dataset.cases.length).toBe(5);
    expect(dataset.attributes.length).toBeGreaterThan(0);
    expect(dataset.collections.length).toBe(1);
  });
}); 