/**
 * Removes a trailing ellipsis from a label.
 *
 * Menu items that open a dialog end with an ellipsis by convention ("Edit Formula..."), but the
 * dialog's own title bar shows the same text without it. Deriving the title from the menu string
 * keeps the two in sync and reuses the existing translation.
 *
 * Any run of two or more dots counts, since the translations are not consistent about it: Hebrew
 * uses two, Japanese uses the single ellipsis character, and Thai adds a trailing space.
 */
export function stripTrailingEllipsis(label: string) {
  return label.replace(/\s*(\.{2,}|…)\s*$/, "")
}

/**
 * Removes a trailing colon from a label.
 *
 * Field prompts are stored with a colon ("Attribute Name:"), which suits the callers that render
 * them inline with their field. The formula editor stacks the label above its field, where the
 * colon is unwanted. Deriving it from the existing string keeps the translations.
 */
export function stripTrailingColon(label: string) {
  return label.replace(/\s*[:：]\s*$/, "")
}
