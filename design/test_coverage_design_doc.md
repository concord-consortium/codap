# CODAP v3 Test Coverage Enhancement Design Document

## Current Context
- CODAP v3 is a data analysis platform with a complex React-based UI and MobX/MST state management
- Current test coverage is moderate (~56% statement, ~35% branch, ~49% function coverage)
- Testing is implemented using Jest for unit/integration tests and Cypress for E2E tests
- Core data models have good coverage (60-90%), while UI components have lower coverage (10-40%)
- Several test failures occur due to MobX/MST state management issues
- Complex UI interactions (drag-and-drop, canvas rendering) are challenging to test effectively
- The codebase uses TypeScript, which provides some static type checking but doesn't replace runtime testing

## Requirements

### Functional Requirements
- Increase overall test coverage to at least 80% for statements, 70% for branches, and 75% for functions
- Ensure all critical user workflows have E2E test coverage
- Implement comprehensive testing for all data models and their interactions
- Add robust testing for UI components, including complex interactions
- Establish reliable testing for MobX/MST state management
- Implement visual regression testing for UI components
- Create performance tests for critical operations
- Ensure all tests are reliable and don't produce false positives/negatives

### Non-Functional Requirements
- Test execution time should remain reasonable (unit tests under 2 minutes, E2E tests under 10 minutes)
- Testing infrastructure should be maintainable and well-documented
- Tests should be isolated and not affect each other
- Testing approach should be consistent across the codebase
- CI/CD integration should be seamless
- Test results should be easily interpretable
- Testing should support the development workflow, not hinder it

## Design Decisions

### 1. Testing Framework Selection
Will continue using Jest and Cypress because:
- Both are already established in the codebase
- They are industry standards with good community support
- Jest provides excellent unit testing capabilities
- Cypress offers robust E2E testing with good debugging tools
- Switching frameworks would require significant effort with limited benefit

### 2. Test Organization
Will implement a structured test organization approach because:
- Current test organization is inconsistent
- Structured approach improves discoverability and maintenance
- Clear organization helps identify coverage gaps
- Consistent patterns make tests easier to write and understand

The structure will include:
- Unit tests alongside source files
- Integration tests in dedicated directories
- E2E tests organized by user workflow
- Test utilities in shared directories
- Clear naming conventions for all test files

### 3. MobX/MST Testing Approach
Will implement specialized testing utilities for MobX/MST because:
- Many current test failures are related to MobX/MST
- Standard testing approaches don't handle reactive state well
- Specialized utilities can simplify testing reactive state
- This approach will improve test reliability

### 4. UI Component Testing Strategy
Will use a combination of approaches for UI testing:
- Component tests with React Testing Library for isolated component behavior
- Integration tests for component interactions
- Visual regression tests for appearance
- E2E tests for user workflows
- This multi-layered approach provides comprehensive coverage while keeping tests maintainable

### 5. Test Data Management
Will implement a structured test data management approach because:
- Current test data is inconsistent
- Structured approach improves test reliability
- Shared test data reduces duplication
- Clear data management makes tests easier to understand

## Technical Design

### 1. Core Testing Infrastructure

```typescript
// Test configuration enhancements for Jest
// jest.config.js additions
module.exports = {
  // Existing configuration...
  
  // Enhanced coverage reporting
  coverageReporters: ['text', 'html', 'lcov', 'json-summary'],
  
  // Stricter coverage thresholds
  coverageThreshold: {
    global: {
      statements: 80,
      branches: 70,
      functions: 75,
      lines: 80
    },
    // Component-specific thresholds
    './src/models/': {
      statements: 90,
      branches: 80,
      functions: 85,
      lines: 90
    }
  },
  
  // Test environment setup
  setupFilesAfterEnv: [
    '<rootDir>/src/test/setupTests.ts',
    '<rootDir>/src/test/mobxTestSetup.ts' // New MobX-specific setup
  ]
};
```

```typescript
// MobX testing utilities
// src/test/mobxTestSetup.ts
import { configure } from 'mobx';
import { getSnapshot, onPatch, applySnapshot } from 'mobx-state-tree';

// Configure MobX for testing
configure({
  enforceActions: 'never', // Allow state modifications during tests
  computedRequiresReaction: false,
  reactionRequiresObservable: false,
  observableRequiresReaction: false
});

// Helper to wait for all MobX reactions to complete
export async function waitForReactions() {
  return new Promise(resolve => setTimeout(resolve, 0));
}

// Helper to track model changes
export function trackModelChanges(model) {
  const changes = [];
  const disposer = onPatch(model, patch => {
    changes.push(patch);
  });
  return {
    changes,
    dispose: disposer
  };
}

// Add to global Jest environment
global.waitForReactions = waitForReactions;
global.trackModelChanges = trackModelChanges;
```

### 2. Test Organization Structure

```
src/
  components/
    component-name/
      __tests__/
        component-name.unit.test.tsx    # Unit tests
        component-name.integration.test.tsx  # Integration tests
      __mocks__/
        component-dependencies.ts  # Mocks for dependencies
      component-name.tsx
  models/
    model-name/
      __tests__/
        model-name.unit.test.ts
        model-name.integration.test.ts
      model-name.ts
  test/
    fixtures/           # Shared test data
    helpers/            # Test helper functions
    mocks/              # Shared mocks
    setupTests.ts       # Jest setup
    mobxTestSetup.ts    # MobX-specific setup
    testUtils.ts        # Shared test utilities
cypress/
  e2e/
    workflows/          # Tests organized by user workflow
    smoke/              # Smoke tests
    regression/         # Regression tests
  fixtures/             # Cypress-specific test data
  support/              # Cypress support files
```

### 3. UI Component Testing Approach

```typescript
// Example component test with React Testing Library
// src/components/graph/graph-component.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { GraphComponent } from '../graph-component';
import { createTestStore } from '../../../test/helpers/store-helpers';

describe('GraphComponent', () => {
  // Unit tests for isolated behavior
  describe('Unit tests', () => {
    it('renders with default props', () => {
      const store = createTestStore();
      render(<GraphComponent store={store} />);
      expect(screen.getByTestId('graph-container')).toBeInTheDocument();
    });
    
    it('responds to user interactions', () => {
      const store = createTestStore();
      const onZoom = jest.fn();
      render(<GraphComponent store={store} onZoom={onZoom} />);
      
      fireEvent.click(screen.getByTestId('zoom-in-button'));
      expect(onZoom).toHaveBeenCalledWith(expect.any(Object));
    });
  });
  
  // Integration tests with actual store
  describe('Integration tests', () => {
    it('updates when data changes', async () => {
      const store = createTestStore({
        data: [{ x: 1, y: 2 }]
      });
      
      const { rerender } = render(<GraphComponent store={store} />);
      expect(screen.getByTestId('data-point')).toBeInTheDocument();
      
      // Update store data
      store.setData([{ x: 1, y: 2 }, { x: 3, y: 4 }]);
      await waitForReactions();
      
      rerender(<GraphComponent store={store} />);
      expect(screen.getAllByTestId('data-point')).toHaveLength(2);
    });
  });
});
```

### 4. Data Model Testing Approach

```typescript
// Example model test
// src/models/data/data-set.test.ts
import { getSnapshot, onPatch, applySnapshot } from 'mobx-state-tree';
import { DataSet } from '../data-set';
import { waitForReactions, trackModelChanges } from '../../../test/mobxTestSetup';

describe('DataSet Model', () => {
  // Unit tests for model creation and basic properties
  describe('Unit tests', () => {
    it('creates with default values', () => {
      const dataSet = DataSet.create({ name: 'test' });
      expect(dataSet.name).toBe('test');
      expect(dataSet.attributes).toHaveLength(0);
    });
    
    it('adds attributes correctly', () => {
      const dataSet = DataSet.create({ name: 'test' });
      dataSet.addAttribute({ name: 'attr1' });
      
      expect(dataSet.attributes).toHaveLength(1);
      expect(dataSet.attributes[0].name).toBe('attr1');
    });
  });
  
  // Integration tests for model interactions
  describe('Integration tests', () => {
    it('handles complex data operations', async () => {
      const dataSet = DataSet.create({ name: 'test' });
      dataSet.addAttribute({ name: 'attr1' });
      dataSet.addAttribute({ name: 'attr2' });
      
      // Track model changes
      const tracker = trackModelChanges(dataSet);
      
      // Add cases
      dataSet.addCases([
        { attr1: 'value1', attr2: 'value2' },
        { attr1: 'value3', attr2: 'value4' }
      ]);
      
      await waitForReactions();
      
      expect(dataSet.cases).toHaveLength(2);
      expect(tracker.changes).toHaveLength(2); // Two patches for adding cases
      
      tracker.dispose();
    });
    
    it('maintains referential integrity', async () => {
      const dataSet = DataSet.create({ name: 'test' });
      dataSet.addAttribute({ name: 'attr1' });
      
      dataSet.addCases([{ attr1: 'value1' }]);
      const caseId = dataSet.cases[0].__id__;
      
      // Reference should be maintained
      expect(dataSet.getCaseById(caseId)).toBe(dataSet.cases[0]);
      
      // Update case
      dataSet.updateCase(caseId, { attr1: 'updated' });
      await waitForReactions();
      
      expect(dataSet.getCaseById(caseId).attr1).toBe('updated');
    });
  });
});
```

### 5. E2E Testing Approach

```typescript
// Example Cypress E2E test
// cypress/e2e/workflows/data-analysis-workflow.spec.ts
describe('Data Analysis Workflow', () => {
  beforeEach(() => {
    cy.visit('/');
    cy.clearLocalStorage();
    cy.clearCookies();
  });
  
  it('completes a basic data analysis workflow', () => {
    // Load sample data
    cy.get('[data-testid="hamburger-menu-button"]').click();
    cy.contains('Open...').click();
    cy.contains('Example Documents').should('be.visible');
    cy.contains('Mammals').click();
    cy.contains('Open').click();
    
    // Verify data loaded
    cy.get('.codap-case-table').should('exist');
    cy.contains('Mammals').should('be.visible');
    
    // Create a graph
    cy.get('[data-testid="tool-shelf-button-graph"]').click();
    cy.get('.codap-graph').should('exist');
    
    // Drag attributes to graph
    cy.dragAttributeToTarget('table', 'Weight', 'bottom');
    cy.dragAttributeToTarget('table', 'LifeSpan', 'left');
    
    // Verify graph created
    cy.get('[data-testid="axis-legend-attribute-button-bottom"]').should('contain', 'Weight');
    cy.get('[data-testid="axis-legend-attribute-button-left"]').should('contain', 'LifeSpan');
    
    // Add a regression line
    cy.get('[data-testid="graph-inspector-button"]').click();
    cy.contains('Measures').click();
    cy.contains('Linear Regression').click();
    
    // Verify regression line added
    cy.get('[data-testid="lsrl-adornment"]').should('exist');
    
    // Save document
    cy.get('[data-testid="hamburger-menu-button"]').click();
    cy.contains('Save').click();
    cy.get('[data-testid="filename-input"]').type('test-analysis');
    cy.contains('Save').click();
    
    // Verify save completed
    cy.contains('Saved').should('be.visible');
  });
});
```

## Implementation Plan

1. Phase 1: Infrastructure and Foundation (2 weeks)
   - Set up enhanced Jest configuration with stricter coverage thresholds
   - Create MobX/MST testing utilities and helpers
   - Establish test organization structure
   - Develop shared test fixtures and utilities
   - Document testing standards and best practices

2. Phase 2: Core Data Models (3 weeks)
   - Enhance tests for DataSet and related models
   - Implement comprehensive tests for formula engine
   - Add tests for document model and serialization
   - Create tests for shared models and utilities
   - Ensure all model interactions are thoroughly tested

3. Phase 3: UI Components - Basic (3 weeks)
   - Implement tests for basic UI components (buttons, inputs, etc.)
   - Add tests for layout components and containers
   - Create tests for simple interactive components
   - Implement visual regression tests for core components
   - Ensure accessibility testing is included

4. Phase 4: UI Components - Complex (4 weeks)
   - Implement tests for graph components
   - Add tests for table components
   - Create tests for drag-and-drop interactions
   - Implement tests for canvas/WebGL rendering
   - Ensure all complex interactions are covered

5. Phase 5: Integration and E2E Testing (3 weeks)
   - Enhance existing E2E tests
   - Add tests for all critical user workflows
   - Create performance tests for key operations
   - Implement cross-component integration tests
   - Ensure all user scenarios are covered

6. Phase 6: Test Reliability and Maintenance (2 weeks)
   - Address flaky tests
   - Optimize test execution time
   - Enhance test reporting and visualization
   - Document testing approach and maintenance procedures
   - Train team on testing best practices

## Testing Strategy

### Unit Tests
- **Data Models**:
  - Test model creation, properties, and methods
  - Test state transitions and validations
  - Test serialization and deserialization
  - Use specialized MobX/MST testing utilities

- **UI Components**:
  - Test rendering with various props
  - Test event handling and callbacks
  - Test accessibility features
  - Use React Testing Library for component testing

- **Utilities**:
  - Test with various inputs including edge cases
  - Test error handling
  - Ensure high coverage for utility functions

### Integration Tests
- **Model Interactions**:
  - Test interactions between related models
  - Test complex data operations
  - Test state synchronization

- **Component Compositions**:
  - Test parent-child component interactions
  - Test context providers and consumers
  - Test complex component trees

- **Service Integrations**:
  - Test API interactions
  - Test storage mechanisms
  - Test external service integrations

### End-to-End Tests
- **User Workflows**:
  - Test complete user journeys
  - Test critical business processes
  - Test error recovery scenarios

- **Visual Testing**:
  - Test UI appearance across different viewports
  - Test component styling and layout
  - Test animations and transitions

- **Performance Testing**:
  - Test loading times for large datasets
  - Test rendering performance
  - Test interaction responsiveness

## Observability

### Logging
- Add detailed logging in test setup and teardown
- Log test execution time and resource usage
- Use structured logging format for machine parsing
- Implement different log levels for various test types

### Metrics
- Track test coverage over time
- Monitor test execution time
- Track test reliability (flakiness)
- Measure code quality metrics alongside tests

## Future Considerations

### Potential Enhancements
- Implement property-based testing for data models
- Add mutation testing to verify test quality
- Implement AI-assisted test generation
- Create a visual test explorer for the codebase

### Known Limitations
- Canvas/WebGL testing will remain challenging
- Some complex UI interactions may require manual testing
- Performance testing in CI environments may not match production
- Test data management will require ongoing maintenance

## Dependencies

### Runtime Dependencies
- Jest (^27.0.0)
- React Testing Library (^12.0.0)
- Cypress (^10.0.0)
- MSW (Mock Service Worker) for API mocking
- jest-canvas-mock for canvas testing
- jest-image-snapshot for visual testing

### Development Dependencies
- TypeScript (^4.5.0)
- ESLint with testing plugins
- Prettier for code formatting
- Husky for pre-commit hooks
- lint-staged for staged file linting

## Security Considerations
- Ensure test data doesn't contain sensitive information
- Implement secure handling of test credentials
- Use dedicated test environments for integration testing
- Implement security testing as part of the test suite

## Rollout Strategy
1. **Preparation Phase** (1 week)
   - Set up infrastructure
   - Document approach
   - Train team

2. **Incremental Implementation** (15 weeks)
   - Follow the implementation plan phases
   - Start with highest-value areas
   - Gradually increase coverage thresholds

3. **Stabilization Phase** (2 weeks)
   - Address flaky tests
   - Optimize performance
   - Finalize documentation

4. **Maintenance Mode**
   - Regular reviews of test coverage
   - Continuous improvement of test suite
   - Integration with development workflow

## References
- Jest documentation: https://jestjs.io/docs/getting-started
- React Testing Library: https://testing-library.com/docs/react-testing-library/intro/
- Cypress documentation: https://docs.cypress.io/
- MobX-State-Tree testing: https://mobx-state-tree.js.org/concepts/testing
- Testing JavaScript Applications (Book): https://www.oreilly.com/library/view/testing-javascript-applications/9781617297915/ 