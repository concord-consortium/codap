import { makeObservable, observable } from "mobx"

const kDefaultRowHeaderHeight = 30
const kDefaultRowHeight = 18
const kDefaultRowCount = 12
export class CollectionCardModel {
  collectionId: string
  // RDG grid element
  @observable element: HTMLDivElement | null = null
  // tracks current scrollTop value for grid
  @observable scrollTop = 0
  // tracks the last user- or programmatically-set scrollTop value
  // different from `scrollTop`, which animates to the target in multiple steps
  @observable targetScrollTop = 0
  // scroll steps -- used to distinguish user scrolls from browser-generated smooth scrolls
  lastScrollStep = 0
  scrollStep = 0

  constructor(collectionId: string) {
    this.collectionId = collectionId

    makeObservable(this)
  }

}
