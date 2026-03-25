import { ITourConfig, defaultTourOptions } from "./tour-types"
import { tourElements as el } from "./tour-elements"
import { step } from "./tour-utils"

export const featureTourConfig: ITourConfig = {
  options: { ...defaultTourOptions },
  steps: [
    // Menu bar section — override container description for welcome message
    step(el.menuBar.container, {
      description: "Welcome to CODAP! Let's take a quick tour. "
        + "This is the menu bar, where you'll find file management, help, and settings."
    }),
    step(el.menuBar.fileMenu),
    step(el.menuBar.documentName),
    step(el.menuBar.logo),
    step(el.menuBar.helpMenu),
    step(el.menuBar.settingsMenu),
    step(el.menuBar.languageMenu),

    // Toolbar section — override container description for transition
    step(el.toolShelf.container, {
      description: "This is the toolbar. Use these buttons to create tables, graphs, maps, "
        + "and other tools for exploring your data."
    }),
    step(el.toolShelf.table),
    step(el.toolShelf.graph),
    step(el.toolShelf.map),
    step(el.toolShelf.slider),
    step(el.toolShelf.calculator),
    step(el.toolShelf.text),
    step(el.toolShelf.webPage),
    step(el.toolShelf.plugins),
    step(el.toolShelf.undo),
    step(el.toolShelf.redo),
    step(el.toolShelf.tilesList),

    // Workspace
    step(el.workspace.container),

    // Finale — override help menu description with closing message
    step(el.menuBar.helpMenu, {
      description: "That's the tour! For more information, explore the Help menu "
        + "for help pages, videos, and a community forum."
    }),
  ]
}
