/**
 * Removes the decorative dashes that wrap some menu-button labels, e.g. "--- Insert Value ---".
 *
 * The English strings carry no dashes, but the translations are owned by POEditor and still supply
 * them, so they are stripped at render time to keep the label consistent across locales. Once every
 * translation has been updated, this helper and its call sites can be removed.
 *
 * Only leading and trailing dash runs are removed; hyphens within the label are preserved.
 */
export function stripLabelDecoration(label: string) {
  return label.replace(/^\s*-+\s*/, "").replace(/\s*-+\s*$/, "")
}
