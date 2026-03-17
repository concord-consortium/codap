import { CfmElements as cfm } from "../support/elements/cfm"
import { ComponentElements as c } from "../support/elements/component-elements"
import { ToolbarElements as toolbar } from "../support/elements/toolbar-elements"
import { TableTileElements as table } from "../support/elements/table-tile"
import { GraphTileElements as graph } from "../support/elements/graph-tile"
import { MapTileElements as map } from "../support/elements/map-tile"
import { SliderTileElements as slider } from "../support/elements/slider-tile"
import { CalculatorTileElements as calculator } from "../support/elements/calculator-tile"
import { WebViewTileElements as webView } from "../support/elements/web-view-tile"

const helpURL = 'https://codap.concord.org/help'
const helpForumURL = 'https://codap.concord.org/forums/forum/test/'
const projectWebSiteURL = 'https://codap.concord.org'
const privacyURL = 'https://codap.concord.org/privacy'

context("codap toolbar", () => {
  beforeEach(function () {
    const url = `${Cypress.config("index")}?mouseSensor&noEntryModal&suppressUnsavedWarning`
    cy.visit(url)
  })
  it("will open a new table", () => {
    c.clickIconFromToolShelf("table")
    toolbar.getNewCaseTable().click()
    table.getCollection().should("be.visible")
    c.getComponentTitleInput("table").should("have.value", "New Dataset")
    c.getIconFromToolShelf("table").click()
    toolbar.getDatasetListedInToolShelf("New Dataset").should("be.visible")
  })
  it("will open a graph", () => {
    c.clickIconFromToolShelf("graph")
    graph.getGraphTile().should("be.visible")
    // graphs with no associated data set should not have a title but show a blank space when hovered
    c.getComponentTitle("graph").should("not.exist")
    c.getComponentTitleBar("graph").trigger("mouseover")
    c.getComponentTitle("graph").should("have.text", "_____")
  })
  it("will open a map", () => {
    c.clickIconFromToolShelf("map")
    map.getMapTile().should("be.visible")
    c.getComponentTitle("map").should("have.text", "Map")
  })
  it("will open a slider", () => {
    c.clickIconFromToolShelf("slider")
    slider.getSliderTile().should("be.visible")
    c.getComponentTitle("slider").should("have.text", "v1")
  })
  it("will open a calculator", () => {
    c.clickIconFromToolShelf("calc")
    calculator.getCalculatorTile().should("be.visible")
    c.getComponentTitle("calculator").should("have.text", "Calculator")
  })
  it("plugin menu works", () => {
    c.getIconFromToolShelf("plugins").should("exist").click()
    toolbar.getPluginGroup().should("have.length", 5)
    webView.getTitle().should("not.exist")
    toolbar.getPluginGroup().eq(2).click()
    // toolbar.getPluginSubMenu().eq(2).invoke("show")
    toolbar.getPluginSelection().eq(0).click()
    webView.getTitle().should("have.text", "Sampler")
    toolbar.getPluginSelection().should("not.exist")
  })
  it('will display a webpage', ()=>{
      const url='https://www.wikipedia.org'
      const url2='https://en.wikipedia.org/wiki/Concord_Consortium'
      c.clickIconFromToolShelf("web page")
      webView.getUrlModal().should("exist")
      webView.enterUrl(url)
      cy.wait(1500)
      webView.getUrlModal().should("not.exist")
      webView.getIFrame().find(`.central-textlogo`).should("be.visible")
      webView.getEditUrlButton().click()
      webView.getUrlModal().should("exist")
      webView.enterUrl(url2)
      cy.wait(1500)
      webView.getIFrame().find(`.mw-page-title-main`).should("contain.text", "Concord Consortium")
  })
  it("only enables web page modal OK button after a value is entered", () => {
    c.clickIconFromToolShelf("web page")
    webView.getUrlModal().should("be.visible")
    webView.getUrlModalOkButton().should("be.disabled")
    webView.getUrlModalInput().type("https://example.com")
    webView.getUrlModalOkButton().should("be.enabled")
  })
  it("removes empty web view when URL modal is cancelled", () => {
    c.clickIconFromToolShelf("web page")
    webView.verifyWebViewExists()
    webView.getUrlModal().should("be.visible")
    webView.cancelUrlModal()
    webView.getUrlModal().should("not.exist")
    webView.verifyWebViewRemoved()
  })
  it("does not remove a web view with a URL value when URL modal is cancelled", () => {
    c.clickIconFromToolShelf("web page")
    webView.getUrlModal().should("be.visible")
    webView.enterUrl("https://example.com")
    cy.wait(1500)
    webView.verifyWebViewExists()
    webView.getEditUrlButton().click()
    webView.cancelUrlModal()
    webView.getUrlModal().should("not.exist")
    webView.verifyWebViewExists()
  })
  it('will show a list of open tiles when there is no data context', ()=>{
    // Don't open a table as this automatically creates a data context
    c.getIconFromToolShelf("graph").click()
    c.getIconFromToolShelf("map").click()
    c.getIconFromToolShelf("slider").click()
    c.getIconFromToolShelf("calc").click()
    c.getIconFromToolShelf("plugins").click()
    toolbar.getPluginGroup().eq(2).click()
    toolbar.getPluginSelection().eq(0).click()
    //TODO need to add check for Text component
    toolbar.getTilesButton().click()
    toolbar.getTilesListMenu().should("be.visible")
    toolbar.getTilesListMenuItem().should("have.length", 5)

    toolbar.getTilesListMenuItem().eq(0).should("have.text", "")
    toolbar.getTilesListMenuIcon().eq(0).should("have.class", "Graph")
    toolbar.getTilesListMenuItem().eq(1).should("have.text", "Map")
    toolbar.getTilesListMenuIcon().eq(1).should("have.class", "Map")
    toolbar.getTilesListMenuItem().eq(2).should("have.text", "v1")
    toolbar.getTilesListMenuIcon().eq(2).should("have.class", "CodapSlider")
    toolbar.getTilesListMenuItem().eq(3).should("have.text", "Calculator")
    toolbar.getTilesListMenuIcon().eq(3).should("have.class", "Calculator")
    toolbar.getTilesListMenuItem().eq(4).should("have.text", "Sampler")
    toolbar.getTilesListMenuIcon().eq(4).should("have.class", "Plugin")
    toolbar.getTilesListMenuItem().eq(4).should("have.attr", "aria-label", "Sampler, plugin")
  })
  it('will show correct title for a new table', ()=>{
    c.getIconFromToolShelf("table").click()
    toolbar.getNewCaseTable().click()
    toolbar.getTilesButton().click()
    toolbar.getTilesListMenu().should("be.visible")
    toolbar.getTilesListMenuItem().should("have.length", 1)
    toolbar.getTilesListMenuItem().eq(0).should("have.text", "New Dataset")
    toolbar.getTilesListMenuIcon().eq(0).should("have.class", "CaseTable")
  })
  it('will highlight tile when associated tiles menu item receives focus', ()=>{
    c.clickIconFromToolShelf("graph")
    graph.getGraphTile(0).should("exist")
    graph.getGraphTile(0).should("have.class", "focused")
    c.clickIconFromToolShelf("graph")
    graph.getGraphTile(1).should("exist")
    graph.getGraphTile(1).should("have.class", "focused")
    toolbar.getTilesButton().click()
    toolbar.getTilesListMenu().should("be.visible")
    // Hovering/focusing a menu item highlights the tile without fully selecting it
    toolbar.getTilesListMenuItem().eq(0).trigger("mouseover")
    graph.getGraphTile(0).should("have.class", "focused")
    toolbar.getTilesListMenuItem().eq(1).trigger("mouseover")
    graph.getGraphTile(1).should("have.class", "focused")
  })
  it('will deselect focused tile while navigating the tiles menu', ()=>{
    // Create two graphs — the second one starts selected
    c.clickIconFromToolShelf("graph")
    c.clickIconFromToolShelf("graph")
    graph.getGraphTile(1).should("have.class", "focused")
    // Open the tiles menu — the second graph should lose focus.
    // (The first graph gains a highlight because Chakra auto-focuses the first menu item.)
    toolbar.getTilesButton().click()
    toolbar.getTilesListMenu().should("be.visible")
    graph.getGraphTile(1).should("not.have.class", "focused")
  })
  it('will restore focused tile when tiles menu is cancelled with Escape', ()=>{
    // Create a graph — it starts selected
    c.clickIconFromToolShelf("graph")
    graph.getGraphTile(0).should("have.class", "focused")
    // Open the tiles menu
    toolbar.getTilesButton().click()
    toolbar.getTilesListMenu().should("be.visible")
    // Arrow down into the menu so a menu item has focus, then press Escape.
    // Chakra v2 only handles Escape when focus is on a menu item, not the MenuButton.
    // We have an onKeyDown handler on the MenuButton that handles Escape for real users,
    // but it can't be tested here: Chakra's framer-motion exit animation doesn't complete
    // in Cypress's headless Chrome, so the menu DOM element persists even after isOpen
    // becomes false, causing `should("not.exist")` / `should("not.be.visible")` to fail.
    cy.realPress("ArrowDown")
    cy.realPress("Escape")
    toolbar.getTilesButton().should("have.attr", "aria-expanded", "false")
    // The originally focused tile should be restored
    graph.getGraphTile(0).should("have.class", "focused")
  })
  it('will select a tile when clicking its tiles menu item', ()=>{
    // Create two graphs
    c.clickIconFromToolShelf("graph")
    graph.getGraphTile(0).should("have.class", "focused")
    c.clickIconFromToolShelf("graph")
    graph.getGraphTile(1).should("have.class", "focused")
    // Select the first graph via the tiles menu
    toolbar.getTilesButton().click()
    toolbar.getTilesListMenu().should("be.visible")
    toolbar.getTilesListMenuItem().eq(0).click()
    // First graph should now be focused, second should not
    graph.getGraphTile(0).should("have.class", "focused")
    graph.getGraphTile(1).should("not.have.class", "focused")
    c.checkComponentFocused("graph", true, 0)
  })
  it('will not auto-focus text editor when navigating tiles menu past a text tile', ()=>{
    // Create a graph and a text tile
    c.clickIconFromToolShelf("graph")
    c.clickIconFromToolShelf("text")
    // Open the tiles menu and navigate past the text tile item via keyboard
    toolbar.getTilesButton().click()
    toolbar.getTilesListMenu().should("be.visible")
    // Use keyboard navigation to move focus onto the text tile menu item
    cy.realPress("ArrowDown") // move to first menu item (graph)
    cy.realPress("ArrowDown") // move to second menu item (text)
    // The tiles menu should still be visible (text tile didn't steal focus)
    toolbar.getTilesListMenu().should("be.visible")
    // Focus should still be in the menu, not on the text editor
    cy.focused().should("not.have.class", "slate-editor")
  })
  it('will show a list of open tiles when there is a data context', ()=>{
    cy.visit("?suppressUnsavedWarning#file=examples:Four%20Seals")
    toolbar.getTilesButton().click()
    toolbar.getTilesListMenu().should("be.visible")
    toolbar.getTilesListMenuItem().should("have.length", 5)
    toolbar.getTilesListMenuItem().eq(0).should("have.text", "Tracks/Measurements")
    toolbar.getTilesListMenuItem().eq(1).should("have.text", "Measurements")
    toolbar.getTilesListMenuItem().eq(2).should("have.text", "Measurements")
    toolbar.getTilesListMenuItem().eq(3).should("have.text", "Getting Started")
    toolbar.getTilesListMenuItem().eq(4).should("have.text", "Getting Started")
  })
  it('will show the help pages list', ()=>{
    cy.visit("?suppressUnsavedWarning#file=examples:Four%20Seals")
    cfm.getHelpMenuButton().click()
    cfm.getHelpMenu().should("be.visible")
    cfm.getHelpMenuItem(0).should("contains.text", "Help Pages and Videos")
    cfm.getHelpMenuItem(1).should("contains.text", "Help Forum")
    cfm.getHelpMenuItem(2).should("contains.text", "The CODAP Project")
    cfm.getHelpMenuItem(3).should("contains.text", "Privacy Page")
  })
})

context("Help Pages", () => {
  beforeEach(() => {
    cy.visit("?suppressUnsavedWarning#file=examples:Four%20Seals")
    cy.window().then((win) => {
      cy.stub(win, "open").as("windowOpen")
    })
  })
  it('will open the help page', ()=>{
    cfm.getHelpMenuButton().click()
    cfm.getHelpMenuItem(0).click()
    cy.get('@windowOpen').should('have.been.calledWith', helpURL)
  })
  it('will open the forum page', ()=>{
    cfm.getHelpMenuButton().click()
    cfm.getHelpMenuItem(1).click()
    cy.get('@windowOpen').should('have.been.calledWith', helpForumURL)
  })
  it('will open the project website', ()=>{
    cfm.getHelpMenuButton().click()
    cfm.getHelpMenuItem(2).click()
    cy.get('@windowOpen').should('have.been.calledWith', projectWebSiteURL)
  })
  it('will open the privacy policy page', ()=>{
    cfm.getHelpMenuButton().click()
    cfm.getHelpMenuItem(3).click()
    cy.get('@windowOpen').should('have.been.calledWith', privacyURL)
  })
  //TODO need to add test for the translated help page
})
