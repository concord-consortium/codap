/**
 * Use this helper to make sure a variable is defined and not null.
 *
 * Jest's `expect(value).toBeDefined()` does not tell Typescript that the variable
 * is guaranteed to be defined afterward. By using assertIsDefined Typescript will
 * know the variable is defined and not null. The not null check is included
 * because the only way I found to do this is using Typescript's NonNullable<T>.
 *
 * This is based on this:
 * https://www.typescriptlang.org/docs/handbook/release-notes/typescript-3-7.html#assertion-functions
 *
 * Perhaps in the future Jest will support these assertions:
 * https://github.com/DefinitelyTyped/DefinitelyTyped/issues/41179
 *
 * @param value value to make sure it is defined
 */
export function assertIsDefined<T>(value: T): asserts value is NonNullable<T> {
  // Look 1 stack frame up for the real problem
  expect(value).toBeDefined()
  expect(value).not.toBeNull()
}
