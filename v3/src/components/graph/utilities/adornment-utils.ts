export function shouldShowPercentOption(attrTypes: Record<string, string | undefined>) {
  const categoricalAttrCount = Object.values(attrTypes).filter(a => a === "categorical").length
  return categoricalAttrCount > 0
}

export function shouldShowPercentTypeOptions(attrTypes: Record<string, string | undefined>) {
  const xHasCategorical = attrTypes.bottom === "categorical" || attrTypes.top === "categorical"
  const yHasCategorical = attrTypes.left === "categorical" || attrTypes.right === "categorical"
  const hasOnlyTwoCategorical = Object.values(attrTypes).filter(a => a === "categorical").length === 2
  return hasOnlyTwoCategorical && xHasCategorical && yHasCategorical
}
