export interface PluginData {
  aegis?: string,
  categories: string[],
  description: string,
  "description-string"?: string,
  disabled?: boolean,
  height: number,
  icon: string,
  isStandard: "true" | "false", // All have "true" for some reason
  path: string,
  title: string,
  "title-string"?: string,
  visible: boolean | "true" | "false", // Most have "true" or "false" for some reason, but a couple have true
  width: number
}

export interface PluginGroup {
  title: string,
  plugins: PluginData[]
}

export type PluginMenuConfig = PluginGroup[]
