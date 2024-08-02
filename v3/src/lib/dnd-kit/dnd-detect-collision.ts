import escapeStringRegexp from "escape-string-regexp"
import { CollisionDetection, pointerWithin, rectIntersection } from "@dnd-kit/core"

interface CollisionDetectionEntry {
  baseId: string
  overlayRegex: RegExp
  droppableRegex: RegExp
  detect: CollisionDetection
}
const gTileCollisionDetectionRegistry: CollisionDetectionEntry[] = []

export const registerTileCollisionDetection = (baseId: string, detect: CollisionDetection = rectIntersection) => {
  const escapedId = escapeStringRegexp(baseId)
  const overlayRegex = new RegExp(`^${escapedId}.+drop-overlay$`)
  const droppableRegex = new RegExp(`^${escapedId}.+drop$`)
  gTileCollisionDetectionRegistry.push({ baseId, overlayRegex, droppableRegex, detect })
}

export const dndDetectCollision: CollisionDetection = (args) => {
  // first determine the component we're in using pointerWithin (for pointer sensor) or
  // rectIntersection (for keyboard sensor)
  const collisions = args.pointerCoordinates ? pointerWithin(args) : rectIntersection(args)

  // if this is a tile drag, then ignore all collisions other than the container
  if (args.active.data.current?.type === "tile") {
    const containers = args.droppableContainers.filter(({id}) => id === "codap-container-drop")
    return rectIntersection({ ...args, droppableContainers: containers })
  }

  // check for registered tile-specific collision handlers
  for (const entry of gTileCollisionDetectionRegistry) {
    const { overlayRegex, droppableRegex, detect } = entry
    // test the tile overlays to find the relevant tile
    if (collisions.find(({id}) => overlayRegex.test(`${id}`))) {
      // filter the drop zones to those appropriate for the relevant tile
      const containers = args.droppableContainers.filter(({id}) => droppableRegex.test(`${id}`))
      // apply the collection detection function specified by the tile
      return detect({ ...args, droppableContainers: containers })
    }
  }

  // if we're in the graph component, use rectangle intersection on the drop targets (e.g. axes, plot)
  if (collisions.find(collision => /graph.+component-drop-overlay/.test(`${collision.id}`))) {
    const containers = args.droppableContainers.filter(({id}) => /graph.+-drop/.test(`${id}`))
    return rectIntersection({ ...args, droppableContainers: containers })
  }

  return collisions
}
