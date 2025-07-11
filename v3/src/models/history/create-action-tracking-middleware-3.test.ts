import { addMiddleware, flow, types } from "mobx-state-tree"
import { action, makeObservable } from "mobx"
import { createActionTrackingMiddleware3, IActionTrackingMiddleware3Call } from "./create-action-tracking-middleware-3"

/**
 * This is based on MST's own createActionTrackingMiddleware2 test. The change
 * is that the actual MST actionCall is provided to the filter, onStart, and
 * onFinish hooks. This makes it possible to match this up with the
 * getRunningActionContext.
 *
 * That change required updating this test so instead of `call.name` it is now
 * call.actionCall.name
 */

function createTestMiddleware(m: any, actionName: string, value: number, calls: string[]) {
  function checkCall(call: IActionTrackingMiddleware3Call<any>) {
    expect(call.actionCall.name).toBe(actionName)
    expect(call.actionCall.args).toEqual([value])
    expect(call.actionCall.context).toBe(m)
    expect(call.env).toBe(call.actionCall.id)
  }

  const mware = createActionTrackingMiddleware3({
    filter(call) {
      return call.actionCall.name === actionName
    },
    onStart(call) {
      call.env = call.actionCall.id // just to check env is copied properly down
      calls.push(`${call.actionCall.name} (${call.actionCall.id}) - onStart`)
      checkCall(call)
    },
    onFinish(call, error) {
      calls.push(`${call.actionCall.name} (${call.actionCall.id}) - onFinish (error: ${!!error})`)
      checkCall(call)
    }
  })

  addMiddleware(m, mware, false)
}

async function doTest(m: any, mode: "success" | "fail") {
  const calls: string[] = []

  createTestMiddleware(m, "setX", 10, calls)
  createTestMiddleware(m, "setY", 9, calls)

  try {
    await m.setZ(8) // -> setY(9) -> setX(10)
    if (mode === "fail") {
      // eslint-disable-next-line jest/no-jasmine-globals
      fail("should have failed")
    }
  } catch (e) {
    if (mode === "fail") {
      expect(e).toBe("error")
    } else {
      throw e
      // fail("should have succeeded")
    }
  }

  return calls
}

async function syncTest(mode: "success" | "fail") {
  const M = types
    .model({
      x: 1,
      y: 2,
      z: 3
    })
    .actions((self) => ({
      setX(v: number) {
        self.x = v
        if (mode === "fail") {
          throw "error"
        }
      },
      setY(v: number) {
        self.y = v
        this.setX(v + 1)
      },
      setZ(v: number) {
        self.z = v
        this.setY(v + 1)
      }
    }))

  const m = M.create()

  const calls = await doTest(m, mode)

  if (mode === "success") {
    expect(calls).toEqual([
        "setY (2) - onStart",
        "setX (3) - onStart",
        "setX (3) - onFinish (error: false)",
        "setY (2) - onFinish (error: false)"
    ])
  } else {
    expect(calls).toEqual([
        "setY (5) - onStart",
        "setX (6) - onStart",
        "setX (6) - onFinish (error: true)",
        "setY (5) - onFinish (error: true)"
    ])
  }
}

// eslint-disable-next-line jest/expect-expect
test("sync action", async () => {
  await syncTest("success")
  await syncTest("fail")
})

async function flowTest(mode: "success" | "fail") {
  const _subFlow = flow(function* subFlow() {
    yield Promise.resolve()
  })

  const M = types
    .model({
        x: 1,
        y: 2,
        z: 3
    })
    .actions((self) => ({
      setX: flow(function* flowSetX(v: number) {
        yield Promise.resolve()
        yield _subFlow()
        self.x = v
        if (mode === "fail") {
          throw "error"
        }
      }),
      setY: flow(function* flowSetY(v: number) {
        self.y = v
        yield (self as any).setX(v + 1)
      }),
      setZ: flow(function* flowSetZ(v: number) {
        self.z = v
        yield (self as any).setY(v + 1)
      })
    }))

  const m = M.create()

  const calls = await doTest(m, mode)

  if (mode === "success") {
    expect(calls).toEqual([
      "setY (9) - onStart",
      "setX (11) - onStart",
      "setX (11) - onFinish (error: false)",
      "setY (9) - onFinish (error: false)"
    ])
  } else {
    expect(calls).toEqual([
      "setY (16) - onStart",
      "setX (18) - onStart",
      "setX (18) - onFinish (error: true)",
      "setY (16) - onFinish (error: true)"
    ])
  }
}

// eslint-disable-next-line jest/expect-expect
test("flow action", async () => {
  await flowTest("success")
  await flowTest("fail")
})

test("#1250", async () => {
  const M = types
    .model({
      x: 0,
      y: 0
    })
    .actions((self) => ({
      setX: flow(function* () {
        self.x = 10
        yield new Promise((resolve) => setTimeout(resolve, 1000))
      }),
      setY() {
        self.y = 10
      }
    }))

  const calls: string[] = []
  const mware = createActionTrackingMiddleware3({
    filter(call) {
      calls.push(
        `${call.actionCall.name} (${call.actionCall.id}) <- (${
          call.parentCall?.actionCall.id
        }) - filter`
      )
      return true
    },
    onStart(call) {
      calls.push(
        `${call.actionCall.name} (${call.actionCall.id}) <- (${
          call.parentCall?.actionCall.id
        }) - onStart`
      )
    },
    onFinish(call, error) {
      calls.push(
        `${call.actionCall.name} (${call.actionCall.id}) <- (${
          call.parentCall?.actionCall.id
        }) - onFinish (error: ${!!error})`
      )
    }
  })

  const model = M.create({})

  addMiddleware(model, mware, false)

  expect(model.x).toBe(0)
  expect(model.y).toBe(0)
  expect(calls).toEqual([])

  const p = model.setX()
  expect(model.x).toBe(10)
  expect(model.y).toBe(0)
  expect(calls).toEqual([
    "setX (21) <- (undefined) - filter",
    "setX (21) <- (undefined) - onStart"
  ])
  calls.length = 0

  await new Promise<void>((r) =>
    setTimeout(() => {
      model.setY()
      r()
    }, 500)
  )
  expect(model.x).toBe(10)
  expect(model.y).toBe(10)
  expect(calls).toEqual([
    "setY (23) <- (undefined) - filter",
    "setY (23) <- (undefined) - onStart",
    "setY (23) <- (undefined) - onFinish (error: false)"
  ])
  calls.length = 0

  await p
  expect(model.x).toBe(10)
  expect(model.y).toBe(10)
  expect(calls).toEqual(["setX (21) <- (undefined) - onFinish (error: false)"])
  calls.length = 0
})

test("MobX action calling MST actions, causes separate calls for each MST action", async () => {
  const M = types
    .model({
      x: 0,
      y: 0
    })
    .actions((self) => ({
      setX() {
        self.x = 10
      },
      setY() {
        self.y = 10
      }
    }))

  const calls: string[] = []
  const mware = createActionTrackingMiddleware3({
    filter(call) {
      calls.push(
        `${call.actionCall.name} (${call.actionCall.id}) <- (${
          call.parentCall?.actionCall.id
        }) - filter`
      )
      return true
    },
    onStart(call) {
      calls.push(
        `${call.actionCall.name} (${call.actionCall.id}) <- (${
          call.parentCall?.actionCall.id
        }) - onStart`
      )
    },
    onFinish(call, error) {
      calls.push(
        `${call.actionCall.name} (${call.actionCall.id}) <- (${
          call.parentCall?.actionCall.id
        }) - onFinish (error: ${!!error})`
      )
    }
  })

  const model = M.create({})

  addMiddleware(model, mware, false)

  class MobXModel {
    constructor() {
      makeObservable(this, {
        parentAction: action,
      })
    }

    parentAction() {
      model.setX()
      model.setY()
    }
  }

  const mobxModel = new MobXModel()
  mobxModel.parentAction()

  // Note the call ids are based on calls run in previous tests
  // so if you run this test in isolation or a different order the ids will be different.
  expect(calls).toEqual([
    "setX (24) <- (undefined) - filter",
    "setX (24) <- (undefined) - onStart",
    "setX (24) <- (undefined) - onFinish (error: false)",
    "setY (25) <- (undefined) - filter",
    "setY (25) <- (undefined) - onStart",
    "setY (25) <- (undefined) - onFinish (error: false)"
  ])
})
