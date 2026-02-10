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

  describe("minimalChrome", () => {
    it("should be false by default", () => {
      const uiState = new UIState()
      expect(uiState.minimalChrome).toBe(false)
    })

    it("should be true when componentMode=yes", () => {
      setUrlParams("?componentMode=yes")
      const uiState = new UIState()
      expect(uiState.minimalChrome).toBe(true)
    })

    it("should be true when embeddedMode=yes", () => {
      setUrlParams("?embeddedMode=yes")
      const uiState = new UIState()
      expect(uiState.minimalChrome).toBe(true)
    })

    it("should be true when both componentMode and embeddedMode are set", () => {
      setUrlParams("?componentMode=yes&embeddedMode=yes")
      const uiState = new UIState()
      expect(uiState.minimalChrome).toBe(true)
    })

    it("should be false when only embeddedServer=yes", () => {
      setUrlParams("?embeddedServer=yes")
      const uiState = new UIState()
      expect(uiState.minimalChrome).toBe(false)
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

  describe("embeddedMode", () => {
    it("should be false by default", () => {
      const uiState = new UIState()
      expect(uiState.embeddedMode).toBe(false)
    })

    it("should be true when embeddedMode=yes", () => {
      setUrlParams("?embeddedMode=yes")
      const uiState = new UIState()
      expect(uiState.embeddedMode).toBe(true)
    })

    it("should be true when embeddedMode=true", () => {
      setUrlParams("?embeddedMode=true")
      const uiState = new UIState()
      expect(uiState.embeddedMode).toBe(true)
    })

    it("should be false when embeddedMode=no", () => {
      setUrlParams("?embeddedMode=no")
      const uiState = new UIState()
      expect(uiState.embeddedMode).toBe(false)
    })

    it("should be true when embeddedMode is present without value", () => {
      setUrlParams("?embeddedMode")
      const uiState = new UIState()
      expect(uiState.embeddedMode).toBe(true)
    })

    it("should hide chrome when embeddedMode=yes", () => {
      setUrlParams("?embeddedMode=yes")
      const uiState = new UIState()
      expect(uiState.shouldRenderMenuBar).toBe(false)
      expect(uiState.shouldRenderToolShelf).toBe(false)
      expect(uiState.shouldRenderBetaBanner).toBe(false)
    })

    it("should allow component interactions when embeddedMode=yes (unlike componentMode)", () => {
      // embeddedMode hides UI chrome but keeps components fully interactive
      // This matches v2 behavior where kLockThingsDown is only set for componentMode
      setUrlParams("?embeddedMode=yes")
      const uiState = new UIState()
      expect(uiState.allowComponentMove).toBe(true)
      expect(uiState.allowComponentResize).toBe(true)
      expect(uiState.allowComponentClose).toBe(true)
      expect(uiState.allowComponentMinimize).toBe(true)
    })

    it("should suppress unsaved warning when embeddedMode=yes", () => {
      setUrlParams("?embeddedMode=yes")
      const uiState = new UIState()
      expect(uiState.shouldSuppressUnsavedWarning).toBe(true)
    })

    it("should not update browser title when embeddedMode=yes", () => {
      setUrlParams("?embeddedMode=yes")
      const uiState = new UIState()
      expect(uiState.shouldUpdateBrowserTitleFromDocument).toBe(false)
    })

    it("should auto-focus when embeddedMode=yes", () => {
      setUrlParams("?embeddedMode=yes")
      const uiState = new UIState()
      expect(uiState.shouldAutoFocusInitialTile).toBe(true)
    })

    it("should show undo/redo in title bar when embeddedMode=yes", () => {
      setUrlParams("?embeddedMode=yes")
      const uiState = new UIState()
      expect(uiState.shouldShowUndoRedoInComponentTitleBar).toBe(true)
    })

    it("should hide undo/redo in title bar when embeddedMode=yes and hideUndoRedoInComponent=yes", () => {
      setUrlParams("?embeddedMode=yes&hideUndoRedoInComponent=yes")
      const uiState = new UIState()
      expect(uiState.shouldShowUndoRedoInComponentTitleBar).toBe(false)
    })
  })

  describe("embeddedServer", () => {
    it("should be false by default", () => {
      const uiState = new UIState()
      expect(uiState.embeddedServer).toBe(false)
    })

    it("should be true when embeddedServer=yes", () => {
      setUrlParams("?embeddedServer=yes")
      const uiState = new UIState()
      expect(uiState.embeddedServer).toBe(true)
    })

    it("should be true when embeddedMode=yes (embeddedServer is implicitly enabled)", () => {
      setUrlParams("?embeddedMode=yes")
      const uiState = new UIState()
      expect(uiState.embeddedServer).toBe(true)
    })

    it("should not hide chrome when only embeddedServer=yes", () => {
      setUrlParams("?embeddedServer=yes")
      const uiState = new UIState()
      expect(uiState.shouldRenderMenuBar).toBe(true)
      expect(uiState.shouldRenderToolShelf).toBe(true)
      expect(uiState.shouldRenderBetaBanner).toBe(true)
    })

    it("should allow component interactions when only embeddedServer=yes", () => {
      setUrlParams("?embeddedServer=yes")
      const uiState = new UIState()
      expect(uiState.allowComponentMove).toBe(true)
      expect(uiState.allowComponentResize).toBe(true)
      expect(uiState.allowComponentClose).toBe(true)
      expect(uiState.allowComponentMinimize).toBe(true)
    })
  })

  describe("busy indicator", () => {
    beforeEach(() => {
      jest.useFakeTimers()
    })

    afterEach(() => {
      jest.useRealTimers()
    })

    it("should not be busy by default", () => {
      const uiState = new UIState()
      expect(uiState.isBusy).toBe(false)
      expect(uiState.busyCursorMode).toBe(false)
    })

    it("should set busy state without cursorMode", () => {
      const uiState = new UIState()
      uiState.setBusy(true)
      expect(uiState.isBusy).toBe(true)
      expect(uiState.busyCursorMode).toBe(false)
    })

    it("should set busy state with cursorMode", () => {
      const uiState = new UIState()
      uiState.setBusy(true, true)
      expect(uiState.isBusy).toBe(true)
      expect(uiState.busyCursorMode).toBe(true)
    })

    it("should clear busy state", () => {
      const uiState = new UIState()
      uiState.setBusy(true, true)
      expect(uiState.isBusy).toBe(true)
      uiState.setBusy(false)
      expect(uiState.isBusy).toBe(false)
      expect(uiState.busyCursorMode).toBe(false)
    })

    it("should auto-clear after timeout in cursorMode", () => {
      const uiState = new UIState()
      uiState.setBusy(true, true)
      expect(uiState.isBusy).toBe(true)
      expect(uiState.busyCursorMode).toBe(true)
      jest.advanceTimersByTime(60000)
      expect(uiState.isBusy).toBe(false)
      expect(uiState.busyCursorMode).toBe(false)
    })

    it("should auto-clear after timeout without cursorMode", () => {
      const uiState = new UIState()
      uiState.setBusy(true)
      expect(uiState.isBusy).toBe(true)
      jest.advanceTimersByTime(60000)
      expect(uiState.isBusy).toBe(false)
    })

    it("should clear previous timeout when setBusy is called again", () => {
      const uiState = new UIState()
      uiState.setBusy(true, true)
      jest.advanceTimersByTime(30000)
      // Second call clears the first 60s timeout and starts a new one
      uiState.setBusy(true, true)
      // 30s later: the first timeout would have fired here (60s total) if not cleared
      jest.advanceTimersByTime(30000)
      expect(uiState.isBusy).toBe(true)
      // 30s more: 60s since the second setBusy call, so its timeout fires
      jest.advanceTimersByTime(30000)
      expect(uiState.isBusy).toBe(false)
    })
  })

  describe("hideUserEntryModal", () => {
    it("should be false by default", () => {
      const uiState = new UIState()
      expect(uiState.hideUserEntryModal).toBe(false)
    })

    it("should be true when noEntryModal=yes", () => {
      setUrlParams("?noEntryModal=yes")
      const uiState = new UIState()
      expect(uiState.hideUserEntryModal).toBe(true)
    })

    it("should be true when componentMode=yes", () => {
      setUrlParams("?componentMode=yes")
      const uiState = new UIState()
      expect(uiState.hideUserEntryModal).toBe(true)
    })

    it("should be true when embeddedMode=yes", () => {
      setUrlParams("?embeddedMode=yes")
      const uiState = new UIState()
      expect(uiState.hideUserEntryModal).toBe(true)
    })

    it("should be true when sample is specified", () => {
      setUrlParams("?sample=mammals")
      const uiState = new UIState()
      expect(uiState.hideUserEntryModal).toBe(true)
    })

    it("should be true when dashboard is specified", () => {
      setUrlParams("?dashboard")
      const uiState = new UIState()
      expect(uiState.hideUserEntryModal).toBe(true)
    })
  })
})
