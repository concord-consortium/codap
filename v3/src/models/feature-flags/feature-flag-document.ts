import { isCodapV2Document } from "../../v2/codap-v2-types"
import { ISerializedDocument } from "../document/serialize-document"
import { featureFlagManager } from "./feature-flag-manager"

/*
 * Records this session's url-enabled feature flags in the document being saved,
 * so that a shared document becomes a way to hand someone a piloted feature
 * without also handing them a query string.
 *
 * The new value is the union of the flags already in the document and the flags
 * enabled by url, which has two consequences worth stating plainly:
 *
 *  - An explicit `?features=-foo` does not strip an existing grant. Disabling is
 *    session-scoped, and the document may still contain artifacts of the feature;
 *    removing the flag would orphan them.
 *  - Grants therefore accumulate, and are a one-way door. Retiring a flag from
 *    the registry is what eventually makes stale grants inert.
 *
 * This runs on the serialized snapshot rather than in prepareSnapshot() because
 * writing to the MST tree would register with the tree monitor and leave the
 * document dirty immediately after a save.
 *
 * v2 output has nowhere to put feature flags, so v2 saves drop them. Saving as v2
 * is a developer debug option (`debug=saveAsV2`), not a user-facing path.
 */
export function addFeatureFlagGrants(
  snapshot: ISerializedDocument, urlEnabledFlags = featureFlagManager.urlEnabledFlags
) {
  if (!urlEnabledFlags.length) return
  if (isCodapV2Document(snapshot)) return

  const content = snapshot.content
  if (!content) return

  const existing = content.featureFlags ?? []
  const merged = Array.from(new Set([...existing, ...urlEnabledFlags])).sort()
  if (merged.length !== existing.length) {
    content.featureFlags = merged
  }
}
