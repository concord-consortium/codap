import { kRootDataGamesPluginUrl, kRootGuideUrl, kRootPluginUrl } from "../../constants"
import { kRelativeGuideRoot, kRelativePluginRoot, kRelativeURLRoot, processWebViewUrl } from "./web-view-utils"

const kTestUrls: Array<{ original: string, processed: string }> = [
  {
    original: `https://concord-consortium.github.io/codap-data-interactives/Markov/`,
    processed: `${kRootDataGamesPluginUrl}/Markov/index.html`
  },
  {
    original: `https://test/`,
    processed: `https://test/index.html`
  },
  {
    original: `${kRelativePluginRoot}/index.html`,
    processed: `${kRootPluginUrl}/index.html`
  },
  {
    original: `${kRelativePluginRoot}/subdir/`,
    processed: `${kRootPluginUrl}/subdir/index.html`
  },
  {
    original: `${kRelativeGuideRoot}/Markov/markov_getstarted.html`,
    processed: `${kRootGuideUrl}/Markov/markov_getstarted.html`
  },
  {
    original: `${kRelativeURLRoot}/Markov/markov_getstarted.html`,
    processed: `${kRootGuideUrl}/Markov/markov_getstarted.html`
  },
  {
    original: `http://index.html`,
    processed: `https://index.html`
  }
]

describe('WebView Utilities', () => {
  it('processPluginUrl works', () => {
    kTestUrls.forEach(({ original, processed }) => {
      expect(processWebViewUrl(original)).toEqual(processed)
    })
  })
})
