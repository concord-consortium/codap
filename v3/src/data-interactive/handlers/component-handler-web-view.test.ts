import { appState } from "../../models/app-state"
import { toV3Id } from "../../utilities/codap-utils"
import { DIComponentInfo } from "../data-interactive-types"
import { diComponentHandler } from "./component-handler"
import { kWebViewIdPrefix } from "../../components/web-view/web-view-registration"
import { IWebViewModel, isWebViewModel } from "../../components/web-view/web-view-model"


describe("DataInteractive ComponentHandler WebView and Game", () => {
  const handler = diComponentHandler
  const documentContent = appState.document.content!

  it("create webView and game work", () => {
    // Create a blank webView
    expect(documentContent.tileMap.size).toBe(0)
    const result = handler.create!({}, { type: "webView" })
    expect(result.success).toBe(true)
    expect(documentContent.tileMap.size).toBe(1)
    const resultValues = result.values as DIComponentInfo
    const tile = documentContent.tileMap.get(toV3Id(kWebViewIdPrefix, resultValues.id!))!
    expect(tile).toBeDefined()
    expect(isWebViewModel(tile.content)).toBe(true)

    // Delete webView tile
    const deleteResult = handler.delete?.({ component: tile })
    expect(deleteResult?.success).toBe(true)
    expect(documentContent.tileMap.size).toBe(0)

    // Create webView with url
    const wikipediaUrl = "https://wikipedia.org"
    const result2 = handler.create!({}, { type: "webView", URL: wikipediaUrl })
    expect(result2.success).toBe(true)
    expect(documentContent.tileMap.size).toBe(1)
    const result2Values = result2.values as DIComponentInfo
    const tile2 = documentContent.tileMap.get(toV3Id(kWebViewIdPrefix, result2Values.id!))!
    expect(tile2).toBeDefined()
    expect(isWebViewModel(tile2.content)).toBe(true)
    expect((tile2.content as IWebViewModel).url).toBe(wikipediaUrl)

    // Create game with url
    const multidataUrl = "https://codap.concord.org/multidata-plugin/"
    const result3 = handler.create!({}, { type: "game", URL: multidataUrl })
    expect(result3.success).toBe(true)
    expect(documentContent.tileMap.size).toBe(2)
    const result3Values = result3.values as DIComponentInfo
    const tile3 = documentContent.tileMap.get(toV3Id(kWebViewIdPrefix, result3Values.id!))!
    expect(tile3).toBeDefined()
    expect(isWebViewModel(tile3.content)).toBe(true)
    expect((tile3.content as IWebViewModel).url).toBe(multidataUrl)
  })
})
