import { IReactionOptions, reaction } from "mobx"
import { IAnyStateTreeNode, addDisposer } from "mobx-state-tree"
import { SetRequired } from "type-fest"

/*
  MobXReaction is a utility class which manages a MobX reaction that should be disposed
  when an MST model it is observing is destroyed. This is accomplished by calling
  `addDisposer()` on the MST model. The rest of the arguments are identical to the
  MobX `reaction` API, except that passing a name is required.
 */
type IReactionOptionsWithName<T, fireImmediately extends boolean> =
      SetRequired<IReactionOptions<T, fireImmediately>, "name">

export class MobXReaction<T, fireImmediately extends boolean> {
  private disposer: (() => void) | undefined

  constructor(accessor: () => T, effect: (args: T) => void,
              options: IReactionOptionsWithName<T, fireImmediately>, model: IAnyStateTreeNode) {
    // install reaction
    this.disposer = reaction(accessor, effect, options)
    // dispose of the reaction if the model it depends on is destroyed
    addDisposer(model, () => this.dispose())
  }

  dispose() {
    this.disposer?.()
    this.disposer = undefined
  }
}
