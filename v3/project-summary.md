# CODAP v3 Project Summary

## Project Purpose

CODAP (Common Online Data Analysis Platform) v3 is a modern web application designed to provide interactive data analysis tools for educational purposes. It serves as a platform for:

1. Data visualization and analysis in educational contexts
2. Integration with educational games and simulations
3. Scientific inquiry and experimentation in classroom settings
4. Data science education and learning

The project is a complete reimplementation of CODAP v2 using modern web development tools, with the goal of maintaining feature parity while improving the underlying architecture and user experience.

## Project Organization

The project follows a standard React/TypeScript application structure:

```
v3/
├── src/           # Main source code
├── cypress/       # End-to-end tests
├── doc/          # Documentation
├── patches/      # Dependency patches
├── scripts/      # Build and utility scripts
├── __mocks__/    # Jest mocks
└── dist/         # Build output
```

## Development Standards

### Code Style

The project enforces strict code style guidelines through ESLint:

1. **TypeScript Standards**:
   - Strict type checking
   - No explicit `any` types
   - Prefer optional chaining
   - No empty interfaces
   - No unnecessary type assertions

2. **React Standards**:
   - Functional components with hooks
   - No access to state in setState
   - No dangerous HTML injection
   - Proper prop types
   - Proper event handler naming

3. **General Code Style**:
   - No tabs (spaces only)
   - Max line length: 120 characters
   - No semicolons (except where needed)
   - Consistent spacing
   - Prefer const over let
   - Use template literals
   - Use object shorthand
   - Use spread operator

### Testing Standards

The project uses a comprehensive testing approach:

1. **Unit Testing**:
   - Jest for unit tests
   - React Testing Library for component tests
   - Coverage requirements enforced
   - Test files located next to source files

2. **End-to-End Testing**:
   - Cypress for E2E tests
   - Separate test environment configurations
   - Visual regression testing support

3. **Test Organization**:
   - Tests grouped by feature
   - Shared test utilities
   - Mock data management
   - Test coverage reporting

## Major Libraries

### Core Framework
- React 18
- TypeScript 5.8
- MobX State Tree for state management
- Chakra UI for component library

### Data Visualization
- D3.js for data visualization
- Pixi.js for graphics rendering
- Leaflet for map visualization

### Development Tools
- Webpack for bundling
- ESLint for code quality
- Jest for testing
- Cypress for E2E testing
- TypeScript for type safety

### Additional Libraries
- CodeMirror for code editing
- React Data Grid for data tables
- MathJS for mathematical operations
- PapaParse for CSV parsing
- Lodash for utility functions

## Development Workflow

1. **Branch Management**:
   - `main` branch for v3 development
   - Feature branches for new development
   - Release branches for version management

2. **Development Process**:
   - Local development with hot reloading
   - HTTPS support for secure development
   - Comprehensive testing before commits
   - Automated builds and deployments

3. **Deployment**:
   - Automated builds via GitHub Actions
   - Staging and production environments
   - Versioned releases
   - Asset optimization

## Debugging Tools

The project includes various debugging features that can be enabled through local storage:

- Case ID display
- Cloud File Manager events
- Document state inspection
- Event modification tracking
- Formula recalculation logging
- History tracking
- Map interaction logging
- Plugin debugging
- Undo stack inspection

## License

The project is licensed under the MIT License, with some components initially released under Apache 2.0. 