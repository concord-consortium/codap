import { closestCenter, CollisionDetection, pointerWithin, rectIntersection } from "@dnd-kit/core"

export const dndDetectCollision: CollisionDetection = (args) => {
  // first determine the component we're in using pointerWithin (for pointer sensor) or
  // rectIntersection (for keyboard sensor)
  const collisions = args.pointerCoordinates ? pointerWithin(args) : rectIntersection(args)

  // if we're in the summary component, use rectangle intersection on the inspector button
  if (collisions.find(collision => collision.id === "summary-component-drop")) {
    const containers = args.droppableContainers.filter(({id}) => id === "summary-inspector-drop")
    return rectIntersection({ ...args, droppableContainers: containers })
  }

  // if we're in the case table component, use closest center on the column header dividers
  if (collisions.find(collision => /case-table.+component-drop-overlay/.test(`${collision.id}`))) {
    const containers = args.droppableContainers.filter(({id}) => /case-table.+attribute.+-drop/.test(`${id}`))
    return closestCenter({ ...args, droppableContainers: containers })
  }

  // if we're in the graph component, use rectangle intersection on the drop targets (e.g. axes, plot)
  if (collisions.find(collision => /graph.+component-drop-overlay/.test(`${collision.id}`))) {
    const containers = args.droppableContainers.filter(({id}) => /graph.+-drop/.test(`${id}`))
    return rectIntersection({ ...args, droppableContainers: containers })
  }

  return collisions
}
