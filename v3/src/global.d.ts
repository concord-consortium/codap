declare module "*.csv"
declare module "*.json5"
declare module "*.png"
declare module "*.svg"
declare module "d3-v6-tip"

// used by libraries like React and MST to control runtime behavior
declare namespace process {
  const env: {
    NODE_ENV: string; // e.g. "development" or "production"
    [index: string]: string
  }
}

// The URL of the folder the bundle was loaded from, set by webpack at runtime.
declare const __webpack_public_path__: string | undefined

type Maybe<T> = T | undefined
