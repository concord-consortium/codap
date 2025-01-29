import { makeAutoObservable } from "mobx"
import { measureText } from "../../../../hooks/use-measure-text"
import { logMessageWithReplacement } from "../../../../lib/log-message"
import { missingColor } from "../../../../utilities/color-utils"
import { axisGap } from "../../../axis/axis-types"
import { getStringBounds } from "../../../axis/axis-utils"
import { kMain, kDataDisplayFont } from "../../data-display-types"
import { IDataConfigurationModel } from "../../models/data-configuration-model"
import { DataDisplayLayout } from "../../models/data-display-layout"

import vars from "../../../vars.scss"

export interface Key {
  category: string;
  color: string;
  index: number;
  column: number;
  row: number;
}
interface Layout {
  maxWidth: number;
  fullWidth: number;
  numColumns: number;
  numRows: number;
  columnWidth: number;
}

export const keySize = 15
export const padding = 5
export const labelHeight = getStringBounds('Wy', vars.labelFont).height + axisGap

export class CategoricalLegendModel {
  dragInfo = {
    category: "",
    initialOffset: { x: 0, y: 0 },
    currentDragPosition: { x: 0, y: 0 },
    initialIndex: -1,
    currentIndex: -1
  }

  dataDisplayLayout: DataDisplayLayout
  dataConfiguration: IDataConfigurationModel | undefined

  categoriesAtDragStart: string[] = []
  colorsAtDragStart: Record<string, string> = {}

  constructor(dataConfiguration: IDataConfigurationModel | undefined, dataDisplayLayout: DataDisplayLayout) {
    this.dataDisplayLayout = dataDisplayLayout
    this.dataConfiguration = dataConfiguration
    makeAutoObservable(this)
  }

  setDataConfiguration(dataConfiguration: IDataConfigurationModel | undefined) {
    this.dataConfiguration = dataConfiguration
  }

  setDataDisplayLayout(dataDisplayLayout: DataDisplayLayout) {
    this.dataDisplayLayout = dataDisplayLayout
  }

  get categoriesFromDoc() {
    const categories = this.dataConfiguration?.categoryArrayForAttrRole('legend') || []
    return categories.filter(cat => cat !== kMain)
  }

  getColorForCategoryFromDoc(cat: string, defaultColor = missingColor) {
    return this.dataConfiguration?.getLegendColorForCategory(cat) ?? defaultColor
  }

  get numCategories() {
    return this.categoriesFromDoc.length
  }

  get categoryTextMaxWidth() {
    let maxWidth = 0
    this.categoriesFromDoc.forEach(cat => {
      maxWidth = Math.max(maxWidth, measureText(cat, kDataDisplayFont))
    })
    return maxWidth
  }

  get layoutData() {
    const fullWidth = this.dataDisplayLayout.tileWidth
    const maxWidth = this.categoryTextMaxWidth + keySize + padding
    const numColumns = Math.max(Math.floor(fullWidth / maxWidth), 1)
    const columnWidth = fullWidth / numColumns
    const numRows = Math.ceil((this.numCategories ?? 0) / numColumns)

    const lod: Layout = {
      fullWidth,
      maxWidth,
      numColumns,
      columnWidth,
      numRows
    }

    return lod
  }

  coordinatesToCatIndex(localPoint: { x: number; y: number; }) {
    const { x, y } = localPoint
    const col = Math.floor(x / this.layoutData.columnWidth)
    const row = Math.floor(y / (keySize + padding))
    const catIndex = row * this.layoutData.numColumns + col

    return catIndex >= 0 && catIndex < this.numCategories ? catIndex : -1
  }

  catLocation(categoryKey: Key) {
    return {
      x: axisGap + categoryKey.column * this.layoutData.columnWidth,
      y: categoryKey.row * (keySize + padding)
    }
  }

  get isDragging() {
    return !!this.dragInfo.category
  }

  getColorForCategory(cat: string, defaultColor = missingColor) {
    if (this.isDragging) {
      return this.colorsAtDragStart[cat] || defaultColor
    } else {
      return this.getColorForCategoryFromDoc(cat, defaultColor)
    }
  }

  get categoryData() {
    const categories = this.isDragging ? this.getCategoriesDuringDrag() : this.categoriesFromDoc

    return categories.map((cat: string, index) => ({
      category: cat,
      color: this.getColorForCategory(cat, "white"),
      column: index % this.layoutData.numColumns,
      index,
      row: Math.floor(index / this.layoutData.numColumns)
    }))
  }

  onDragStart(event: { x: number; y: number; }, d: Key) {
    const localPt = {
      x: event.x,
      y: event.y - labelHeight
    }
    const keyLocation = this.catLocation(d)

    this.categoriesAtDragStart = this.categoriesFromDoc
    // TODO: saving the colors is probably not necessary
    // They shouldn't be changing while we are dragging since the dragging doesn't
    // change the document
    this.categoriesAtDragStart.forEach(cat => {
      this.colorsAtDragStart[cat] = this.getColorForCategoryFromDoc(cat)
    })

    const dI = this.dragInfo
    // We save the information but we don't save the dragging category to indicate we are
    // dragging. This prevents extra re-renders on single clicks
    dI.initialOffset = { x: localPt.x - keyLocation.x, y: localPt.y - keyLocation.y }
    dI.currentDragPosition = localPt
    dI.initialIndex = d.index
    dI.currentIndex = d.index
  }

  onDrag(event: { dx: number; dy: number; }, d: Key) {
    if (event.dx !== 0 || event.dy !== 0) {
      const dI = this.dragInfo

      // Indicate that we are now dragging
      dI.category = d.category

      const newDragPosition = {
        x: dI.currentDragPosition.x + event.dx,
        y: dI.currentDragPosition.y + event.dy
      }

      dI.currentIndex = this.coordinatesToCatIndex(newDragPosition)
      dI.currentDragPosition = newDragPosition
    }
  }

  onDragEnd(
    dataConfiguration: IDataConfigurationModel | undefined, d: Key
  ) {
    const categories = dataConfiguration?.categoryArrayForAttrRole('legend') || []
    const dI = this.dragInfo

    const targetCategory = categories[dI.currentIndex]

    if (dI.currentIndex === dI.initialIndex) {
      // Nothing changed so stop the drag and do nothing else.
      dI.category = ""
    } else {
      // TODO: This is calling a MST action inside of a MobX action, it might be why undo and redo
      // Isn't always working properly. If that is true, we can annotate it so onDragEnd itself isn't a
      // MobX action
      dataConfiguration?.applyModelChange(() => {
        dataConfiguration?.storeAllCurrentColorsForAttrRole('legend')
        let beforeCategory: string | undefined = ""
        if (dI.currentIndex > dI.initialIndex) {
          // The gap is on the left of where we want the dragged category to go so we want to
          // go before the category to the right of our target position. If we are at the end then we use
          // a special undefined value to indicate we want go to the last position
          beforeCategory = dI.currentIndex < categories.length - 1 ? categories[dI.currentIndex + 1] : undefined
        } else {
          // The gap is on the right of where we want the dragged category to go so we want to
          // go before the category at our target position. This will push all of the categories right.
          beforeCategory = categories[dI.currentIndex]
        }
        const categorySet = dataConfiguration?.categorySetForAttrRole("legend")
        categorySet?.move(dI.category, beforeCategory)
        dI.category = ""
      }, {
        undoStringKey: 'DG.Undo.graph.swapCategories',
        redoStringKey: 'DG.Redo.graph.swapCategories',
        log: logMessageWithReplacement(
          "Moved category %@ into position of %@",
          {
            movedCategory: d.category,
            targetCategory
          })
      })
    }
  }

  getCategoriesDuringDrag() {
    const { dragInfo } = this
    if (dragInfo.currentIndex === dragInfo.initialIndex) return this.categoriesAtDragStart

    const updatedCategories: string[] = []
    this.categoriesAtDragStart.forEach((cat, index) => {
      // Ignore the old location
      if (cat === dragInfo.category) return

      if (index !== dragInfo.currentIndex) {
        // If we aren't at the location of the dragged category just
        // add the original category
        updatedCategories.push(cat)
      } else {
        if (dragInfo.currentIndex < dragInfo.initialIndex) {
          // If the "gap" is after our location add the dragged category first
          // then add the category that was in this spot previously
          updatedCategories.push(dragInfo.category)
          updatedCategories.push(cat)
        } else {
          // If the "gap" is before our location add the original category first
          // and then our draged category second
          updatedCategories.push(cat)
          updatedCategories.push(dragInfo.category)
        }
      }
    })
    return updatedCategories
  }
}
