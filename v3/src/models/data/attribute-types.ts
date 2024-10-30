export const kDefaultFormatStr = ".3~f"

export const isDevelopment = () => process.env.NODE_ENV !== "production"
export const isProduction = () => process.env.NODE_ENV === "production"

export type IValueType = string | number | boolean | Date | undefined
