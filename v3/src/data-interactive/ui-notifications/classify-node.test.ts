import {
  buildTarget, classifyNode, findMarkers, isHiddenSubtree, resolveDisabled, resolveInteractionKind, tileIdOf
} from "./classify-node"

describe("classifyNode", () => {
  beforeEach(() => {
    document.body.innerHTML = ""
  })

  it("returns workspace for .free-tile-component descendant with tile id", () => {
    document.body.innerHTML = `
      <div class="free-tile-component" id="GRPH44">
        <button data-testid="x"></button>
      </div>`
    const el = document.querySelector("button")!
    const cls = classifyNode(el)
    expect(cls.region).toBe("workspace")
    expect(cls.componentId).toBe("GRPH44")
  })

  it("returns header for .menu-bar descendant", () => {
    document.body.innerHTML = `<div class="menu-bar"><button></button></div>`
    const el = document.querySelector("button")!
    expect(classifyNode(el).region).toBe("header")
  })

  it("returns header for .tool-shelf descendant", () => {
    document.body.innerHTML = `<div class="tool-shelf"><button></button></div>`
    expect(classifyNode(document.querySelector("button")).region).toBe("header")
  })

  it("follows aria-labelledby ancestor to trigger", () => {
    document.body.innerHTML = `
      <div class="menu-bar">
        <button id="trig" data-testid="file-menu-button"></button>
      </div>
      <div class="menu-list-container" aria-labelledby="trig">
        <div role="menuitem" id="mi"></div>
      </div>`
    const mi = document.getElementById("mi")!
    expect(classifyNode(mi).region).toBe("header")
  })

  it("returns header for CFM dialog marker", () => {
    document.body.innerHTML = `
      <div class="modal">
        <div class="modal-content">
          <section class="modal-dialog-container" role="dialog"></section>
        </div>
      </div>`
    const dialog = document.querySelector(".modal-dialog-container")!
    expect(classifyNode(dialog).region).toBe("header")
  })

  it("returns overlay for Chakra-portaled marker without recent click", () => {
    document.body.innerHTML = `
      <div class="chakra-portal">
        <div class="chakra-menu__menu-list" id="ml"></div>
      </div>`
    const ml = document.getElementById("ml")!
    expect(classifyNode(ml, { recentClick: undefined, nowMs: 100000 }).region).toBe("overlay")
  })

  it("upgrades overlay to recent-click region when within 500ms", () => {
    document.body.innerHTML = `
      <div class="chakra-portal">
        <div class="chakra-menu__menu-list" id="ml"></div>
      </div>`
    const ml = document.getElementById("ml")!
    const cls = classifyNode(ml, {
      recentClick: { timestampMs: 100, region: "workspace", componentId: "TABL1" },
      nowMs: 200
    })
    expect(cls.region).toBe("workspace")
    expect(cls.componentId).toBe("TABL1")
  })

  it("does not upgrade overlay when older than 500ms", () => {
    document.body.innerHTML = `
      <div class="chakra-portal">
        <div class="chakra-menu__menu-list" id="ml"></div>
      </div>`
    const ml = document.getElementById("ml")!
    const cls = classifyNode(ml, {
      recentClick: { timestampMs: 100, region: "workspace", componentId: "TABL1" },
      nowMs: 700
    })
    expect(cls.region).toBe("overlay")
  })
})

describe("isHiddenSubtree", () => {
  beforeEach(() => { document.body.innerHTML = "" })

  it("returns true when ancestor has aria-hidden='true'", () => {
    document.body.innerHTML = `<div aria-hidden="true"><span id="x"></span></div>`
    expect(isHiddenSubtree(document.getElementById("x"))).toBe(true)
  })

  it("returns false when no aria-hidden ancestor", () => {
    document.body.innerHTML = `<div><span id="x"></span></div>`
    expect(isHiddenSubtree(document.getElementById("x"))).toBe(false)
  })

  it("re-admits when aria-hidden flips to false", () => {
    document.body.innerHTML = `<div aria-hidden="false"><span id="x"></span></div>`
    expect(isHiddenSubtree(document.getElementById("x"))).toBe(false)
  })
})

describe("findMarkers", () => {
  beforeEach(() => { document.body.innerHTML = "" })

  it("matches the root itself", () => {
    document.body.innerHTML = `<div class="chakra-menu__menu-list" id="r"></div>`
    const r = document.getElementById("r")!
    expect(findMarkers(r).map(e => e.id)).toEqual(["r"])
  })

  it("matches descendants", () => {
    document.body.innerHTML = `
      <div id="wrap">
        <div class="modal-dialog-container" id="d" role="dialog"></div>
      </div>`
    const wrap = document.getElementById("wrap")!
    expect(findMarkers(wrap).map(e => e.id)).toContain("d")
  })

  it("skips descendant walk on .free-tile-component", () => {
    document.body.innerHTML = `
      <div class="free-tile-component" id="tile">
        <div class="chakra-menu__menu-list" id="ml"></div>
      </div>`
    const tile = document.getElementById("tile")!
    expect(findMarkers(tile).map(e => e.id)).not.toContain("ml")
  })

  it("dedupes React Aria Popover wrapper when inner class-based menu marker exists", () => {
    document.body.innerHTML = `
      <div id="pop" role="dialog">
        <div id="ml" class="menu-list-container" role="menu">
          <div id="i0" role="menuitem"></div>
          <div id="i1" role="menuitem"></div>
        </div>
      </div>`
    const pop = document.getElementById("pop")!
    const ids = findMarkers(pop).map(e => e.id)
    // The outer role="dialog" wrapper is dropped; the class-based menu and both
    // menuitems are reported.
    expect(ids).not.toContain("pop")
    expect(ids).toContain("ml")
    expect(ids).toContain("i0")
    expect(ids).toContain("i1")
  })

  it("keeps standalone role='dialog' when no class marker is in the chain", () => {
    document.body.innerHTML = `<div id="d" role="dialog"><span>hi</span></div>`
    const d = document.getElementById("d")!
    expect(findMarkers(d).map(e => e.id)).toContain("d")
  })
})

describe("resolveInteractionKind", () => {
  it("prefers ARIA role", () => {
    const el = document.createElement("div")
    el.setAttribute("role", "button")
    el.setAttribute("data-role", "axis-drag-rect")
    expect(resolveInteractionKind(el)).toBe("button")
  })

  it("falls back to data-role", () => {
    const el = document.createElement("div")
    el.setAttribute("data-role", "axis-drag-rect")
    expect(resolveInteractionKind(el)).toBe("axis-drag-rect")
  })

  it("returns undefined when neither", () => {
    const el = document.createElement("div")
    expect(resolveInteractionKind(el)).toBeUndefined()
  })
})

describe("resolveDisabled", () => {
  it("detects aria-disabled=true", () => {
    const el = document.createElement("div")
    el.setAttribute("aria-disabled", "true")
    expect(resolveDisabled(el)).toBe(true)
  })

  it("detects native disabled", () => {
    const el = document.createElement("button")
    ;(el).disabled = true
    expect(resolveDisabled(el)).toBe(true)
  })

  it("returns undefined when enabled", () => {
    const el = document.createElement("button")
    expect(resolveDisabled(el)).toBeUndefined()
  })
})

describe("buildTarget", () => {
  beforeEach(() => { document.body.innerHTML = "" })

  it("includes testId, interactionKind, tag", () => {
    document.body.innerHTML = `
      <button data-testid="foo" role="button"></button>`
    const el = document.querySelector("button")!
    const t = buildTarget(el)
    expect(t.testId).toBe("foo")
    expect(t.interactionKind).toBe("button")
    expect(t.tag).toBe("BUTTON")
  })

  it("sets disabled: true when aria-disabled", () => {
    document.body.innerHTML = `<button data-testid="x" aria-disabled="true"></button>`
    const el = document.querySelector("button")!
    expect(buildTarget(el).disabled).toBe(true)
  })

  it("omits disabled when enabled", () => {
    document.body.innerHTML = `<button data-testid="x"></button>`
    const el = document.querySelector("button")!
    expect(buildTarget(el).disabled).toBeUndefined()
  })
})

describe("tileIdOf", () => {
  beforeEach(() => { document.body.innerHTML = "" })

  it("returns tile id for descendants", () => {
    document.body.innerHTML = `<div class="free-tile-component" id="TABL1"><span id="x"></span></div>`
    expect(tileIdOf(document.getElementById("x"))).toBe("TABL1")
  })

  it("returns undefined outside tile", () => {
    document.body.innerHTML = `<div><span id="x"></span></div>`
    expect(tileIdOf(document.getElementById("x"))).toBeUndefined()
  })
})
