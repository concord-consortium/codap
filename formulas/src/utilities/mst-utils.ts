import { observable } from "mobx"
import {
  IAnyStateTreeNode, IDisposer, isAlive, ISerializedActionCall, getParent, getType,
  IOnActionOptions, onAction, hasParent, types, getSnapshot
} from "mobx-state-tree"


export function safeGetSnapshot<S>(target?: IAnyStateTreeNode): S | undefined {
  return target ? getSnapshot(target) : undefined
}

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
 * This creates the definition for an optional boolean property in MST.
 * The valid values for the property are `true` or `undefined`, which
 * means that the property is not serialized unless it is true.
 *
 * @returns
 */
export function typeOptionalBoolean() {
  return types.maybe(types.literal(true))
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

export function isAliveSafe(target: IAnyStateTreeNode | undefined) {
  return !!target && isAlive(target)
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

/**
 * A function factory that returns a lazily evaluated function that doesn't take arguments and will return the same
 * value until invalidate() is called. This is useful for caching values that are expensive to calculate.
 *
 * @param calculate
 * @returns a function that will return the same value until invalidate() is called.
 */
export function cachedFnFactory<T>(calculate: () => T): (() => T) & { invalidate: () => void } {
  let valid = false
  let cachedValue: T
  const getter = () => {
    if (!valid) {
      cachedValue = calculate()
      valid = true
    }
    return cachedValue
  }
  getter.invalidate = () => {
    valid = false
  }
  return getter
}

/**
 * A function factory that returns a lazily evaluated function, which takes arguments and will return the same value
 * until invalidate() or invalidateAll() is called. This is useful for caching values that are expensive to calculate.
 *
 * @param key a function that returns a string cache key using the arguments.
 * @param calculate a function that will be called to calculate the value when it is invalidated.
 * @returns a function that will return the same value for the same arguments until invalidate() is called.
 */
export function cachedFnWithArgsFactory<FunDef extends (...args: any[]) => any>(options: {
  key: (...args: Parameters<FunDef>) => string,
  calculate: FunDef,
  name: string
}): ((...args: Parameters<FunDef>) => ReturnType<FunDef>)
  & { invalidate: (...args: Parameters<FunDef>) => void, invalidateAll: () => void } {
  // TypeScript generics are a bit complicated here. However, they ensure that invalidate() function is called
  // with the same arguments as the calculate() function. It will work even if the client code completely skips
  // explicit type definition between < and >.
  const { key, calculate, name } = options

  // The map is observable so any observers will be triggered when the cache is updated
  // The values within the map are not automatically made observable since
  // cachedFnWithArgsFactory is usually used in cases where the values are large objects
  // and usually a whole new value object is created by on each calculate call
  const cacheMap = observable.map<string, ReturnType<FunDef>>({},
    {name: name || "cachedFnWithArgs", deep: false})

  const getter = (...args: Parameters<FunDef>) => {
    const cacheKey = key(...args)
    if (!cacheMap.has(cacheKey)) {
      cacheMap.set(cacheKey, calculate(...args))
    }
    return cacheMap.get(cacheKey) as ReturnType<FunDef>
  }
  getter.invalidate = (...args: Parameters<FunDef>) => {
    const cacheKey = key(...args)
    cacheMap.delete(cacheKey)
  }
  getter.invalidateAll = () => {
    cacheMap.clear()
  }
  return getter
}

export function getDocumentContentPropertyFromNode(node: IAnyStateTreeNode, propName:string): any {
  const docContent = getParentWithTypeName(node, "DocumentContent")
  return docContent ? docContent[propName] : undefined
}
