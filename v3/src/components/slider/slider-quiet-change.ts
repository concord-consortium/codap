import { ISliderModel } from "./slider-model"

// Sliders whose type or attribute is being changed from a menu. A menu announces its own choice to a screen reader,
// so the slider doesn't announce the change too; one made any other way, such as by a drop, by undo or redo, or by a
// plugin, is announced. The slider's announcement reacts synchronously, at the end of the change's action, so the
// change must not be made within an enclosing action or batch, which would defer the reaction until after this ends.
const quietSliders = new WeakSet<ISliderModel>()

export function makeQuietSliderChange(slider: ISliderModel, change: () => void) {
  quietSliders.add(slider)
  try {
    change()
  }
  finally {
    quietSliders.delete(slider)
  }
}

export function isQuietSliderChange(slider: ISliderModel) {
  return quietSliders.has(slider)
}
