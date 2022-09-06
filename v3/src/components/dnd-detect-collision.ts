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
  if (collisions.find(collision => /case-table.+component-drop/.test(`${collision.id}`))) {
    const containers = args.droppableContainers.filter(({id}) => `${id}`.includes("table-attribute"))
    return closestCenter({ ...args, droppableContainers: containers })
  }

  // if we're in the graph component, use rectangle intersection on the drop targets (e.g. axes)
  if (collisions.find(collision => /graph.+component-drop/.test(`${collision.id}`))) {
    const containers = args.droppableContainers.filter(({id}) => `${id}`.includes("-axis"))
    return rectIntersection({ ...args, droppableContainers: containers })
  }

  return collisions
}
