import { kWebViewTileType } from "../../components/web-view/web-view-defs"
import { IWebViewModel, isWebViewModel } from "../../components/web-view/web-view-model"
import { IDocumentModel } from "./document"

export async function serializeDocument<T>(document: IDocumentModel, serializeFn: (doc: IDocumentModel) => T) {
  console.log(`--- serializing document`)
  // let snap: T | undefined = undefined
  try {
    const webViewModels = document.content?.getTilesOfType(kWebViewTileType).map(tile => {
      return isWebViewModel(tile.content) ? tile.content : undefined
    }).filter(content => !!content) as IWebViewModel[]
    const promises = webViewModels.map(content => new Promise((resolve, reject) => content.updateSavedState(resolve)))
    // const promises = document.content?.getTilesOfType(kWebViewTileType).map(tile => {
    //   const content = isWebViewModel(tile.content) ? tile.content : undefined
    //   return content?.updateSavedState() ?? { success: false }
    // })
    console.log(` -- promises`, promises)
    const results = await Promise.all(promises)
    console.log(`  - promise results`, results)

    document.prepareSnapshot()

    // perform the serialization of the prepared document
    const serialized = serializeFn(document)
    console.log(` -- serialized`, serialized)
    // snap = serialized
    return serialized
  }
  finally {
    console.log(` -- finally`)
    document.completeSnapshot()
  }
  // console.log(`  - snap`, snap)
  // return snap
}
