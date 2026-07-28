/**
 * Removes a trailing ellipsis from a label.
 *
 * Menu items that open a dialog end with an ellipsis by convention ("Edit Formula..."), but the
 * dialog's own title bar shows the same text without it. Deriving the title from the menu string
 * keeps the two in sync and reuses the existing translation.
 */
export function stripTrailingEllipsis(label: string) {
  return label.replace(/(\.\.\.|…)\s*$/, "")
}

/**
 * Removes a trailing colon from a label.
 *
 * Field prompts are stored with a colon ("Attribute Name:") because they were rendered inline with
 * their field. The formula editor stacks the label above its field, where the colon is not wanted.
 * Deriving it from the existing string keeps the translations.
 */
export function stripTrailingColon(label: string) {
  return label.replace(/\s*[:：]\s*$/, "")
}
