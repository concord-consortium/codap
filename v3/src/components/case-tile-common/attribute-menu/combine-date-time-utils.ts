import { getCombineDateTimePartners } from "../../../models/data/combine-date-time"
import { IDataSet } from "../../../models/data/data-set"
import { IDataSetMetadata } from "../../../models/shared/data-set-metadata"
import { preventCollectionReorg } from "../../../utilities/plugin-utils"

/**
 * Returns the attributes the user can combine with the specified attribute: visible partners whose combined
 * attribute wouldn't go in a collection a plugin locks. The menu item and the dialog both use this, so the
 * item is enabled exactly when the dialog has a partner to offer.
 */
export function getAvailableCombineDateTimePartners(
  data: IDataSet, metadata: IDataSetMetadata | undefined, attributeId: string
) {
  return getCombineDateTimePartners(data, attributeId, {
    canAddToCollection: collectionId => !preventCollectionReorg(data, collectionId),
    isHidden: attrId => !!metadata?.isHidden(attrId)
  })
}
