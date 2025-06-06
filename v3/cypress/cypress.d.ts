export {}

declare global {
  namespace Cypress {
    interface Cypress {
      // added to Cypress config via cypress.*.json configuration files
      config(key: "index" | "v3ActivityPlayerUrl"): string
    }
    interface Chainable {
      /**
       * Custom commands defined in commands.ts
       */
      clickMenuItem(item: string): void
      clickToUnselect(subject: Array<{ x: number, y: number }>, options?: { delay: number }): void
      clickWhenClickable(selector: string, shouldCondition?: string): void
      containsText(selector: string, text: string): Chainable<JQuery<HTMLElement>>,
      checkDragAttributeHighlights(source: string, attribute: string, target: string, exists?: boolean): void
      dragAttributeToTarget(source: string, attribute: string, target: string, targetNumber?: number): void
      mouseMoveBy(subject: JQuery<HTMLElement>, targetRect: DOMRect, options?: { delay: number }): void
      pointerMoveBy(subject: JQuery<HTMLElement>, targetRect: DOMRect, options?: { delay: number }): void
    }
  }
}
