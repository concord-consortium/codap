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
    c.getComponentTitle("graph").should("not.be.visible")
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
    toolbar.getPluginSelection().eq(5).click()
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
  it('will show a list of open tiles when there is no data context', ()=>{
    // Don't open a table as this automatically creates a data context
    c.getIconFromToolShelf("graph").click()
    c.getIconFromToolShelf("map").click()
    c.getIconFromToolShelf("slider").click()
    c.getIconFromToolShelf("calc").click()
    c.getIconFromToolShelf("plugins").click()
    toolbar.getPluginGroup().eq(2).click()
    toolbar.getPluginSelection().eq(5).click()
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
    toolbar.getTilesListMenuIcon().eq(4).should("have.class", "CodapWebView")
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
