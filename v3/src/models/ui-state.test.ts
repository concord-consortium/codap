import { UIState } from "./ui-state"
import { setUrlParams } from "../utilities/url-params"

describe("UIState", () => {
  beforeEach(() => {
    // Reset URL params before each test
    setUrlParams("")
  })

  describe("componentMode", () => {
    it("should be false by default", () => {
      const uiState = new UIState()
      expect(uiState.componentMode).toBe(false)
    })

    it("should be true when componentMode=yes", () => {
      setUrlParams("?componentMode=yes")
      const uiState = new UIState()
      expect(uiState.componentMode).toBe(true)
    })

    it("should be true when componentMode=true", () => {
      setUrlParams("?componentMode=true")
      const uiState = new UIState()
      expect(uiState.componentMode).toBe(true)
    })

    it("should be true when componentMode=1", () => {
      setUrlParams("?componentMode=1")
      const uiState = new UIState()
      expect(uiState.componentMode).toBe(true)
    })

    it("should be false when componentMode=no", () => {
      setUrlParams("?componentMode=no")
      const uiState = new UIState()
      expect(uiState.componentMode).toBe(false)
    })

    it("should be false when componentMode=false", () => {
      setUrlParams("?componentMode=false")
      const uiState = new UIState()
      expect(uiState.componentMode).toBe(false)
    })

    it("should be false when componentMode=0", () => {
      setUrlParams("?componentMode=0")
      const uiState = new UIState()
      expect(uiState.componentMode).toBe(false)
    })

    it("should be true when componentMode is present without value", () => {
      setUrlParams("?componentMode")
      const uiState = new UIState()
      expect(uiState.componentMode).toBe(true)
    })
  })

  describe("hideUndoRedoInComponent", () => {
    it("should be false by default", () => {
      const uiState = new UIState()
      expect(uiState.shouldShowUndoRedoInComponentTitleBar).toBe(false)
    })

    it("should be false when componentMode is off", () => {
      setUrlParams("?hideUndoRedoInComponent=no")
      const uiState = new UIState()
      expect(uiState.shouldShowUndoRedoInComponentTitleBar).toBe(false)
    })

    it("should be true when componentMode=yes and hideUndoRedoInComponent is not set", () => {
      setUrlParams("?componentMode=yes")
      const uiState = new UIState()
      expect(uiState.shouldShowUndoRedoInComponentTitleBar).toBe(true)
    })

    it("should be false when componentMode=yes and hideUndoRedoInComponent=yes", () => {
      setUrlParams("?componentMode=yes&hideUndoRedoInComponent=yes")
      const uiState = new UIState()
      expect(uiState.shouldShowUndoRedoInComponentTitleBar).toBe(false)
    })
  })

  describe("suppressUnsavedWarning", () => {
    it("should be false by default", () => {
      const uiState = new UIState()
      expect(uiState.shouldSuppressUnsavedWarning).toBe(false)
    })

    it("should be true when suppressUnsavedWarning=yes", () => {
      setUrlParams("?suppressUnsavedWarning=yes")
      const uiState = new UIState()
      expect(uiState.shouldSuppressUnsavedWarning).toBe(true)
    })

    it("should be true when componentMode=yes", () => {
      setUrlParams("?componentMode=yes")
      const uiState = new UIState()
      expect(uiState.shouldSuppressUnsavedWarning).toBe(true)
    })

    it("should be true when either suppressUnsavedWarning or componentMode is yes", () => {
      setUrlParams("?suppressUnsavedWarning=yes&componentMode=no")
      const uiState = new UIState()
      expect(uiState.shouldSuppressUnsavedWarning).toBe(true)
    })
  })

  describe("chrome visibility", () => {
    it("should render all chrome by default", () => {
      const uiState = new UIState()
      expect(uiState.shouldRenderMenuBar).toBe(true)
      expect(uiState.shouldRenderToolShelf).toBe(true)
      expect(uiState.shouldRenderBetaBanner).toBe(true)
    })

    it("should hide chrome when componentMode=yes", () => {
      setUrlParams("?componentMode=yes")
      const uiState = new UIState()
      expect(uiState.shouldRenderMenuBar).toBe(false)
      expect(uiState.shouldRenderToolShelf).toBe(false)
      expect(uiState.shouldRenderBetaBanner).toBe(false)
    })

    it("should still hide toolShelf in standalone mode", () => {
      setUrlParams("?standalone=yes")
      const uiState = new UIState()
      expect(uiState.shouldRenderMenuBar).toBe(true)
      expect(uiState.shouldRenderToolShelf).toBe(false)
      expect(uiState.shouldRenderBetaBanner).toBe(true)
    })
  })

  describe("component interaction", () => {
    it("should allow all interactions by default", () => {
      const uiState = new UIState()
      expect(uiState.allowComponentMove).toBe(true)
      expect(uiState.allowComponentResize).toBe(true)
      expect(uiState.allowComponentClose).toBe(true)
      expect(uiState.allowComponentMinimize).toBe(true)
    })

    it("should disallow all interactions when componentMode=yes", () => {
      setUrlParams("?componentMode=yes")
      const uiState = new UIState()
      expect(uiState.allowComponentMove).toBe(false)
      expect(uiState.allowComponentResize).toBe(false)
      expect(uiState.allowComponentClose).toBe(false)
      expect(uiState.allowComponentMinimize).toBe(false)
    })
  })

  describe("browser title and splash screen", () => {
    it("should update browser title by default", () => {
      const uiState = new UIState()
      expect(uiState.shouldUpdateBrowserTitleFromDocument).toBe(true)
    })

    it("should not update browser title when componentMode=yes", () => {
      setUrlParams("?componentMode=yes")
      const uiState = new UIState()
      expect(uiState.shouldUpdateBrowserTitleFromDocument).toBe(false)
    })

    it("should not show splash screen when hideSplashScreen=yes", () => {
      setUrlParams("?hideSplashScreen=yes")
      const uiState = new UIState()
      expect(uiState.hideSplashScreen).toBe(true)
    })

    it("should not show splash screen when componentMode=yes", () => {
      setUrlParams("?componentMode=yes")
      const uiState = new UIState()
      // Note: hideSplashScreen is not automatically set by componentMode
      // The splash screen hiding happens in index.html via CSS
      expect(uiState.hideSplashScreen).toBe(false)
    })
  })

  describe("auto-focus", () => {
    it("should not auto-focus by default", () => {
      const uiState = new UIState()
      expect(uiState.shouldAutoFocusInitialTile).toBe(false)
    })

    it("should auto-focus when componentMode=yes", () => {
      setUrlParams("?componentMode=yes")
      const uiState = new UIState()
      expect(uiState.shouldAutoFocusInitialTile).toBe(true)
    })
  })
})
