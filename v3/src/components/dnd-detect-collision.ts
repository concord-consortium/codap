import { closestCenter, CollisionDetection, pointerWithin, rectIntersection } from "@dnd-kit/core"

export const dndDetectCollision: CollisionDetection = (args) => {
  // use pointerWithin to determine the component we're in
  const collisions = pointerWithin(args)

  // if we're in the summary component, use rectangle intersection on the inspector button
  if (collisions.find(collision => collision.id === "summary-component-drop")) {
    const containers = args.droppableContainers.filter(({id}) => id === "summary-inspector-drop")
    return rectIntersection({ ...args, droppableContainers: containers })
  }

  // if we're in the case table component, use closest center on the column header dividers
  if (collisions.find(collision => collision.id === "case-table-drop")) {
    const containers = args.droppableContainers.filter(({id}) => `${id}`.includes("table-attribute"))
    return closestCenter({ ...args, droppableContainers: containers })
  }

  return collisions
}
