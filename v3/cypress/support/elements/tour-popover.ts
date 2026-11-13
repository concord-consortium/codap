export const TourPopoverElements = {
  getPopover() {
    return cy.get('[data-testid="coachmarks-popover"]')
  },
  getTitle() {
    return cy.get('[data-testid="coachmarks-popover-title"]')
  },
  getDescription() {
    return cy.get('[data-testid="coachmarks-popover-description"]')
  },
  getProgress() {
    return cy.get('[data-testid="coachmarks-popover-progress-text"]')
  },
  getNextButton() {
    return cy.get('[data-testid="coachmarks-popover-next-btn"]')
  },
  getPrevButton() {
    return cy.get('[data-testid="coachmarks-popover-prev-btn"]')
  },
  getCloseButton() {
    return cy.get('[data-testid="coachmarks-popover-close-btn"]')
  }
}
