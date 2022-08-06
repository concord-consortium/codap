declare module "*.csv";
declare module "*.png";
declare module "*.svg";

// used by libraries like React and MST to control runtime behavior
declare namespace process {
  const env: {
    NODE_ENV: string; // e.g. "development" or "production"
  }
}
