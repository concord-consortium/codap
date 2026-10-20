import { t } from "../../../utilities/translation/translate"

/** A plugin-supplied template uses {{current}} and {{total}}; the default is localized. */
export function renderProgressText(template: string | undefined, current: number, total: number): string {
  if (template == null) return t("V3.Tour.progress", { vars: { current, total } })
  return template.replace(/\{\{current\}\}/g, String(current)).replace(/\{\{total\}\}/g, String(total))
}
