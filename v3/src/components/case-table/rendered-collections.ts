import { ICollectionModel } from "../../models/data/collection"

/**
 * Returns the collections the case table renders, in parent-to-child order. A collection whose
 * attributes are all hidden is omitted, since its grid would show only the index column; the
 * relationship lines then connect the rendered collections on either side of it. If no collection
 * has a visible attribute, the childmost collection is rendered on its own, so a table with
 * everything hidden still shows its cases.
 */
export function getRenderedCollections(collections: ICollectionModel[], isHidden: (attrId: string) => boolean) {
  const rendered = collections.filter(collection => collection.attributes.some(attr => attr && !isHidden(attr.id)))
  return rendered.length ? rendered : collections.slice(-1)
}
