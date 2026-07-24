import { joinNotification } from "../../components/case-table/case-table-notifications"
import { safeSymbolName } from "../formula/utils/name-mapping-utils"
import { escapeBacktickString } from "../formula/utils/string-utils"
import { ITileModel } from "../tiles/tile-model"
import { IAttribute } from "./attribute"
import { ICollectionModel } from "./collection"
import { IDataSet } from "./data-set"
import { createAttributesNotification, dependentCasesNotification } from "./data-set-notifications"
import { uniqueName } from "../../utilities/js-utils"
import { t } from "../../utilities/translation/translate"

// Wraps an attribute name in backticks if it contains characters that aren't valid in
// a bare formula identifier (spaces, leading digit, punctuation, etc.). Any backticks
// or backslashes in the name are escaped so the wrapped form parses correctly.
function asFormulaIdentifier(name: string) {
  return name === safeSymbolName(name) ? name : `\`${escapeBacktickString(name)}\``
}

export interface IJoinSourceToDestCollectionParams {
  /** The source dataset containing the attributes to join */
  sourceDataSet: IDataSet
  /** The attribute ID in the source that serves as the join key */
  sourceKeyAttributeId: string
  /** The destination dataset to add the joined attributes to */
  destDataSet: IDataSet
  /** The collection in the destination dataset to add attributes to */
  destCollection: ICollectionModel
  /** The attribute ID in the destination that serves as the join key */
  destKeyAttributeId: string
  /**
   * The destination case-table tile this join was initiated from, if any. When provided,
   * a `join` notification is emitted on its component resource for V2-plugin compatibility
   * (CODAP-1353). No-ops for non-case-table tiles.
   */
  destTile?: ITileModel
}

/**
 * Joins attributes from a source dataset to a destination dataset by creating new attributes
 * with lookupByKey formulas.
 *
 * When an attribute from one table is dropped onto an attribute in another table, this function:
 * 1. Gets all attributes from the source collection (excluding the key attribute)
 * 2. Creates a new attribute in the destination collection for each source attribute
 * 3. Each new attribute has a lookupByKey formula that retrieves values from the source
 *
 * For example, if "Name" from "Mammals" is dropped onto "Species" in "Cats":
 * - Each non-key attribute from Mammals (e.g., "LifeSpan") gets added to Cats
 * - The formula is: lookupByKey("Mammals", "LifeSpan", "Name", Species)
 */
export function joinSourceToDestCollection(params: IJoinSourceToDestCollectionParams) {
  const {
    sourceDataSet,
    sourceKeyAttributeId,
    destDataSet,
    destCollection,
    destKeyAttributeId,
    destTile
  } = params

  // Get the source collection containing the key attribute
  const sourceCollection = sourceDataSet.getCollectionForAttribute(sourceKeyAttributeId)
  if (!sourceCollection) {
    console.warn("joinSourceToDestCollection: source collection not found")
    return
  }

  // Get the source and destination key attribute names for formulas
  const sourceKeyAttr = sourceDataSet.getAttribute(sourceKeyAttributeId)
  const destKeyAttr = destDataSet.getAttribute(destKeyAttributeId)
  if (!sourceKeyAttr || !destKeyAttr) {
    console.warn("joinSourceToDestCollection: key attribute not found")
    return
  }

  const sourceDataSetName = sourceDataSet.title || sourceDataSet.name
  const destDataSetName = destDataSet.title || destDataSet.name
  const sourceKeyAttrName = sourceKeyAttr.name
  const destKeyAttrName = destKeyAttr.name

  // Get all attributes from the source collection except the key attribute
  const attributesToJoin = sourceCollection.attributes.filter(
    attr => attr && attr.id !== sourceKeyAttributeId
  ) as IAttribute[]

  if (attributesToJoin.length === 0) {
    return
  }

  // Create the new attributes with formulas
  const createdAttributes: IAttribute[] = []

  destDataSet.applyModelChange(
    () => {
      attributesToJoin.forEach(sourceAttr => {
        // Handle name conflicts by appending _1, _2, etc.
        const newName = uniqueName(
          sourceAttr.name,
          (name: string) => !destDataSet.getAttributeByName(name)
        )

        // Create the lookupByKey formula
        // Format: lookupByKey("dataSetName", "attributeName", "keyAttributeName", localKeyAttribute)
        // The first three arguments are string constants; the fourth is a symbol referencing
        // a local attribute, so it must be wrapped in backticks when the name contains
        // characters that aren't valid in a bare formula identifier (e.g. spaces).
        const formula = `lookupByKey("${sourceDataSetName}", "${sourceAttr.name}", ` +
          `"${sourceKeyAttrName}", ${asFormulaIdentifier(destKeyAttrName)})`

        // Add the new attribute to the destination collection
        const newAttr = destDataSet.addAttribute(
          {
            name: newName,
            formula: { display: formula }
          },
          { collection: destCollection.id }
        )

        if (newAttr) {
          // Set the canonical expression to the same as display for now
          // The formula manager will handle proper canonicalization
          newAttr.formula?.setCanonicalExpression(formula)
          createdAttributes.push(newAttr)
        }
      })
    },
    {
      undoStringKey: t("DG.Undo.DataContext.join", { vars: [sourceDataSetName, destDataSetName] }),
      redoStringKey: t("DG.Redo.DataContext.join", { vars: [sourceDataSetName, destDataSetName] }),
      notify: [
        // `joinNotification` no-ops for non-case-table tiles, so it's safe to include
        // here even when the join was initiated outside a case-table context.
        () => createAttributesNotification(createdAttributes, destDataSet),
        () => dependentCasesNotification(destDataSet),
        () => joinNotification(destTile)
      ],
      log: `Joined ${sourceCollection.name} to ${destCollection.name}`
    }
  )

  return createdAttributes
}

/**
 * Generates the join tip message shown during drag-over
 */
export function getJoinTip(
  sourceDataSet: IDataSet,
  sourceKeyAttributeId: string,
  destDataSet: IDataSet,
  destKeyAttributeId: string
): string {
  const sourceCollection = sourceDataSet.getCollectionForAttribute(sourceKeyAttributeId)
  const destCollection = destDataSet.getCollectionForAttribute(destKeyAttributeId)
  const sourceKeyAttr = sourceDataSet.getAttribute(sourceKeyAttributeId)
  const destKeyAttr = destDataSet.getAttribute(destKeyAttributeId)

  if (!sourceCollection || !destCollection || !sourceKeyAttr || !destKeyAttr) {
    return ""
  }

  // DG.Collection.joinTip: "Join %@ in %@ to %@ in %@ by matching %@ with %@"
  // Parameters: sourceCollection, sourceContext, destCollection, destContext, sourceAttribute, destAttribute
  return t("DG.Collection.joinTip", {
    vars: [
      sourceCollection.name,
      sourceDataSet.displayTitle,
      destCollection.name,
      destDataSet.displayTitle,
      sourceKeyAttr.name,
      destKeyAttr.name
    ]
  })
}
