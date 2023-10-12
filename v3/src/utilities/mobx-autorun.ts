import { IAutorunOptions, autorun } from "mobx"
import { IAnyStateTreeNode, addDisposer } from "mobx-state-tree"
import { SetRequired } from "type-fest"

/*
  MobXAutorun is a utility class which manages a MobX autorun that should be disposed
  when an MST model it is observing is destroyed. This is accomplished by calling
  `addDisposer()` on the MST model. The rest of the arguments are identical to the
  MobX `autorun` API, except that passing a name is required.
 */
type IAutorunOptionsWithName = SetRequired<IAutorunOptions, "name">

export class MobXAutorun {
  private disposer: (() => void) | undefined

  constructor(fn: () => void, options: IAutorunOptionsWithName, model: IAnyStateTreeNode) {
    // install autorun
    this.disposer = autorun(fn, options)
    // dispose of autorun if the model it depends on is destroyed
    addDisposer(model, () => this.dispose())
  }

  dispose() {
    this.disposer?.()
    this.disposer = undefined
  }
}
