import { observable } from "mobx"
import {
  IAnyStateTreeNode, IDisposer, isAlive, ISerializedActionCall, getParent, getType,
  IOnActionOptions, onAction, hasParent, types, getSnapshot
} from "mobx-state-tree"

/**
 * Returns the parent of a node (if any), or undefined if there is no parent.
 *
 * @param target the MST node whose parent is to be retrieved
 * @returns the parent node, or undefined if there is no parent
 */
export function safeGetParent<T extends IAnyStateTreeNode>(target?: IAnyStateTreeNode) {
  return target && hasParent(target) ? getParent<T>(target) : undefined
}

/**
 * Returns the snapshot of a node, or undefined if the target is undefined.
 *
 * @param target the MST node whose snapshot is to be retrieved
 * @returns the snapshot of the node, or undefined if the target is undefined
 */
export function safeGetSnapshot<S>(target?: IAnyStateTreeNode): S | undefined {
  return target ? getSnapshot(target) : undefined
}

/**
 * This creates the definition for a type field in MST.
 * The field is optional so it doesn't have to be specified when creating
 * an instance.
 *
 * @param typeName the type
 * @returns the MST type definition
 */
export function typeField(typeName: string) {
  return types.optional(types.literal(typeName), typeName)
}

/**
 * This creates the definition for an optional boolean property in MST.
 * The valid values for the property are `true` or `undefined`, which
 * means that the property is not serialized unless it is true.
 *
 * @returns the MST type definition
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
 * Like cachedFnFactory, but uses a MobX observable version counter so that invalidation
 * is observable by MobX reactions and computeds. The getter only reads the observable
 * (never writes), avoiding the anti-pattern of modifying observables from within a computed.
 * When invalidate() is called (from an action), the version counter increments, MobX marks
 * any computed that read it as stale, and the next evaluation lazily recomputes the value.
 *
 * @param calculate function to compute the value when cache is invalid
 * @returns a function that returns the cached value, with an invalidate() method
 */
export function observableCachedFnFactory<T>(calculate: () => T, initialValue: T):
    (() => T) & { invalidate: () => void } {
  const _version = observable.box(0)
  let _lastVersion = -1
  let _cachedValue: T = initialValue
  const getter = () => {
    // Reading _version makes MobX track it as a dependency of any enclosing computed/reaction.
    const version = _version.get()
    if (version !== _lastVersion) {
      _cachedValue = calculate()
      _lastVersion = version
    }
    return _cachedValue
  }
  getter.invalidate = () => {
    _version.set(_version.get() + 1)
  }
  return getter
}

/**
 * A function factory that returns a lazily evaluated function, which takes arguments and will return the same value
 * until invalidate() or invalidateAll() is called. This is useful for caching values that are expensive to calculate.
 *
 * Like observableCachedFnFactory, this uses observable version counters for MobX dependency tracking
 * and a plain (non-observable) Map for cached values, so that the getter never writes to an observable.
 * Per-key versions (observable map) handle invalidate(); a global version counter handles invalidateAll().
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
  const { key, calculate, name: _name } = options

  // Observable version counters for MobX dependency tracking.
  // The getter only reads these; invalidate()/invalidateAll() write them from actions.
  const _globalVersion = observable.box(0, { name: `${_name}:globalVersion` })
  const _keyVersions = observable.map<string, number>({}, { name: `${_name}:keyVersions`, deep: false })

  // Plain (non-observable) cache so getter writes are invisible to MobX.
  const _cache = new Map<string, { value: ReturnType<FunDef>, globalVer: number, keyVer: number | undefined }>()

  const getter = (...args: Parameters<FunDef>) => {
    const cacheKey = key(...args)
    // Reading observable versions establishes MobX dependencies without writing.
    const gv = _globalVersion.get()
    const kv = _keyVersions.get(cacheKey)
    const cached = _cache.get(cacheKey)
    if (!cached || cached.globalVer !== gv || cached.keyVer !== kv) {
      const value = calculate(...args)
      _cache.set(cacheKey, { value, globalVer: gv, keyVer: kv })
      return value
    }
    return cached.value
  }
  getter.invalidate = (...args: Parameters<FunDef>) => {
    const cacheKey = key(...args)
    _cache.delete(cacheKey)
    _keyVersions.set(cacheKey, (_keyVersions.get(cacheKey) ?? 0) + 1)
  }
  getter.invalidateAll = () => {
    _cache.clear()
    _keyVersions.clear()
    _globalVersion.set(_globalVersion.get() + 1)
  }
  return getter
}

export function getDocumentContentPropertyFromNode(node: IAnyStateTreeNode, propName:string): any {
  const docContent = getParentWithTypeName(node, "DocumentContent")
  return docContent ? docContent[propName] : undefined
}
