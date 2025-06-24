import "@testing-library/jest-dom"
import "jest-canvas-mock"
import { enableFetchMocks } from "jest-fetch-mock"
import type { JSDOM } from 'jsdom'

// polyfill `TextEncoder` since it's not provided by JSDOM
// https://github.com/jsdom/jsdom/issues/2524
// https://github.com/inrupt/solid-client-authn-js/issues/1676#issuecomment-917016646
import { TextEncoder } from "util"
global.TextEncoder = TextEncoder
import { assertIsDefined } from "./assert-is-defined"
import { ConsoleMethod, IJestSpyConsoleOptions, jestSpyConsole, JestSpyConsoleFn } from "./jest-spy-console"

// mock DOM APIs not supported by JSDOM
Element.prototype.scrollIntoView = jest.fn()

// enable fetch mocking
enableFetchMocks()

declare global {
  function assertIsDefined<T>(value: T): asserts value is NonNullable<T>
  function jestSpyConsole(method: ConsoleMethod, fn: JestSpyConsoleFn,
                          options?: IJestSpyConsoleOptions): Promise<jest.SpyInstance>
}
global.assertIsDefined = assertIsDefined
global.jestSpyConsole = jestSpyConsole

declare global {
    const jsdom: JSDOM
}
