import "@testing-library/jest-dom"
import "jest-canvas-mock"
import ResizeObserverPolyfill from "resize-observer-polyfill"

import { assertIsDefined } from "./assert-is-defined"
import { ConsoleMethod, IJestSpyConsoleOptions, jestSpyConsole, JestSpyConsoleFn } from "./jest-spy-console"

global.ResizeObserver = ResizeObserverPolyfill

// mock DOM APIs not supported by JSDOM
Element.prototype.scrollIntoView = jest.fn()

declare global {
  function assertIsDefined<T>(value: T): asserts value is NonNullable<T>
  function jestSpyConsole(method: ConsoleMethod, fn: JestSpyConsoleFn,
                          options?: IJestSpyConsoleOptions): Promise<jest.SpyInstance>
}
global.assertIsDefined = assertIsDefined
global.jestSpyConsole = jestSpyConsole
