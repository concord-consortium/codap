import { kRootPluginUrl } from "../../constants"
import { kRelativePluginRoot, processWebViewUrl } from "./web-view-utils"

describe('WebView Utilities', () => {
  it('processPluginUrl works', () => {
    const url1 = `https://test/`
    const processedUrl1 = `${url1}index.html`
    expect(processWebViewUrl(url1)).toEqual(processedUrl1)

    const url2 = `${kRelativePluginRoot}/index.html`
    const processedUrl2 = `${kRootPluginUrl}/index.html`
    expect(processWebViewUrl(url2)).toEqual(processedUrl2)

    const url3 = `http://index.html`
    const processedUrl3 = `https://index.html`
    expect(processWebViewUrl(url3)).toEqual(processedUrl3)
  })
})
