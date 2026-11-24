// PROTOTYPE scaffolding: design options to compare, chosen in the box at the bottom right of the workspace
// (prototype-options-panel.tsx) and read by the slider's drawing code. Every load starts at the defaults (Mike):
// Grip Lines on the thumb, Vertical Lines on the band; choices aren’t remembered.
import { makeAutoObservable } from "mobx"

// decoration on the thumb itself (a whole thumb, or each half of a range thumb)
export const kThumbDecorations = ["none", "lines"] as const
export type ThumbDecoration = typeof kThumbDecorations[number]
// how tall the band between a range thumb's halves is (Mike): Top Inset is the original band
export const kBandHeights = ["full", "top-inset", "body", "top-bottom-inset"] as const
export type BandHeight = typeof kBandHeights[number]
// decoration on the band between a range thumb's halves
export const kSplitDecorations = ["none", "lines", "full-lines", "diagonal", "dots", "dot-pattern", "gradient"] as const
export type SplitDecoration = typeof kSplitDecorations[number]

// the band decoration's opacity, in %, left to right on the options slider (Mike). Contrast of the #006c8e
// decoration against the band at rest (#bbefff): 4.78, 3.07, 2.03 and 1.4:1. The first two pass 3:1, Mike's house
// bar (WCAG doesn't require it: the decoration carries no information), and are marked with a check.
export const kDecorationOpacityStops = [100, 75, 50, 25] as const
export const kDecorationOpacityPasses = (stop: number) => stop >= 75

class PrototypeOptions {
  thumbDecoration: ThumbDecoration = "lines"
  splitDecoration: SplitDecoration = "lines"
  bandHeight: BandHeight = "top-inset"
  // starts at 75%, the lighter of the two stops that keep 3:1 (Mike)
  decorationOpacity = 75

  constructor() {
    makeAutoObservable(this)
  }

  setThumbDecoration(decoration: ThumbDecoration) {
    this.thumbDecoration = decoration
  }

  setSplitDecoration(decoration: SplitDecoration) {
    this.splitDecoration = decoration
  }

  setBandHeight(height: BandHeight) {
    this.bandHeight = height
  }

  setDecorationOpacity(opacity: number) {
    this.decorationOpacity = opacity
  }
}

export const prototypeOptions = new PrototypeOptions()
