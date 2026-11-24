// PROTOTYPE scaffolding for the slider redesign -- never merged into CODAP.
//
// Opening CODAP with no document in the URL loads the Four Seals example and adds two sliders:
//   "current (old) design" -- the original slider (components/slider), kept untouched for reference
//   "new Variable Slider"  -- the copy we redesign (components/slider-new); its title follows its type
// Four Seals is read-only, so every reload starts from this same state.

const kPrototypeHash = "#file=examples:Four%20Seals"

// Must run before CODAP parses the URL, so index.tsx imports this module first.
export const isPrototypeStart = !window.location.hash || window.location.hash === kPrototypeHash
if (isPrototypeStart) {
  const url = new URL(window.location.href)
  // reloading a read-only example shouldn't ask about unsaved changes
  url.searchParams.set("suppressUnsavedWarning", "")
  // skip the "Welcome to CODAP" dialog
  url.searchParams.set("noEntryModal", "")
  url.hash = kPrototypeHash
  window.history.replaceState(null, "", url.toString())
}

let didAddSliders = false

// Called once the opened document is in place (see lib/cfm/handle-cfm-event.ts).
export async function addPrototypeSliders() {
  if (!isPrototypeStart || didAddSliders) return
  didAddSliders = true

  // imported lazily so this module stays free of app dependencies when index.tsx loads it first
  const { appState } = await import("../models/app-state")
  const { createDefaultTileOfType } = await import("../models/codap/add-default-content")
  const { withoutUndo } = await import("../models/history/without-undo")
  const { kSliderTileType } = await import("../components/slider/slider-defs")
  const { kSliderTileType: kSliderNewTileType } = await import("../components/slider-new/slider-defs")
  const { isSliderModel } = await import("../components/slider-new/slider-model")
  const { kSliderTypeLabels } = await import("../components/slider-new/slider-types")
  // the new slider is as wide as its widest range readout needs (see slider-registration.ts)
  const { kSliderDefaultWidth } = await import("../components/slider-new/slider-registration")
  const { reaction } = await import("mobx")

  const content = appState.document.content
  const row = content?.getRowByIndex(0)
  if (!content || !row) return

  // the design options box at the bottom right of the workspace
  const { mountPrototypeOptions } = await import("../components/slider-new/prototype-options-panel")
  mountPrototypeOptions()

  // the new slider's title names its type ("new Variable Slider - ...") and follows it when the type changes
  // in Config. The version and date live here -- update them with each round of changes.
  const newSliderTitle = (typeLabel: string) => `new ${typeLabel} Slider - v1.0, updated: 11/24/26`

  // to the right of Four Seals' tiles, which end at x = 715
  const sliders = [
    { type: kSliderTileType, title: "current (old) design", y: 5 },
    // below the old slider (98px tall) with a 10px gap
    { type: kSliderNewTileType, title: newSliderTitle(kSliderTypeLabels.variable), y: 113, width: kSliderDefaultWidth }
  ]
  content.applyModelChange(() => {
    withoutUndo({ noDirty: true, suppressWarning: true })
    sliders.forEach(({ type, title, y, width = 400 }) => {
      const tile = createDefaultTileOfType(type)
      if (!tile) return
      tile.setUserTitle(title)
      content.insertTileInRow(tile, row, { x: 735, y, width })

      const sliderModel = tile.content
      if (type !== kSliderNewTileType || !isSliderModel(sliderModel)) return
      reaction(
        () => sliderModel.sliderType,
        (sliderType, prevType) => {
          // leave a title someone has typed alone
          if (tile.title !== newSliderTitle(kSliderTypeLabels[prevType])) return
          tile.applyModelChange(() => {
            withoutUndo({ noDirty: true, suppressWarning: true })
            tile.setUserTitle(newSliderTitle(kSliderTypeLabels[sliderType]))
          })
        }
      )
    })
  })
}
