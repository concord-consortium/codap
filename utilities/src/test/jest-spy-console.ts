/* eslint-disable jest/no-commented-out-tests */
/*
 * jestSpyConsole
 *
 * Utility function for mocking/suppressing console messages during tests
 *
 * Usage:

  it("suppresses console messages while capturing calls", () => {
    jestSpyConsole("warn", spy => {
      // doesn't log to console
      console.warn("Warning!")
      // but does capture calls to console
      expect(spy).toHaveBeenCalled()
    });
  });

  The return value is a promise which can be awaited which is useful with async functions.

  it("suppresses console messages while capturing calls", () => {
    await jestSpyConsole("warn", spy => {
      // doesn't log to console
      console.warn("Warning!")
      // but does capture calls to console
      expect(spy).toHaveBeenCalled()
    });
  });

  Specify { noRestore: true } to have the client take responsibility for handling cleanup:

  it("suppresses console messages while capturing calls", () => {
    const consoleSpy = jestSpyConsole("warn", spy => {
      // doesn't log to console
      console.warn("Warning!")
      // but does capture calls to console
      expect(spy).toHaveBeenCalled()
    });
    ...
    (await consoleSpy).mockRestore()
  });

 */
export type ConsoleMethod = "log" | "warn" | "error"
export type JestSpyConsoleFn = (spy: jest.SpyInstance) => void
export interface IJestSpyConsoleOptions {
  // if true, client is responsible for calling mockRestore on the returned instance
  noRestore?: boolean;
  // whether to log messages to the console
  show?: boolean | ((...args: any[]) => boolean);
}
export const jestSpyConsole = async (method: ConsoleMethod, fn: JestSpyConsoleFn, options?: IJestSpyConsoleOptions) => {
  // intercept and suppress console methods
  const consoleMethodSpy = jest.spyOn(global.console, method).mockImplementation((...args: any[]) => {
    if ((typeof options?.show === "boolean" && options.show) ||
        (typeof options?.show === "function" && options.show(...args))) {
      // output logs that match the filter (generally for debugging)
      console.debug(...args) // eslint-disable-line no-console
    }
  })

  // call the client's code
  await Promise.resolve(fn(consoleMethodSpy))

  // return the spy instance if client doesn't want us to restore it for them
  if (options?.noRestore) {
    return consoleMethodSpy
  }

  // restore the original console method (unless client indicates they will)
  consoleMethodSpy.mockRestore()

  // cast so typescript doesn't complain about legitimate usage
  // using the mock after restore will still generate an error at runtime
  return undefined as any as typeof consoleMethodSpy
}
/* eslint-enable jest/no-commented-out-tests */
