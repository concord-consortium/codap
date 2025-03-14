/**
 * Tests for Component Test Helpers
 */

import React from 'react';
import { screen } from '@testing-library/react';
import { renderWithProviders, cleanupAfterRender, waitForVisible, dragAndDrop } from './renderHelpers';

// A simple test component
const TestComponent: React.FC<{ onClick?: () => void }> = ({ onClick }) => (
  <div>
    <h1>Test Component</h1>
    <button onClick={onClick}>Click Me</button>
  </div>
);

// A component that uses routing
const RouterTestComponent: React.FC = () => (
  <div>
    <h1>Router Test</h1>
    <p>Current path: {window.location.pathname}</p>
  </div>
);

describe('renderHelpers', () => {
  afterEach(() => {
    cleanupAfterRender();
  });

  describe('renderWithProviders', () => {
    it('should render a component', () => {
      renderWithProviders(<TestComponent />);
      
      expect(screen.getByText('Test Component')).toBeInTheDocument();
      expect(screen.getByText('Click Me')).toBeInTheDocument();
    });

    it('should handle click events', async () => {
      const handleClick = jest.fn();
      const { user } = renderWithProviders(<TestComponent onClick={handleClick} />);
      
      await user.click(screen.getByText('Click Me'));
      
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('should render with router', () => {
      renderWithProviders(<RouterTestComponent />, {
        initialRoute: '/test-route'
      });
      
      expect(screen.getByText('Router Test')).toBeInTheDocument();
      expect(screen.getByText('Current path: /test-route')).toBeInTheDocument();
    });

    it('should render without router if specified', () => {
      renderWithProviders(<RouterTestComponent />, {
        withRouter: false
      });
      
      expect(screen.getByText('Router Test')).toBeInTheDocument();
      // The path should be the default (empty or /)
      expect(screen.getByText(/Current path: \/$/)).toBeInTheDocument();
    });
  });

  describe('waitForVisible', () => {
    it('should resolve when element is visible', async () => {
      // Create a component that becomes visible after a delay
      const DelayedVisibleComponent: React.FC = () => {
        const [visible, setVisible] = React.useState(false);
        
        React.useEffect(() => {
          const timeout = setTimeout(() => {
            setVisible(true);
          }, 100);
          
          return () => clearTimeout(timeout);
        }, []);
        
        return (
          <div>
            {visible && <div data-testid="delayed-element">Visible Now</div>}
          </div>
        );
      };
      
      renderWithProviders(<DelayedVisibleComponent />);
      
      // Wait for the element to become visible
      const element = await waitForVisible(() => screen.queryByTestId('delayed-element'));
      
      expect(element).toBeInTheDocument();
      expect(element).toHaveTextContent('Visible Now');
    });

    it('should reject if element does not become visible within timeout', async () => {
      // Create a component that never becomes visible
      const NeverVisibleComponent: React.FC = () => (
        <div>
          <div data-testid="never-visible" style={{ display: 'none' }}>Never Visible</div>
        </div>
      );
      
      renderWithProviders(<NeverVisibleComponent />);
      
      // Wait for the element to become visible (should reject)
      await expect(
        waitForVisible(() => screen.queryByTestId('never-visible'), 100)
      ).rejects.toThrow('Element not visible within 100ms');
    });
  });

  describe('dragAndDrop', () => {
    it('should simulate drag and drop events', () => {
      // Create a component with drag and drop
      const DragDropComponent: React.FC = () => {
        const [dropped, setDropped] = React.useState(false);
        
        const handleDragStart = jest.fn();
        const handleDragOver = jest.fn((e) => {
          e.preventDefault(); // Necessary for drop to work
        });
        const handleDrop = jest.fn(() => {
          setDropped(true);
        });
        
        return (
          <div>
            <div
              data-testid="drag-source"
              draggable
              onDragStart={handleDragStart}
            >
              Drag Me
            </div>
            <div
              data-testid="drop-target"
              onDragOver={handleDragOver}
              onDrop={handleDrop}
            >
              {dropped ? 'Item Dropped' : 'Drop Here'}
            </div>
          </div>
        );
      };
      
      renderWithProviders(<DragDropComponent />);
      
      const source = screen.getByTestId('drag-source');
      const target = screen.getByTestId('drop-target');
      
      // Simulate drag and drop
      dragAndDrop(source, target);
      
      // Check that the drop was successful
      expect(screen.getByText('Item Dropped')).toBeInTheDocument();
    });
  });
}); 