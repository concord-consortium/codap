import { computed, makeObservable } from "mobx"
import { GraphAttrRole, attrRoleToAxisPlace } from "../../data-display/data-display-types"
import { IGraphDataConfigurationModel } from "./graph-data-configuration-model"
import { GraphLayout } from "./graph-layout"

export class SubPlotCells {
  dataConfig?: IGraphDataConfigurationModel
  layout: GraphLayout

  constructor(layout: GraphLayout, dataConfig?: IGraphDataConfigurationModel) {
    this.dataConfig = dataConfig
    this.layout = layout
    makeObservable(this)
  }

  /*
   * roles
   */

  @computed
  get primaryAttrRole() {
    return this.dataConfig?.primaryRole ?? 'x'
  }

  @computed
  get secondaryAttrRole() {
    return this.primaryAttrRole === 'x' ? 'y' : 'x'
  }

  @computed
  get primarySplitAttrRole(): GraphAttrRole {
    return this.primaryAttrRole === 'x' ? 'topSplit' : 'rightSplit'
  }

  @computed
  get secondarySplitAttrRole(): GraphAttrRole {
    return this.primaryAttrRole === 'x' ? 'rightSplit' : 'topSplit'
  }

  /*
   * places
   */

  @computed
  get primaryAxisPlace() {
    return attrRoleToAxisPlace[this.primaryAttrRole] ?? 'bottom'
  }

  @computed
  get secondaryAxisPlace() {
    return attrRoleToAxisPlace[this.secondaryAttrRole] ?? 'left'
  }

  @computed
  get primarySplitAxisPlace() {
    return attrRoleToAxisPlace[this.primarySplitAttrRole] ?? 'top'
  }

  @computed
  get secondarySplitAxisPlace() {
    return attrRoleToAxisPlace[this.secondarySplitAttrRole] ?? 'rightCat'
  }

  @computed
  get primaryIsBottom() {
    return this.primaryAxisPlace === 'bottom'
  }

  @computed
  get signForOffset() {
    return this.primaryIsBottom ? 1 : -1
  }

  /*
   * scales
   */

  @computed
  get primaryScale() {
    return this.layout.getBandScale(this.primaryAxisPlace)
  }

  @computed
  get primaryBaseCoord() {
    return this.primaryIsBottom ? 0 : this.layout.getAxisLength('left')
  }

  @computed
  get secondaryScale() {
    return this.layout.getAxisScale(this.secondaryAxisPlace)
  }

  // secondary is band scale for split dot charts
  @computed
  get secondaryBandScale() {
    return this.layout.getBandScale(this.secondaryAxisPlace)
  }

  // secondary is numeric scale for bar charts
  @computed
  get secondaryNumericScale() {
    return this.layout.getNumericScale(this.secondaryAxisPlace)
  }

  @computed
  get secondaryBaseCoord() {
    return this.secondaryScale?.range()[0] ?? 0
  }

  @computed
  get secondaryNumericUnitLength() {
    const secondaryNumericScale = this.secondaryNumericScale
    return secondaryNumericScale
            ? Math.abs(secondaryNumericScale(1) - secondaryNumericScale(0)) / this.numSecondarySplitBands
            : 0
  }

  @computed
  get primarySplitScale() {
    return this.layout.getBandScale(this.primarySplitAxisPlace)
  }

  @computed
  get numPrimarySplitBands() {
    // Access changeCount to establish MobX dependency on scale domain changes
    void this.layout.getAxisMultiScale(this.primarySplitAxisPlace)?.changeCount
    return Math.max(1, this.primarySplitScale?.domain().length ?? 1)
  }

  @computed
  get secondarySplitScale() {
    return this.layout.getBandScale(this.secondarySplitAxisPlace)
  }

  @computed
  get numSecondarySplitBands() {
    // Access changeCount to establish MobX dependency on scale domain changes
    void this.layout.getAxisMultiScale(this.secondarySplitAxisPlace)?.changeCount
    return Math.max(1, this.secondarySplitScale?.domain().length ?? 1)
  }

  /*
   * widths and heights
   */

  @computed
  get primaryCellHeight() {
    const secondaryAxisPlace = this.secondaryAxisPlace
    // Access changeCount to establish MobX dependency on scale domain changes
    void this.layout.getAxisMultiScale(secondaryAxisPlace)?.changeCount
    const secondaryAxisLength = secondaryAxisPlace ? this.layout.getAxisLength(secondaryAxisPlace) : 0
    return (this.secondaryBandScale?.bandwidth?.() ?? secondaryAxisLength) /
          (this.dataConfig?.numRepetitionsForPlace(secondaryAxisPlace) ?? 1)
  }

  @computed
  get primaryCellWidth() {
    // Access changeCount to establish MobX dependency on scale domain changes
    void this.layout.getAxisMultiScale(this.primaryAxisPlace)?.changeCount
    const bandwidth = this.primaryScale?.bandwidth?.() ?? 0
    const numReps = this.dataConfig?.numRepetitionsForPlace(this.primaryAxisPlace) ?? 1
    return bandwidth / numReps
  }

  @computed
  get secondaryCellHeight() {
    return this.layout.getAxisLength(this.secondaryAxisPlace) / this.numSecondarySplitBands
  }

  @computed
  get primarySplitCellWidth() {
    // Access changeCount to establish MobX dependency on scale domain changes
    void this.layout.getAxisMultiScale(this.primarySplitAxisPlace)?.changeCount
    return this.primarySplitScale?.bandwidth?.() ?? 0
  }

  @computed
  get secondarySplitCellWidth() {
    // Access changeCount to establish MobX dependency on scale domain changes
    void this.layout.getAxisMultiScale(this.secondarySplitAxisPlace)?.changeCount
    return this.secondarySplitScale?.bandwidth?.() ?? 0
  }
}
