import { IActionContext, IMiddlewareEvent, IMiddlewareHandler } from "mobx-state-tree"


/**
 * This is based on MST's own createActionTrackingMiddleware2. The change is that
 * the actual actionContext is provided to the filter, onStart, and onFinish hooks.
 * This makes it possible to match this up with the getRunningActionContext.
 *
 * Because we are customizing this, it might be best to just combine this with the
 * tree monitor code and remove the extra abstraction.
 */

export interface IActionTrackingMiddleware3Call<TEnv> {
  actionCall: Readonly<IActionContext>
  env: TEnv | undefined
  readonly parentCall?: IActionTrackingMiddleware3Call<TEnv>
}

export interface IActionTrackingMiddleware3Hooks<TEnv> {
  filter?: (call: IActionTrackingMiddleware3Call<TEnv>) => boolean
  onStart: (call: IActionTrackingMiddleware3Call<TEnv>) => void
  onFinish: (call: IActionTrackingMiddleware3Call<TEnv>, error?: any) => void
}

class RunningAction {
  private flowsPending = 0
  private running = true

  constructor(
    public readonly hooks: IActionTrackingMiddleware3Hooks<any> | undefined,
    readonly call: IActionTrackingMiddleware3Call<any>
  ) {
    if (hooks) {
      hooks.onStart(call)
    }
  }

  finish(error?: any) {
    if (this.running) {
      this.running = false
      if (this.hooks) {
        this.hooks.onFinish(this.call, error)
      }
    }
  }

  incFlowsPending() {
    this.flowsPending++
  }

  decFlowsPending() {
    this.flowsPending--
  }

  get hasFlowsPending() {
    return this.flowsPending > 0
  }
}

/**
 * Convenience utility to create action based middleware that supports async processes more easily.
 * The flow is like this:
 * - for each action: if filter passes -> `onStart` -> (inner actions recursively) -> `onFinish`
 *
 * Example: if we had an action `a` that called inside an action `b1`, then `b2` the flow would be:
 * - `filter(a)`
 * - `onStart(a)`
 *   - `filter(b1)`
 *   - `onStart(b1)`
 *   - `onFinish(b1)`
 *   - `filter(b2)`
 *   - `onStart(b2)`
 *   - `onFinish(b2)`
 * - `onFinish(a)`
 *
 * The flow is the same no matter if the actions are sync or async.
 *
 * See the `atomic` middleware for an example
 *
 * @param hooks
 * @returns
 */
export function createActionTrackingMiddleware3<TEnv = any>(
  middlewareHooks: IActionTrackingMiddleware3Hooks<TEnv>
): IMiddlewareHandler {
  const runningActions = new WeakMap<IMiddlewareEvent, RunningAction>()

  return function actionTrackingMiddleware(
      call: IMiddlewareEvent,
      next: (actionCall: IMiddlewareEvent) => any
  ) {
    // find parentRunningAction
    const parentRunningAction = call.parentActionEvent
      ? runningActions.get(call.parentActionEvent)
      : undefined

    if (call.type === "action") {
      const newCall: IActionTrackingMiddleware3Call<TEnv> = {
        actionCall: call,
        // make a shallow copy of the parent action env
        env: parentRunningAction?.call.env,
        parentCall: parentRunningAction?.call
      }

      const passesFilter = !middlewareHooks.filter || middlewareHooks.filter(newCall)
      const hooks = passesFilter ? middlewareHooks : undefined

      const runningAction = new RunningAction(hooks, newCall)
      runningActions.set(call, runningAction)

      let res
      try {
        res = next(call)
      } catch (e) {
        runningAction.finish(e)
        throw e
      }

      if (!runningAction.hasFlowsPending) {
        // sync action finished
        runningAction.finish()
      }
      return res
    } else {
      if (!parentRunningAction) {
          return next(call)
      }

      switch (call.type) {
        case "flow_spawn": {
          parentRunningAction.incFlowsPending()
          return next(call)
        }
        case "flow_resume":
        case "flow_resume_error": {
          return next(call)
        }
        case "flow_throw": {
          const error = call.args[0]
          try {
            return next(call)
          } finally {
            parentRunningAction.decFlowsPending()
            if (!parentRunningAction.hasFlowsPending) {
              parentRunningAction.finish(error)
            }
          }
        }
        case "flow_return": {
          try {
            return next(call)
          } finally {
            parentRunningAction.decFlowsPending()
            if (!parentRunningAction.hasFlowsPending) {
              parentRunningAction.finish()
            }
          }
        }
      }
    }
  }
}
