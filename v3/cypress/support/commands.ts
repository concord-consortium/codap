Cypress.Commands.add("clickMenuItem", text => {
  cy.get("button[role=menuitem]").contains(text).click()
})

Cypress.Commands.add("dragAttributeToTarget", (source, attribute, target, num = 0) => {
  const el = {
    tableHeader: ".codap-data-summary .data-attributes .draggable-attribute",
    tableColumnHeader:
      `.codap-case-table [data-testid="codap-attribute-button ${attribute}"]`,
    caseCardHeader: ".react-data-card-attribute",
    caseCardHeaderDropZone: ".react-data-card .data-cell-lower",
    caseCardCollectionDropZone: ".react-data-card .collection-header-row",
    graphTile: ".graph-plot svg",
    legend: ".graph-plot .legend .chakra-menu__menu-button",
    x_axis: ".codap-graph .droppable-axis.droppable-svg.bottom",
    x_axis_label: ".codap-graph .axis-legend-attribute-menu.bottom .chakra-menu__menu-button",
    y_axis: ".codap-graph .droppable-axis.droppable-svg.left",
    y_axis_label: ".codap-graph .axis-legend-attribute-menu.left .chakra-menu__menu-button",
    mapTile: ".codap-map .leaflet-container",
    newCollection: ".collection-table-spacer.parentMost",
    prevCollection: ".collection-table:nth-child(1) .codap-column-header:nth-child(2)",
  }

  let source_el = "", target_el = ""

  switch (source) {
    case ("table"):
    case ("newCollection"):
      source_el = el.tableHeader
      break
    case ("attribute"):
      source_el = el.tableColumnHeader
      break
    case ("card"):
      source_el = el.caseCardHeader
      break
    case ("x1"):
      source_el = el.x_axis
      break
    case ("x"):
      source_el = el.x_axis_label
      break
    case ("y1"):
      source_el = el.y_axis
      break
    case ("y"):
      source_el = el.y_axis_label
      break
  }

  switch (target) {
    case ("table"):
      target_el = el.tableHeader
      break
    case ("card"):
      target_el = el.caseCardHeaderDropZone
      break
    case ("card collection"):
      target_el = el.caseCardCollectionDropZone
      break
    case ("graph_plot"):
      target_el = el.graphTile
      break
    case ("legend"):
      target_el = el.legend
      break
    case ("map"):
      target_el = el.mapTile
      break
    case ("x1"):
    case ("x"):
      target_el = el.x_axis
      break
    case ("y1"):
    case ("y"):
      target_el = el.y_axis
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
  cy.get(target_el).then($target => {
    return $target[0].getBoundingClientRect()
  }).then($targetRect => {
    cy.get(source_el).contains(attribute).then($subject => {
      cy.mouseMoveBy($subject, $targetRect, { delay: 100 })
    })
  })
  cy.wait(2000)
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
    cy.wrap(subject)
      .trigger("mousedown", { force: true })
      .wait(options?.delay || 0, { log: Boolean(options?.delay) })
      .trigger("mousemove", {
        force: true,
        clientX: Math.floor(targetRect.x + targetRect.width / 2),
        clientY: Math.floor(targetRect.y + targetRect.height / 2),
      })
      .wait(options?.delay || 0, { log: Boolean(options?.delay) })
      .trigger("mouseup", { force: true })
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
