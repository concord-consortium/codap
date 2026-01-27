import "@testing-library/jest-dom"
import "jest-canvas-mock"
import { enableFetchMocks } from "jest-fetch-mock"
import "jest-webgl-canvas-mock"
import { isEqual, isEqualWith } from "lodash"
import ResizeObserverPolyfill from "resize-observer-polyfill"
global.ResizeObserver = ResizeObserverPolyfill
// polyfill `TextEncoder` since it's not provided by JSDOM
// https://github.com/jsdom/jsdom/issues/2524
// https://github.com/inrupt/solid-client-authn-js/issues/1676#issuecomment-917016646
import { TextEncoder } from "util"
// Type assertion needed because Node's TextEncoder returns Uint8Array<ArrayBufferLike>
// while DOM's TextEncoder expects Uint8Array<ArrayBuffer> (stricter in TS 5.9+)
global.TextEncoder = TextEncoder as typeof globalThis.TextEncoder
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

let message = () => ""

function removeIdsReplacer(key: string, value: any) {
  return key === "id" ? undefined : value
}

// for use with lodash's isEqualWith function to implement toEqualWithoutIds custom jest matcher
const withoutIdsCustomizer = (rec: any, exp: any) => {
  if (Array.isArray(rec) && Array.isArray(exp) && (rec?.length !== exp?.length)) {
    message = () =>
      `array lengths must be equal\n` +
      `  Expected: ${exp.length}\n` +
      `  Received: ${rec.length}`
    return false
  }
  const _rec = JSON.parse(JSON.stringify(rec, removeIdsReplacer))
  const _exp = JSON.parse(JSON.stringify(exp, removeIdsReplacer))
  if (!isEqual(_rec, _exp)) {
    message = () =>
      `object values must match:\n` +
      `  Expected: ${JSON.stringify(_exp)}\n` +
      `  Received: ${JSON.stringify(_rec)}`
  }
  return true
}

// custom jest matcher for testing that copied objects are identical to the originals
// except for the object ids which should all be different.
expect.extend({
  toEqualWithoutIds(received: any, expected: any) {
    message = () => ""
    const pass = isEqualWith(received, expected, withoutIdsCustomizer)
    if (!pass && !message()) {
      message = () => "values differed even with ids ignored"
    }
    return { pass, message }
  }
})
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace jest {
    interface Matchers<R> {
      toEqualWithoutIds(expected: any): R
    }
  }
}
