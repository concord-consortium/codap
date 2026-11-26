type GetMenuButton = () => Cypress.Chainable<JQuery<HTMLElement>>

export const MenuHelper = {
  // Chakra hides a menu when its close animation ends, even if the menu has been reopened in the
  // meantime, so a menu reopened while still closing stays open but invisible. Choosing a menu item
  // or clicking elsewhere closes the menu, so if the button's menu is closing, wait for it to finish.
  // Some closed menus keep `visibility: visible` at `opacity: 0`, which also counts as closed.
  waitForMenuToClose(getButton: GetMenuButton) {
    getButton().then($button => {
      if ($button.attr("aria-expanded") !== "true") {
        const menuSelector = `[id='${$button.attr("aria-controls")}']`
        cy.get("body").should($body => {
          const style = $body.find(menuSelector).attr("style") ?? ""
          const isClosed = !style.includes("visibility: visible") || /opacity: 0(;|$)/.test(style)
          expect(isClosed, `menu finished closing (style: ${style})`).to.equal(true)
        })
      }
    })
  },
  // Menu items can be found and clicked while the menu is still hidden, so wait for the button's
  // menu to become visible. A menu that opens but never appears then fails here rather than at some
  // later step.
  waitForMenuToOpen(getButton: GetMenuButton) {
    getButton()
      .should("have.attr", "aria-expanded", "true")
      .invoke("attr", "aria-controls")
      .then(menuId => {
        cy.get(`[id='${menuId}']`).should("have.attr", "style").and("contain", "visibility: visible")
      })
  },
  // Opens the menu of a Chakra MenuButton, waiting for any earlier close to finish first.
  openMenu(getButton: GetMenuButton, clickOptions?: Partial<Cypress.ClickOptions>) {
    this.waitForMenuToClose(getButton)
    getButton().click(clickOptions)
    this.waitForMenuToOpen(getButton)
  }
}
