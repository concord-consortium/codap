export interface ITourElement {
  /** CSS selector for the element */
  selector: string
  /** Default popover title */
  title: string
  /** Default popover description */
  description: string
}

export const tourElements = {
  menuBar: {
    container: {
      selector: '[data-testid="codap-menu-bar"]',
      title: "Menu Bar",
      description: "This is the menu bar, where you'll find file management, help, and settings."
    },
    fileMenu: {
      selector: ".menu-bar-left .file-menu-button",
      title: "File Menu",
      description: "This is the File menu. Use it to create, open, save, and import documents."
    },
    documentName: {
      selector: ".menu-bar-content-filename",
      title: "Document Name",
      description: "Your document's name appears here. Click to rename it at any time."
    },
    logo: {
      selector: ".menu-bar-center",
      title: "CODAP",
      description: [
        "This is the CODAP logo and version number.",
        "Click the logo to visit the CODAP project website."
      ].join(" ")
    },
    helpMenu: {
      selector: ".help-menu",
      title: "Help",
      description: [
        "The Help menu has links to help pages, videos, and a community forum",
        "where you can ask questions and find answers."
      ].join(" ")
    },
    settingsMenu: {
      selector: ".settings-menu",
      title: "Settings",
      description: "Use Settings to customize CODAP, like moving the toolbar to the left side of the screen."
    },
    languageMenu: {
      selector: ".lang-menu",
      title: "Language",
      description: "CODAP is available in many languages. Click here to switch."
    },
  },
  toolShelf: {
    container: {
      selector: '[data-testid="tool-shelf"]',
      title: "Toolbar",
      description: "Use these buttons to create tables, graphs, maps, and other tools for exploring your data."
    },
    table: {
      selector: '[data-testid="tool-shelf-button-table"]',
      title: "Tables",
      description: [
        "Click Tables to open a case table for your data.",
        "Tables display your data in rows and columns,",
        "and you can click column headers to edit attributes or add formulas."
      ].join(" ")
    },
    graph: {
      selector: '[data-testid="tool-shelf-button-graph"]',
      title: "Graph",
      description: [
        "Click Graph to create a new graph.",
        "Drag attributes from a table onto the axes to explore relationships in your data."
      ].join(" ")
    },
    map: {
      selector: '[data-testid="tool-shelf-button-map"]',
      title: "Map",
      description: [
        "Click Map to create a map. If your data has latitude and longitude,",
        "your data points will appear at their locations automatically."
      ].join(" ")
    },
    slider: {
      selector: '[data-testid="tool-shelf-button-slider"]',
      title: "Slider",
      description: [
        "Click Slider to create a slider variable.",
        "Use sliders to control values in formulas and explore how changing a variable affects your data."
      ].join(" ")
    },
    calculator: {
      selector: '[data-testid="tool-shelf-button-calculator"]',
      title: "Calculator",
      description: "Click Calc to open or close the calculator for quick computations."
    },
    text: {
      selector: '[data-testid="tool-shelf-button-text"]',
      title: "Text",
      description: [
        "Click Text to create a text object.",
        "Use it to add notes, descriptions, or instructions to your document."
      ].join(" ")
    },
    webPage: {
      selector: '[data-testid="tool-shelf-button-web-view"]',
      title: "Web Page",
      description: "Click Web Page to embed a live website directly in your CODAP document."
    },
    plugins: {
      selector: '[data-testid="tool-shelf-button-plugins"]',
      title: "Plugins",
      description: [
        "Click Plugins to browse and open plugin tools that extend CODAP",
        "with extra features like data generation, sampling, and more."
      ].join(" ")
    },
    undo: {
      selector: '[data-testid="tool-shelf-button-undo"]',
      title: "Undo",
      description: "Click Undo to reverse your last action. You can undo multiple steps."
    },
    redo: {
      selector: '[data-testid="tool-shelf-button-redo"]',
      title: "Redo",
      description: "Click Redo to restore an action you just undid."
    },
    tilesList: {
      selector: '[data-testid="tool-shelf-button-tiles"]',
      title: "Tiles",
      description: [
        "Click Tiles to see a list of all the tiles in your document",
        "and quickly jump to any one of them."
      ].join(" ")
    },
  },
  workspace: {
    container: {
      selector: ".document-container",
      title: "Workspace",
      description: [
        "This is your workspace. Tables, graphs, maps, and other tiles you create will appear here.",
        "Drag them around to arrange your layout."
      ].join(" ")
    },
  }
} as const satisfies Record<string, Record<string, ITourElement>>

/** Type for dotted-path keys like "menuBar.fileMenu", "toolShelf.graph", etc. */
export type TourElementKey = {
  [NS in keyof typeof tourElements]:
    `${NS & string}.${keyof (typeof tourElements)[NS] & string}`
}[keyof typeof tourElements]

/** Resolve a dotted key to its element metadata */
export function resolveElement(key: TourElementKey): ITourElement {
  const parts = key.split(".") as [keyof typeof tourElements, string]
  const [ns, name] = parts
  return (tourElements[ns] as Record<string, ITourElement>)[name]
}
