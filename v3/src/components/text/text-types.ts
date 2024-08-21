import { EditorValue } from "@concord-consortium/slate-editor"

export interface SlateDocument {
  document?: {
    children?: EditorValue
  }
  object?: string // "value"
  objTypes?: Record<string, string> // like { "paragraph": "block" }
}
