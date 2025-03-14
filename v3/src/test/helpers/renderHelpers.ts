/**
 * Component Test Helpers
 * 
 * This file contains utilities for testing React components.
 */

import React, { ReactElement } from 'react';
import { render, RenderOptions, RenderResult, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ChakraProvider } from '@chakra-ui/react';
import { MemoryRouter } from 'react-router-dom';
import { setupMobXTest, cleanupMobXTest } from '../mobx/mobxTestSetup';

/**
 * Interface for the return value of the renderWithProviders function
 */
interface RenderWithProvidersResult extends RenderResult {
  user: ReturnType<typeof userEvent.setup>;
}

/**
 * Options for the renderWithProviders function
 */
interface RenderWithProvidersOptions extends Omit<RenderOptions, 'wrapper'> {
  /**
   * Initial route for the MemoryRouter
   */
  initialRoute?: string;
  
  /**
   * Whether to wrap the component in a ChakraProvider
   */
  withChakra?: boolean;
  
  /**
   * Whether to wrap the component in a MemoryRouter
   */
  withRouter?: boolean;
  
  /**
   * Whether to set up MobX for testing
   */
  withMobX?: boolean;
}

/**
 * Render a component with common providers
 * 
 * @param ui - The component to render
 * @param options - Options for rendering
 * @returns The render result with additional utilities
 */
export function renderWithProviders(
  ui: ReactElement,
  options: RenderWithProvidersOptions = {}
): RenderWithProvidersResult {
  const {
    initialRoute = '/',
    withChakra = true,
    withRouter = true,
    withMobX = true,
    ...renderOptions
  } = options;
  
  // Set up MobX if requested
  if (withMobX) {
    setupMobXTest();
  }
  
  // Create a user event instance
  const user = userEvent.setup();
  
  // Create a wrapper component with the requested providers
  const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    let wrappedChildren = children;
    
    // Wrap in ChakraProvider if requested
    if (withChakra) {
      wrappedChildren = (
        <ChakraProvider>
          {wrappedChildren}
        </ChakraProvider>
      );
    }
    
    // Wrap in MemoryRouter if requested
    if (withRouter) {
      wrappedChildren = (
        <MemoryRouter initialEntries={[initialRoute]}>
          {wrappedChildren}
        </MemoryRouter>
      );
    }
    
    return <>{wrappedChildren}</>;
  };
  
  // Render the component with the wrapper
  const result = render(ui, { wrapper: Wrapper, ...renderOptions });
  
  return {
    ...result,
    user
  };
}

/**
 * Clean up after a test that used renderWithProviders
 * 
 * @param withMobX - Whether MobX was set up for testing
 */
export function cleanupAfterRender(withMobX = true): void {
  if (withMobX) {
    cleanupMobXTest();
  }
}

/**
 * Wait for a component to be visible
 * 
 * @param getElement - A function that returns the element to wait for
 * @param timeout - Maximum time to wait in milliseconds
 * @returns A promise that resolves when the element is visible
 */
export function waitForVisible(
  getElement: () => HTMLElement | null,
  timeout = 1000
): Promise<HTMLElement> {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    
    const checkVisibility = () => {
      const element = getElement();
      
      if (element && element.offsetParent !== null) {
        // Element is visible
        resolve(element);
        return;
      }
      
      if (Date.now() - startTime > timeout) {
        // Timeout exceeded
        reject(new Error(`Element not visible within ${timeout}ms`));
        return;
      }
      
      // Check again after a short delay
      setTimeout(checkVisibility, 50);
    };
    
    checkVisibility();
  });
}

/**
 * Simulate a drag and drop operation using fireEvent
 * 
 * @param source - The source element to drag
 * @param target - The target element to drop onto
 */
export function dragAndDrop(
  source: HTMLElement,
  target: HTMLElement
): void {
  // Trigger dragstart on the source element
  fireEvent.dragStart(source);
  
  // Trigger dragover on the target element
  fireEvent.dragOver(target);
  
  // Trigger drop on the target element
  fireEvent.drop(target);
  
  // Trigger dragend on the source element
  fireEvent.dragEnd(source);
}

/**
 * Create a mock resize observer
 * 
 * @returns A mock ResizeObserver instance
 */
export function createMockResizeObserver(): ResizeObserver {
  return {
    observe: jest.fn(),
    unobserve: jest.fn(),
    disconnect: jest.fn()
  } as unknown as ResizeObserver;
}

/**
 * Create a mock intersection observer
 * 
 * @returns A mock IntersectionObserver instance
 */
export function createMockIntersectionObserver(): IntersectionObserver {
  return {
    observe: jest.fn(),
    unobserve: jest.fn(),
    disconnect: jest.fn(),
    takeRecords: jest.fn(() => [])
  } as unknown as IntersectionObserver;
} 