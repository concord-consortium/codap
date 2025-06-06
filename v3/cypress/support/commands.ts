Cypress.Commands.add("clickMenuItem", text => {
  cy.get("button[role=menuitem]").contains(text).click()
})

Cypress.Commands.add("clickWhenClickable", (selector: string, shouldCondition = "be.visible") => {
  /* According to ChatGPT:

    Using `.should('be.visible').then(...)` is generally more reliable than chaining actions like
    `.should('be.visible').click()` directly after an assertion.

    Here's why:

    1. Retry Mechanism
        Cypress will retry the `.should` assertion until it passes (up to the default timeout).
        However, when you chain an action like `.click()` directly after `.should('be.visible')`,
        the `.click()` may not retry if the element’s state changes quickly.
        This can result in flaky tests if the visibility of the element isn't stable.
    2. Clear Separation
        By using `.then(...)` after the `.should`, you separate the assertion
        (which benefits from Cypress’s retry behavior) from the action,
        ensuring the action only happens once the assertion is fully satisfied.
  */
  cy.get(selector).should(shouldCondition).then($el => {
    cy.wrap($el).click({force: true})
  })
})

// Like `contains` but uses a regex to match the text, allowing for whitespace variations
Cypress.Commands.add("containsText", (selector: string, text: string) => {
  const textRegex = new RegExp(text.replace(/\s+/g, "\\s*"))
  return cy.get(selector)
          .filter((i, el) => textRegex.test(el.textContent || ""))
          .first()
          .should("exist")
})

function stringifyDOMRect(rect: DOMRect): string {
  return `x: ${rect.x}, y: ${rect.y}, width: ${rect.width}, height: ${rect.height}`
}

Cypress.Commands.add("dragAttributeToTarget", (source, attribute, target, targetNumber) => {
  const el = {
    tableColumnHeader:
      `.codap-case-table [data-testid="codap-attribute-button ${attribute}"]`,
    headerDivider: `.codap-attribute-header-divider`,
    caseCardHeader: `.codap-case-card [data-testid="codap-attribute-button ${attribute}"]`,
    caseCardHeaderDropZone: ".react-data-card .data-cell-lower",
    caseCardCollectionDropZone: ".react-data-card .collection-header-row",
    graphTile: ".graph-plot svg",
    graphLegend: ".graph-plot .legend .chakra-menu__menu-button",
    bottomAxis: ".codap-graph .droppable-axis.droppable-svg.bottom",
    bottomAxisLabel: ".codap-graph .axis-legend-attribute-menu.bottom .chakra-menu__menu-button",
    leftAxis: ".codap-graph .droppable-axis.droppable-svg.left",
    leftAxisLabel: ".codap-graph .axis-legend-attribute-menu.left .chakra-menu__menu-button",
    topAxis: ".codap-graph [data-testid=add-attribute-drop-top]",
    topAxisLabel: ".codap-graph [data-testid=axis-legend-attribute-button-top]",
    rightAxis: ".codap-graph [data-testid^=add-attribute-drop-right]",
    rightAxisLabel: ".codap-graph [data-testid^=axis-legend-attribute-button-right]",
    yPlusAxis: ".codap-graph [data-testid^=add-attribute-drop-yPlus]",
    mapTile: ".codap-map .leaflet-container",
    mapLegend: ".codap-map .map-container",
    newCollection: ".collection-table-spacer.parentMost",
    prevCollection: ".collection-table:nth-child(1) .codap-column-header:nth-child(2)",
    newTopCardCollection: ".case-card-collection-spacer.parentMost",
    webView: '.codap-web-view-body'
  }

  let source_el = "", target_el = ""

  switch (source) {
    case ("table"):
    case ("attribute"):
      source_el = el.tableColumnHeader
      break
    case ("card"):
      source_el = el.caseCardHeader
      break
    case ("bottom"):
      source_el = el.bottomAxis
      break
    case ("bottom-axis-label"):
      source_el = el.bottomAxisLabel
      break
    case ("left"):
      source_el = el.leftAxis
      break
    case ("left-axis-label"):
      source_el = el.leftAxisLabel
      break
    case ("top"):
      source_el = el.topAxis
      break
    case ("top-axis-label"):
      source_el = el.topAxisLabel
      break
    case ("right"):
      source_el = el.rightAxis
      break
    case ("right-axis-label"):
      source_el = el.rightAxisLabel
      break
    case ("yplus"):
      source_el = el.yPlusAxis
      break
  }

  switch (target) {
    case "card":
      target_el = el.caseCardHeaderDropZone
      break
    case "card collection":
      target_el = el.caseCardCollectionDropZone
      break
    case "graph-plot":
      target_el = el.graphTile
      break
    case "graph-legend":
      target_el = el.graphLegend
      break
    case "map":
      target_el = el.mapTile
      break
    case "map-legend":
        target_el = el.mapLegend
        break
    case "bottom":
      target_el = el.bottomAxis
      break
    case "left":
      target_el = el.leftAxis
      break
    case "top":
    case "top-axis-label":
      target_el = el.topAxis
      break
    case "yplus":
      target_el = el.yPlusAxis
      break
    case "right":
    case "right-axis-label":
      target_el = el.rightAxis
      break
    case "newCollection":
      target_el = el.newCollection
      break
    case "prevCollection":
      target_el = el.prevCollection
      break
    case "newTopCardCollection":
      target_el = el.newTopCardCollection
      break
    case "headerDivider":
      target_el = el.headerDivider
      break
    case "webView":
      target_el=el.webView
      break
    default:
      target_el = el.tableColumnHeader
      break
  }

  cy.log("target_el", target_el)
  cy.containsText(source_el, attribute)
    .trigger("mousedown", { force: true })
    .then(() => {
      cy.get(target_el).eq(targetNumber ?? 0).then($target => {
        return $target[0].getBoundingClientRect()
      })
      .then($targetRect => {
        cy.log("targetRect", stringifyDOMRect($targetRect))
        cy.containsText(source_el, attribute).then($subject => {
          cy.mouseMoveBy($subject, $targetRect, { delay: 100 })
        })
      })
    })
  cy.wait(1000)
})
Cypress.Commands.add("clickToUnselect", (subject, options?: { delay: number }) => {
  cy.wrap(subject)
    .trigger("pointerdown", {
      force: true,
      clientX: Math.floor(subject[0].x + 10),
      clientY: Math.floor(subject[0].y + 10),
    })
    .wait(options?.delay || 0, { log: Boolean(options?.delay) })
    .trigger("pointerup", { force: true })
    .wait(options?.delay || 0, { log: Boolean(options?.delay) })
})

Cypress.Commands.add("mouseMoveBy",
  (subject, targetRect, options?: { delay: number }) => {
    const clientX = Math.floor(targetRect.x + targetRect.width / 2)
    const clientY = Math.floor(targetRect.y + targetRect.height / 2)
    cy.wrap(subject)
      .trigger("mousedown", { force: true })
      .wait(options?.delay || 0, { log: Boolean(options?.delay) })
      .trigger("mousemove", { clientX, clientY, force: true })
      .wait(options?.delay || 0, { log: Boolean(options?.delay) })
      .trigger("mouseup", { clientX, clientY, force: true })
      .wait(options?.delay || 0, { log: Boolean(options?.delay) })
  })

// analogous to mouseMoveBy but doesn't seem to trigger the PointerSensor as expected
Cypress.Commands.add("pointerMoveBy",
  (subject, targetRect, options?: { delay: number }) => {
    cy.wrap(subject)
      .trigger("pointerdown", { force: true })
      .wait(options?.delay || 0, { log: Boolean(options?.delay) })
      .trigger("pointermove", {
        force: true,
        clientX: Math.floor(targetRect.x + targetRect.width / 2),
        clientY: Math.floor(targetRect.y + targetRect.height / 2),
      })
      .wait(options?.delay || 0, { log: Boolean(options?.delay) })
      .trigger("pointerup", { force: true })
      .wait(options?.delay || 0, { log: Boolean(options?.delay) })
  })

  Cypress.Commands.add("checkDragAttributeHighlights", (source, attribute, target, exists) => {
    const el = {
      tableColumnHeader:
        `.codap-case-table [data-testid="codap-attribute-button ${attribute}"]`,
      caseCardHeader: ".react-data-card-attribute",
      caseCardHeaderDropZone: ".react-data-card .data-cell-lower",
      caseCardCollectionDropZone: ".react-data-card .collection-header-row",
      graphTile: ".droppable-svg.droppable-plot",
      graphLegend: ".graph-plot .legend .chakra-menu__menu-button",
      bottomAxis: ".codap-graph .droppable-axis.droppable-svg.bottom",
      leftAxis: ".codap-graph .droppable-axis.droppable-svg.left",
      topAxis: ".codap-graph [data-testid=add-attribute-drop-top]",
      rightAxis: ".codap-graph [data-testid^=add-attribute-drop-right]",
      yPlusAxis: ".codap-graph [data-testid^=add-attribute-drop-yPlus]",
      mapTile: ".codap-map .leaflet-container",
      newCollection: ".collection-table-spacer.parentMost",
      prevCollection: ".collection-table:nth-child(1) .codap-column-header:nth-child(2)",
    }

    let source_el = "", target_el = ""

    switch (source) {
      case ("table"):
      case ("attribute"):
        source_el = el.tableColumnHeader
        break
      case ("card"):
        source_el = el.caseCardHeader
        break
      case ("bottom"):
        source_el = el.bottomAxis
        break
      case ("left"):
        source_el = el.leftAxis
        break
      case ("top"):
        source_el = el.topAxis
        break
      case ("right"):
        source_el = el.rightAxis
        break
      case ("yplus"):
        source_el = el.yPlusAxis
        break
    }

    switch (target) {
      case ("card"):
        target_el = el.caseCardHeaderDropZone
        break
      case ("card collection"):
        target_el = el.caseCardCollectionDropZone
        break
      case ("graph-plot"):
        target_el = el.graphTile
        break
      case ("graph-legend"):
        target_el = el.graphLegend
        break
      case ("map"):
        target_el = el.mapTile
        break
      case ("bottom"):
        target_el = el.bottomAxis
        break
      case ("left"):
        target_el = el.leftAxis
        break
      case ("top"):
        target_el = el.topAxis
        break
      case ("right"):
        target_el = el.rightAxis
        break
      case ("yplus"):
        target_el = el.yPlusAxis
        break
      case ("newCollection"):
        target_el = el.newCollection
        break
      case ("prevCollection"):
        target_el = el.prevCollection
        break
      default:
        target_el = el.tableColumnHeader
        break
    }

    cy.log("target_el", target_el)
    cy.get(source_el).contains(attribute)
      .trigger("mousedown", { force: true })
      .then(() => {
        if (exists) {
          cy.get(target_el).should("have.class", "active")
        }
        else {
          cy.get(target_el).should("not.exist")
        }
      })
    cy.wait(2500)
  })
