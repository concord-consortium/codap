declare module "*.csv"
declare module "*.json5"
declare module "*.png"
declare module "*.svg"
declare module "d3-v6-tip"

// The NodeJS global types are being enabled in this project because some of
// types of the imported libraries use these NodeJS types. An example is
// "@types/papaparse". Because of this, the process.env type is already
// defined and doesn't need to be redefined here.

// The NODE_ENV is used by libraries like React and MST to control runtime behavior.
// declare namespace process {
//   const env: {
//     NODE_ENV: string; // e.g. "development" or "production"
//     [index: string]: string
//   }
// }

type Maybe<T> = T | undefined
