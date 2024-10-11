import { IReactionDisposer, IReactionOptions, reaction } from "mobx"
import { IAnyStateTreeNode, addDisposer } from "mobx-state-tree"
import { SetRequired } from "type-fest"

/*
  mstReaction is a wrapper function which manages a MobX reaction that should be disposed
  when an MST model it is observing is destroyed. This is accomplished by calling
  `addDisposer()` on the MST model. The rest of the arguments are identical to the
  MobX `reaction` API, except that passing a name is required.
 */
type IReactionOptionsWithName<T, fireImmediately extends boolean> =
      SetRequired<IReactionOptions<T, fireImmediately>, "name">

export function mstReaction<T, fireImmediately extends boolean>(
  accessor: () => T, effect: (args: T) => void,
  options: IReactionOptionsWithName<T, fireImmediately>, models: IAnyStateTreeNode | IAnyStateTreeNode[]) {
  // install reaction
  let _disposer: IReactionDisposer | undefined = reaction(accessor, effect, options)
  // returned disposer prevents MobX disposer from being called multiple times
  function disposer() {
    _disposer?.()
    _disposer = undefined
  }
  // dispose of the reaction if the model(s) it depends on is/are destroyed
  const _models = Array.isArray(models) ? models : [models]
  _models.forEach(model => model && addDisposer(model, disposer))
  return disposer
}
