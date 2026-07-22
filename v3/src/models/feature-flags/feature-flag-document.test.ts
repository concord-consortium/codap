import { ISerializedDocument } from "../document/serialize-document"
import { addFeatureFlagGrants } from "./feature-flag-document"

const kFlag = "residualPlot"

function v3Snapshot(featureFlags?: string[]): ISerializedDocument {
  return { type: "CODAP", content: { ...(featureFlags ? { featureFlags } : {}) } }
}

describe("addFeatureFlagGrants", () => {
  it("records a flag this session enabled via the url", () => {
    const snapshot = v3Snapshot()
    addFeatureFlagGrants(snapshot, [kFlag])
    expect((snapshot as any).content.featureFlags).toEqual([kFlag])
  })

  it("does not duplicate a grant the document already carries", () => {
    const snapshot = v3Snapshot([kFlag])
    addFeatureFlagGrants(snapshot, [kFlag])
    expect((snapshot as any).content.featureFlags).toEqual([kFlag])
  })

  // disabling is session-scoped; the document may still contain artifacts of the
  // feature, and stripping the flag would orphan them
  it("leaves an existing grant in place when this session enabled nothing", () => {
    const snapshot = v3Snapshot([kFlag])
    addFeatureFlagGrants(snapshot, [])
    expect((snapshot as any).content.featureFlags).toEqual([kFlag])
  })

  it("leaves a document with no grants alone when this session enabled nothing", () => {
    const snapshot = v3Snapshot()
    addFeatureFlagGrants(snapshot, [])
    expect((snapshot as any).content.featureFlags).toBeUndefined()
  })

  it("ignores v2 documents, which have nowhere to record flags", () => {
    const snapshot = { appName: "DG", components: [], contexts: [] } as any
    addFeatureFlagGrants(snapshot, [kFlag])
    expect(snapshot.content).toBeUndefined()
    expect(snapshot.featureFlags).toBeUndefined()
  })
})
