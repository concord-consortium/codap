import { IAutorunOptions, IReactionDisposer, autorun } from "mobx"
import { IAnyStateTreeNode, addDisposer } from "mobx-state-tree"
import { SetRequired } from "type-fest"

/*
  mstAutorun is a wrapper function which manages a MobX autorun that should be disposed
  when an MST model it is observing is destroyed. This is accomplished by calling
  `addDisposer()` on the MST model. The rest of the arguments are identical to the
  MobX `autorun` API, except that passing a name is required.
 */
type IAutorunOptionsWithName = SetRequired<IAutorunOptions, "name">
type IAnyModels = IAnyStateTreeNode | IAnyStateTreeNode[]

export function mstAutorun(fn: () => void, options: IAutorunOptionsWithName, models: IAnyModels) {
  // install autorun
  let _disposer: IReactionDisposer | undefined = autorun(fn, options)
  // returned disposer prevents MobX disposer from being called multiple times
  function disposer() {
    _disposer?.()
    _disposer = undefined
  }
  // dispose of autorun if the model(s) it depends on is/are destroyed
  const _models = Array.isArray(models) ? models : [models]
  _models.forEach(model => model && addDisposer(model, disposer))
  return disposer
}
