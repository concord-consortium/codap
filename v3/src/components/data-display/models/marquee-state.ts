import {action, makeObservable, observable} from "mobx"
import {Rect} from "../data-display-types"


export class MarqueeState {

  constructor() {
    makeObservable(this)
  }

  @observable marqueeRect: Rect = {x: 0, y: 0, height: 0, width: 0}

  @action setMarqueeRect(rect: Rect) {
    this.marqueeRect = rect
  }
}
