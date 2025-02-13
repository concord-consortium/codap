import { DEBUG_EVENT_MODIFICATION } from "./debug"

const eventMethods = [
  "preventDefault",
  "stopPropagation",
  "stopImmediatePropagation"
] as const

const elementMethods = [
  "setPointerCapture"
] as const

function instrumentEventMethod(
  name: typeof eventMethods[number]
) {
  const origMethod = Event.prototype[name]
  Event.prototype[name] = function (...args) {
    console.warn(name, ...args)
    origMethod.call(this, ...args)
  }
}

function instrumentElementMethod(
  name: typeof elementMethods[number]
) {
  const origMethod = Element.prototype[name]
  Element.prototype[name] = function (...args) {
    console.warn(name, ...args)
    origMethod.call(this, ...args)
  }
}

if (DEBUG_EVENT_MODIFICATION) {
  eventMethods.forEach(method => instrumentEventMethod(method))
  elementMethods.forEach(method => instrumentElementMethod(method))
}
