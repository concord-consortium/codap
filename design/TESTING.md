# CODAP v3 Testing Guide

This document provides comprehensive guidance on testing practices for the CODAP v3 application. It covers testing standards, patterns, and tools used in the project.

## Table of Contents

1. [Testing Philosophy](#testing-philosophy)
2. [Test Types](#test-types)
3. [Directory Structure](#directory-structure)
4. [Naming Conventions](#naming-conventions)
5. [Testing Tools](#testing-tools)
6. [Testing Patterns](#testing-patterns)
7. [MobX/MST Testing](#mobxmst-testing)
8. [UI Component Testing](#ui-component-testing)
9. [End-to-End Testing](#end-to-end-testing)
10. [Test Data Management](#test-data-management)
11. [Mocking and Stubbing](#mocking-and-stubbing)
12. [Coverage Requirements](#coverage-requirements)
13. [Continuous Integration](#continuous-integration)
14. [Troubleshooting](#troubleshooting)

## Testing Philosophy

Our testing approach is guided by the following principles:

1. **Test Behavior, Not Implementation**: Focus on testing what the code does, not how it does it.
2. **Pyramid Structure**: Maintain a healthy balance of unit, integration, and end-to-end tests.
3. **Reliability Over Coverage**: Prioritize reliable tests over achieving high coverage with flaky tests.
4. **Maintainability**: Write tests that are easy to understand and maintain.
5. **Fast Feedback**: Tests should run quickly to provide fast feedback during development.

## Test Types

We use several types of tests in the CODAP v3 application:

### Unit Tests

Unit tests verify the behavior of individual functions, methods, or classes in isolation. They should be:

- Fast to execute
- Independent of external dependencies
- Focused on a single unit of functionality

### Integration Tests

Integration tests verify the interaction between multiple units. They should:

- Test the integration points between components
- Verify that components work together as expected
- Use real implementations where possible, with mocks for external dependencies

### End-to-End Tests

End-to-End (E2E) tests verify the behavior of the application as a whole. They should:

- Test critical user workflows
- Interact with the application as a user would
- Verify that all components work together correctly

## Directory Structure

Our test files are organized as follows:

```
src/
├── components/
│   ├── ComponentName.tsx
│   └── ComponentName.test.tsx
├── models/
│   ├── ModelName.ts
│   └── ModelName.test.ts
└── test/
    ├── fixtures/       # Shared test data
    ├── helpers/        # Test helper functions
    ├── mocks/          # Mock implementations
    └── mobx/           # MobX testing utilities
```

- Test files are co-located with the code they test
- Shared test utilities are in the `src/test` directory
- Cypress E2E tests are in the `cypress` directory

## Naming Conventions

- **Test Files**: `*.test.ts` or `*.test.tsx`
- **Test Fixtures**: `*.fixture.ts`
- **Test Helpers**: `*Helper.ts` or `*Utils.ts`
- **Test Mocks**: `*Mock.ts`

## Testing Tools

We use the following tools for testing:

- **Jest**: Test runner and assertion library
- **React Testing Library**: UI component testing
- **Cypress**: End-to-end testing
- **jest-axe**: Accessibility testing
- **jest-image-snapshot**: Visual regression testing
- **MSW (Mock Service Worker)**: API mocking

## Testing Patterns

### Arrange-Act-Assert (AAA)

Structure your tests using the AAA pattern:

```typescript
test('should update the count when clicked', () => {
  // Arrange
  const { getByText } = render(<Counter initialCount={0} />);
  
  // Act
  fireEvent.click(getByText('Increment'));
  
  // Assert
  expect(getByText('Count: 1')).toBeInTheDocument();
});
```

### Test Isolation

Each test should be independent and not rely on the state from other tests:

```typescript
// Good
beforeEach(() => {
  // Reset state before each test
  resetState();
});

// Bad
let sharedState;
test('first test', () => {
  sharedState = setupState();
  // Test using sharedState
});

test('second test', () => {
  // Test using sharedState from first test
});
```

### Testing Asynchronous Code

Use async/await for testing asynchronous code:

```typescript
test('should load data asynchronously', async () => {
  const { getByText } = render(<DataLoader />);
  
  // Wait for the data to load
  await waitFor(() => getByText('Data loaded'));
  
  expect(getByText('Item 1')).toBeInTheDocument();
});
```

## MobX/MST Testing

Testing MobX/MST models requires special consideration due to their reactive nature.

### Waiting for Reactions

Use the `waitForReactions` utility to ensure all reactions have completed:

```typescript
import { waitForReactions } from '../test/mobx/mobxTestSetup';

test('should update derived values when base values change', async () => {
  const model = SomeModel.create({ value: 1 });
  
  model.setValue(2);
  
  // Wait for all reactions to complete
  await waitForReactions();
  
  expect(model.derivedValue).toBe(4); // derivedValue = value * 2
});
```

### Tracking Model Changes

Use the `trackModelChanges` utility to track changes to a model:

```typescript
import { trackModelChanges } from '../test/mobx/mobxTestSetup';

test('should track model changes', () => {
  const model = SomeModel.create({ value: 1 });
  const tracker = trackModelChanges(model);
  
  model.setValue(2);
  
  expect(tracker.getChanges()).toContainEqual({
    path: ['value'],
    oldValue: 1,
    newValue: 2
  });
});
```

## UI Component Testing

We use React Testing Library for testing UI components.

### Rendering Components

Use the `render` function to render components:

```typescript
import { render } from '@testing-library/react';

test('should render the component', () => {
  const { getByText } = render(<MyComponent />);
  expect(getByText('Hello, World!')).toBeInTheDocument();
});
```

### User Interactions

Use `userEvent` for simulating user interactions:

```typescript
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

test('should update input value', async () => {
  const user = userEvent.setup();
  const { getByLabelText } = render(<MyForm />);
  
  const input = getByLabelText('Name');
  await user.type(input, 'John Doe');
  
  expect(input).toHaveValue('John Doe');
});
```

### Testing Accessibility

Use `jest-axe` for testing accessibility:

```typescript
import { render } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';

expect.extend(toHaveNoViolations);

test('should have no accessibility violations', async () => {
  const { container } = render(<MyComponent />);
  const results = await axe(container);
  
  expect(results).toHaveNoViolations();
});
```

## End-to-End Testing

We use Cypress for end-to-end testing.

### Writing E2E Tests

```typescript
describe('Todo App', () => {
  beforeEach(() => {
    cy.visit('/');
  });
  
  it('should add a new todo', () => {
    cy.get('[data-testid="new-todo"]').type('Buy milk{enter}');
    cy.get('[data-testid="todo-list"]').should('contain', 'Buy milk');
  });
});
```

### Custom Commands

We have several custom Cypress commands:

```typescript
// Using a custom command
cy.clickMenuItem('File', 'Open');

// Using a custom command with options
cy.clickWhenClickable('[data-testid="button"]');

// Using a drag-and-drop command
cy.dragAttributeToTarget('attribute-name', 'target-selector');
```

## Test Data Management

### Test Fixtures

We use a structured approach to test fixtures in CODAP v3, with dedicated files for different types of test data:

```typescript
// src/test/fixtures/datasets.ts - Dataset fixtures
export const numericDataset = () => createTestDataset(
  'numeric-dataset',
  'Numeric Dataset',
  [
    { id: 'x', name: 'X' },
    { id: 'y', name: 'Y' }
  ],
  [
    { x: 1, y: 10 },
    { x: 2, y: 20 },
    { x: 3, y: 30 }
  ]
);

// src/test/fixtures/documents.ts - Document fixtures
export const sampleDocument = {
  name: 'Sample Document',
  title: 'Sample Document',
  description: 'A sample document for testing',
  metadata: {
    author: 'Test User',
    created: '2023-01-01T00:00:00.000Z',
    modified: '2023-01-02T00:00:00.000Z',
    version: '1.0.0'
  },
  datasets: [
    sampleDataset
  ],
  components: [
    // Component definitions...
  ]
};

// Using the fixtures
import { numericDataset } from '../test/fixtures/datasets';

test('should render dataset', () => {
  const dataset = numericDataset();
  const { getByText } = render(<DatasetView dataset={dataset} />);
  expect(getByText('X')).toBeInTheDocument();
});
```

### Factory Functions

We use factory functions to create test data with variations, allowing for flexible test data creation:

```typescript
// Dataset factory function
export function createTestDataset(
  id: string = 'test-dataset',
  name: string = 'Test Dataset',
  attributes: Array<{id: string, name: string}> = [],
  cases: Array<Record<string, any>> = []
) {
  // Create the dataset
  const dataset = DataSet.create({
    id,
    name,
    sourceID: 'test'
  });
  
  // Add attributes
  attributes.forEach(attr => {
    dataset.addAttribute(Attribute.create({
      id: attr.id,
      name: attr.name
    }));
  });
  
  // Add cases
  if (cases.length > 0) {
    const casesToAdd: ICaseCreation[] = cases.map((caseData, index) => {
      return {
        __id__: `case-${index + 1}`,
        ...caseData
      };
    });
    
    dataset.addCases(casesToAdd);
  }
  
  return dataset;
}

// Component factory function
export function createComponent(
  type: 'table' | 'graph' | 'text' | 'map',
  overrides: Record<string, any> = {}
) {
  const baseComponent = {
    id: `comp${Math.floor(Math.random() * 10000)}`,
    title: `${type.charAt(0).toUpperCase() + type.slice(1)} Component`,
    position: { x: 0, y: 0, width: 400, height: 300 }
  };

  // Add type-specific properties
  let typeSpecificProps = {};
  
  switch (type) {
    case 'table':
      typeSpecificProps = {
        type: 'table',
        datasetId: sampleDataset.name
      };
      break;
    case 'graph':
      typeSpecificProps = {
        type: 'graph',
        datasetId: sampleDataset.name,
        graphConfig: {
          plotType: 'scatter',
          xAttributeId: 'attr1',
          yAttributeId: 'attr3'
        }
      };
      break;
    // Other component types...
  }

  return {
    ...baseComponent,
    ...typeSpecificProps,
    ...overrides
  };
}

// Using the factory functions
import { createTestDataset } from '../test/fixtures/datasets';

test('should render custom dataset', () => {
  const dataset = createTestDataset(
    'custom-id',
    'Custom Dataset',
    [
      { id: 'name', name: 'Name' },
      { id: 'score', name: 'Score' }
    ],
    [
      { name: 'Alice', score: 95 },
      { name: 'Bob', score: 87 }
    ]
  );
  
  const { getByText } = render(<DatasetView dataset={dataset} />);
  expect(getByText('Name')).toBeInTheDocument();
});
```

### Test Data Organization

Our test data is organized as follows:

1. **Basic Fixtures**: Simple, static data objects for common testing scenarios
2. **Factory Functions**: Functions that create customizable test data
3. **Predefined Instances**: Functions that return preconfigured instances for specific testing scenarios

Each type of test data is stored in a dedicated file in the `src/test/fixtures` directory:

- `datasets.ts`: Dataset-related test data
- `documents.ts`: Document-related test data
- `components.ts`: UI component-related test data

### Best Practices for Test Data

1. **Keep it Simple**: Test data should be as simple as possible while still being realistic
2. **Make it Readable**: Test data should be easy to understand at a glance
3. **Avoid Duplication**: Use factory functions to avoid duplicating test data
4. **Isolate Tests**: Each test should have its own instance of test data to avoid cross-test contamination
5. **Document Assumptions**: Document any assumptions made about the test data

### Accessing Test Data

To use test data in your tests:

```typescript
// Import predefined datasets
import { numericDataset, mixedTypeDataset } from '../test/fixtures/datasets';

// Import factory functions
import { createTestDataset } from '../test/fixtures/datasets';
import { createComponent } from '../test/fixtures/documents';

// Use predefined datasets
test('should render numeric dataset', () => {
  const dataset = numericDataset();
  // Test with the dataset...
});

// Use factory functions
test('should render custom dataset', () => {
  const dataset = createTestDataset(
    'custom-id',
    'Custom Dataset',
    [
      { id: 'name', name: 'Name' },
      { id: 'score', name: 'Score' }
    ],
    [
      { name: 'Alice', score: 95 },
      { name: 'Bob', score: 87 }
    ]
  );
  // Test with the custom dataset...
});
```

## Mocking and Stubbing

### Mocking Functions

Use Jest's `jest.fn()` to mock functions:

```typescript
test('should call onSubmit when form is submitted', () => {
  const onSubmit = jest.fn();
  const { getByText } = render(<MyForm onSubmit={onSubmit} />);
  
  fireEvent.click(getByText('Submit'));
  
  expect(onSubmit).toHaveBeenCalled();
});
```

### Mocking Modules

Use Jest's `jest.mock()` to mock modules:

```typescript
// Mocking a module
jest.mock('../api', () => ({
  fetchData: jest.fn().mockResolvedValue({ data: 'mocked data' })
}));

// Using the mocked module
import { fetchData } from '../api';

test('should fetch data', async () => {
  const result = await fetchData();
  expect(result).toEqual({ data: 'mocked data' });
});
```

### Mocking MST Models

Use the MST mocking utilities:

```typescript
import { mockModel } from '../test/mobx/mockModel';

test('should use mocked model', () => {
  const mockedModel = mockModel('SomeModel', {
    value: 1,
    derivedValue: 2,
    setValue: jest.fn()
  });
  
  const { getByText } = render(<ModelView model={mockedModel} />);
  
  expect(getByText('Value: 1')).toBeInTheDocument();
});
```

## Coverage Requirements

We aim for the following coverage targets:

- **Statement Coverage**: 80%
- **Branch Coverage**: 70%
- **Function Coverage**: 75%

Coverage is enforced through thresholds in the Jest configuration.

## Continuous Integration

Tests are run automatically on CI for:

- Pull requests
- Merges to main branch

The CI pipeline includes:

1. Linting
2. Type checking
3. Unit and integration tests
4. End-to-end tests
5. Coverage reporting

## Troubleshooting

### Common Issues

#### Tests Failing Due to Timeouts

If tests are failing due to timeouts, consider:

- Increasing the timeout for the test: `jest.setTimeout(10000)`
- Using `waitFor` with a longer timeout: `await waitFor(() => {...}, { timeout: 5000 })`
- Checking for asynchronous operations that aren't being properly awaited

#### Flaky Tests

If tests are flaky (sometimes passing, sometimes failing), consider:

- Adding better wait conditions
- Improving test isolation
- Checking for race conditions
- Using `waitForReactions` for MobX/MST tests

#### Memory Leaks

If tests are causing memory leaks, consider:

- Cleaning up subscriptions and event listeners
- Using `afterEach` to clean up resources
- Checking for unclosed connections or timers

### Getting Help

If you're stuck with a testing issue:

1. Check the documentation for the testing tools
2. Look for similar issues in the project
3. Ask for help in the team chat
4. Create an issue with a minimal reproduction 