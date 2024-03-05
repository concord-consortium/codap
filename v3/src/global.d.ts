declare module "*.csv";
declare module "*.json5";
declare module "*.png";
declare module "*.svg";
declare module "d3-v6-tip";

declare module "color-parse" {
  export default function parse(cstr: string): {
    space: string | undefined
    values: Array<string | number>
    alpha: number
  }
}

// used by libraries like React and MST to control runtime behavior
declare namespace process {
  const env: {
    NODE_ENV: string; // e.g. "development" or "production"
    [index: string]: string
  }
}
