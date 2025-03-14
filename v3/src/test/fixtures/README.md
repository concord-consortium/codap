# Test Fixtures

This directory contains reusable test fixtures for CODAP v3 tests.

## Datasets

The `datasets.ts` file provides utilities for creating test datasets with predefined structures. These are useful for unit tests that need to work with DataSet instances.

### Available Fixtures

- `emptyDataset()`: Creates an empty dataset with no attributes or cases
- `numericDataset()`: Creates a simple dataset with two numeric attributes (x, y) and three cases
- `mixedTypeDataset()`: Creates a dataset with different attribute types (numeric, categorical, date)
- `largeDataset()`: Creates a dataset with 1000 cases for performance testing
- `datasetWithMissingValues()`: Creates a dataset with some missing values

### Usage Example

```typescript
import { numericDataset } from '../test/fixtures/datasets';

describe('My Component', () => {
  it('should render with data', () => {
    const dataset = numericDataset();
    // Use the dataset in your test...
  });
});
```

### Creating Custom Datasets

You can also use the `createTestDataset` function to create custom datasets:

```typescript
import { createTestDataset } from '../test/fixtures/datasets';

const customDataset = createTestDataset(
  'custom-id',
  'Custom Dataset',
  [
    { id: 'name', name: 'Name' },
    { id: 'score', name: 'Score' }
  ],
  [
    { name: 'Alice', score: 95 },
    { name: 'Bob', score: 87 },
    { name: 'Charlie', score: 92 }
  ]
);
``` 