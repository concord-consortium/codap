export const kPrivateValueJson = "[private]"

/**
 * Wraps a value that may identify a user (e.g. a document name) so that it can be passed to
 * `console` methods. The browser console shows the wrapped value, but Rollbar, which converts
 * object arguments to JSON before recording console messages as telemetry, sees only "[private]".
 *
 * Pass the result as its own argument (e.g. `console.warn("message", privateValue(name))`).
 * Don't put it in a template string, which would convert it to a string before Rollbar sees it.
 */
export class PrivateValue<T> {
  constructor(readonly value: T) {}

  toJSON() {
    return kPrivateValueJson
  }
}

export function privateValue<T>(value: T) {
  return new PrivateValue(value)
}
