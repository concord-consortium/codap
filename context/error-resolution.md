# Error Resolution Guide

## Overview
Systematic process for resolving code errors while maintaining system integrity.

## Input Requirements
1. Target file content and path
2. Current linting/type errors
3. Related type definitions
4. Import/export relationships
5. Test coverage

## Resolution Process

### 1. Error Analysis
- **React Hooks**
  - Dependency array completeness
  - Cleanup functions
  - State update patterns
  - Custom hook stability

- **Types & Interfaces**
  - Type mismatches
  - Missing properties
  - Generic constraints
  - Return types

- **Code Structure**
  - Import/export relationships
  - Circular dependencies
  - Unused declarations
  - Documentation consistency

### 2. Resolution Planning
- Group related errors
- Prioritize by:
  - Dependency chain position
  - Impact scope
  - Resolution complexity
- Document current state
- Plan verification approach

### 3. Implementation
- Apply fixes systematically
- Update related:
  - Types
  - Documentation
  - Tests
  - Error handling

### 4. Verification
- Run type checker
- Verify linting
- Run tests
- Check performance
- Validate interfaces

## Exit Conditions
- Success: Zero errors remain
- Failure: Three iterations without improvement
- Warning: Circular dependency detected

## Common Error Patterns

### React Hooks
```typescript
// useCallback Analysis
const callback = useCallback(() => {
  // Check all variables used:
  // 1. In dependency array
  // 2. Stable from props
  // 3. From function parameters
}, [dep1, dep2]);

// useEffect Cleanup
useEffect(() => {
  const subscription = subscribe();
  return () => {
    subscription.unsubscribe();
  };
}, [subscribe]);
```

### TypeScript
```typescript
// Interface Implementation
interface Props {
  data: DataType;
  onUpdate: (data: DataType) => void;
}

// Generic Constraints
function transform<T extends BaseType>(input: T): Output<T> {
  // Implementation
}
```

### Documentation
```typescript
/**
 * @description Clear purpose
 * @param {Type} name - Parameter description
 * @returns {ReturnType} Return description
 * @example
 * ```typescript
 * usage example
 * ```
 */
``` 