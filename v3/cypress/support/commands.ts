Cypress.Commands.add("clickMenuItem", text => {
    cy.get("button[role=menuitem]").contains(text).click();
});
