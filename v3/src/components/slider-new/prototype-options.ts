// PROTOTYPE scaffolding: design options to compare, chosen in the box at the bottom right of the workspace
// (prototype-options-panel.tsx) and read by the slider's drawing code. Every load starts at the defaults (Mike):
// Grip Lines on the thumb, Vertical Lines (Full Height) on the band; choices aren't remembered.
import { makeAutoObservable } from "mobx"

// decoration on the thumb itself (a whole thumb, or each half of a range thumb)
export const kThumbDecorations = ["none", "lines"] as const
export type ThumbDecoration = typeof kThumbDecorations[number]
// decoration on the band between a range thumb's halves
export const kSplitDecorations = ["none", "lines", "full-lines", "diagonal", "dots", "gradient"] as const
export type SplitDecoration = typeof kSplitDecorations[number]

class PrototypeOptions {
  thumbDecoration: ThumbDecoration = "lines"
  splitDecoration: SplitDecoration = "full-lines"

  constructor() {
    makeAutoObservable(this)
  }

  setThumbDecoration(decoration: ThumbDecoration) {
    this.thumbDecoration = decoration
  }

  setSplitDecoration(decoration: SplitDecoration) {
    this.splitDecoration = decoration
  }
}

export const prototypeOptions = new PrototypeOptions()
