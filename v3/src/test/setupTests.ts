import "@testing-library/jest-dom"

import ResizeObserverPolyfill from "resize-observer-polyfill"
global.ResizeObserver = ResizeObserverPolyfill

// mock DOM APIs not supported by JSDOM
Element.prototype.scrollIntoView = jest.fn()
