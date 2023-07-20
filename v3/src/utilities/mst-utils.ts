import {
  IAnyStateTreeNode, IDisposer, isAlive, ISerializedActionCall, getParent, getType,
  IOnActionOptions, onAction, hasParent, types
} from "mobx-state-tree"

/**
 * This creates the definition for a type field in MST.
 * The field is optional so it doesn't have to be specified when creating
 * an instance.
 *
 * @param typeName the type
 * @returns
 */
export function typeField(typeName: string) {
  return types.optional(types.literal(typeName), typeName)
}

/**
 * Returns an ancestor of a node whose type name is `typeName`, if any.
 * This is like `getParentOfType(target, type)`, but allows us not to refer directly to the
 * parent type, which can cause circular reference errors in MST.
 */
export function getParentWithTypeName(target: IAnyStateTreeNode, typeName: string): IAnyStateTreeNode | undefined {
  let current = target
  while (hasParent(current)) {
      const parent = getParent(current)
      const type = getType(parent)
      if (type.name === typeName) return parent
      current = parent
  }
  return undefined
}

/**
 * A short circuit isAlive check. It is intended to be used in observing
 * components. If the observing component is working with a MST object that
 * might get destroyed and the component should not be rendered after the object
 * is destroyed, this function should prevent the MST warnings. These warnings
 * can show up when MobX recomputes a computed value to see if it has changed.
 * This recomputing can happen even if the component is never re-rendered.
 *
 * It doesn't throw an error since often these issues are not critical. However
 * the issues do have the potential to cause hard to track down problems.
 *
 * It doesn't return a value because it can be used before hooks in a component
 * which should be run regardless of this check for consistency.
 *
 * See mst-detached-error.md and mobx-react-mst.test.tsx for more details.
 * https://github.com/concord-consortium/collaborative-learning/blob/master/docs/mst-detached-error.md
 * https://github.com/concord-consortium/collaborative-learning/blob/master/src/components/mobx-react-mst.test.tsx
 */
export function verifyAlive(target: IAnyStateTreeNode, source = "unknown") {
  if (!isAlive(target)) {
    console.warn(`Destroyed MST Object is being accessed from ${source}. Type: ${getType(target)}`)
  }
}

/**
 * Identical to onAction (above) except defaults to { afterAttach: true, allActions: true }
 *
 * @param target
 * @param listener
 * @param options object that controls the behavior
 * @param options.attachAfter (default false) fires the listener *after* the action has executed instead of before.
 * @param options.allActions (default false) fires the listener for *all* actions instead of just the outermost action.
 * @returns
 */
export function onAnyAction(
    target: IAnyStateTreeNode,
    listener: (call: ISerializedActionCall) => void,
    options?: IOnActionOptions
): IDisposer {
    return onAction(target, listener, { attachAfter: true, allActions: true, ...options })
}
