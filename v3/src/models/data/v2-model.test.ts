import {
  V2Model, V2ModelStorage, isV2ModelSnapshot, v2ModelSnapshotFromV2ModelStorage, v2NameTitleToV3Title
} from "./v2-model"

describe("V2Model", () => {
  it("can be constructed without arguments", () => {
    const m = V2Model.create()
    expect(m.id).toBeDefined()
    expect(m.name).toBe("")
    expect(m._title).toBeUndefined()
    expect(m.title).toBe("")
    expect(m.matchNameOrId("")).toBe(false)
    expect(m.matchTitleOrNameOrId("")).toBe(false)

    m.setName("name")
    expect(m.id).toBeDefined()
    expect(m.name).toBe("name")
    expect(m._title).toBeUndefined()
    expect(m.title).toBe("name")
    expect(m.matchNameOrId("")).toBe(false)
    expect(m.matchNameOrId("name")).toBe(true)
    expect(m.matchTitleOrNameOrId("")).toBe(false)
    expect(m.matchTitleOrNameOrId("name")).toBe(true)

    m.setTitle("title")
    expect(m.id).toBeDefined()
    expect(m.name).toBe("name")
    expect(m._title).toBe("title")
    expect(m.title).toBe("title")
    expect(m.matchNameOrId("")).toBe(false)
    expect(m.matchNameOrId("name")).toBe(true)
    expect(m.matchNameOrId("title")).toBe(false)
    expect(m.matchTitleOrNameOrId("")).toBe(false)
    expect(m.matchTitleOrNameOrId("name")).toBe(true)
    expect(m.matchTitleOrNameOrId("title")).toBe(true)
  })

  it("can be constructed with v2Id and name", () => {
    const m = V2Model.create({ id: "1", name: "name" })
    expect(m.id).toBe("1")
    expect(m.name).toBe("name")
    expect(m._title).toBeUndefined()
    expect(m.title).toBe("name")
    expect(m.matchNameOrId(1)).toBe(true)
    expect(m.matchNameOrId("name")).toBe(true)
    expect(m.matchNameOrId("1")).toBe(true)

    m.setTitle("title")
    expect(m.id).toBe("1")
    expect(m.name).toBe("name")
    expect(m._title).toBe("title")
    expect(m.title).toBe("title")
    expect(m.matchNameOrId(1)).toBe(true)
    expect(m.matchNameOrId("name")).toBe(true)
    expect(m.matchNameOrId("1")).toBe(true)
    expect(m.matchNameOrId("title")).toBe(false)
  })

  it("can identify v2 storage objects", () => {
    expect(isV2ModelSnapshot()).toBe(false)
    let m: V2ModelStorage = {
      id: 1,
      name: "name",
      title: "title"
    } as V2ModelStorage
    expect(isV2ModelSnapshot(m)).toBe(false)
    m = {
      id: 1,
      guid: 1,
      name: "name",
      title: "title"
    }
    expect(isV2ModelSnapshot(m)).toBe(true)
  })

  it("can convert v2 name/title to v3 title", () => {
    expect(v2NameTitleToV3Title("name")).toBeUndefined()
    expect(v2NameTitleToV3Title("name", "name")).toBeUndefined()
    expect(v2NameTitleToV3Title("name", "title")).toBe("title")
  })

  it("can be constructed from v2 storage object", () => {
    let v2m: V2ModelStorage = {
      guid: 1
    } as V2ModelStorage
    let m = V2Model.create(v2ModelSnapshotFromV2ModelStorage("MODL", v2m))
    expect(m.id).toBe("MODL1")
    expect(m.name).toBe("")
    expect(m._title).toBeUndefined()

    v2m = {
      id: 1,
      guid: 1,
      name: "name",
      title: "title"
    }
    m = V2Model.create(v2ModelSnapshotFromV2ModelStorage("MODL", v2m))
    expect(m.id).toBe("MODL1")
    expect(m.name).toBe("name")
    expect(m._title).toBe("title")
  })
})
