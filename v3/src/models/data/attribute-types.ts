export const kDefaultNumPrecision = 3
export const kDefaultNumFormatStr = `.${kDefaultNumPrecision}~f`

export const isDevelopment = () => process.env.NODE_ENV !== "production"
export const isProduction = () => process.env.NODE_ENV === "production"

export type IValueType = string | number | boolean | Date | undefined
