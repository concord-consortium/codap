// The parts of the Rollbar client that CODAP uses
interface IRollbar {
  warning(...args: unknown[]): void
}

// The Rollbar snippet in index.html defines `window.Rollbar` when reporting is enabled.
// Use it to record errors CODAP recovers from, which Rollbar wouldn't otherwise see.
export function getRollbar(): Maybe<IRollbar> {
  return (window as { Rollbar?: IRollbar }).Rollbar
}
