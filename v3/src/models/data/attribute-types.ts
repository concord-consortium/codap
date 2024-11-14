export const kDefaultFormatNum = 3

export const isDevelopment = () => process.env.NODE_ENV !== "production"
export const isProduction = () => process.env.NODE_ENV === "production"

export type IValueType = string | number | boolean | Date | undefined
