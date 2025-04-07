// Separating these definitions avoids circular dependencies

export interface DIAdornmentValuesBase {
  type?: string; // The type of the adornment, e.g., "Count", "Percent", etc.
  isVisible?: boolean; // Indicates whether the adornment is visible or not
}

export function isDIAdornmentValuesBase(val: unknown): val is DIAdornmentValuesBase {
  return typeof val === "object" && val != null && ("type" in val && typeof val.type === "string")
}

const diAdornmentTypeAliases = new Map<string, string>()

export function registerAdornmentTypeAlias(alias: string, type: string): void {
  diAdornmentTypeAliases.set(alias, type)
}

export const resolveAdornmentType = (typeOrAlias: unknown): string => {
  return typeof typeOrAlias === "string"
          ? diAdornmentTypeAliases.get(typeOrAlias) ?? typeOrAlias
          : String(typeOrAlias)
}
