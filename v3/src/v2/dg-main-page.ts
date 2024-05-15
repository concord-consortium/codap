import { SCObject } from "./sc-compat"

class DGTipView extends SCObject {
  show(loc: { x: number, y: number }, tip: string) {
    // show the drag tip
  }
  hide() {
    // hide the drag tip
  }
}

class DGMainPane extends SCObject {
  tipView = new DGTipView()
}

export class DGMainPage extends SCObject {
  mainPane = new DGMainPane
}
