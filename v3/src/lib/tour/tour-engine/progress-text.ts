const DEFAULT_PROGRESS_TEXT = "{{current}} of {{total}}"

export function renderProgressText(template: string | undefined, current: number, total: number): string {
  const t = template ?? DEFAULT_PROGRESS_TEXT
  return t.replace(/\{\{current\}\}/g, String(current)).replace(/\{\{total\}\}/g, String(total))
}
