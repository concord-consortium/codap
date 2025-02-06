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

export const dndDetectCollision: CollisionDetection = (_args) => {
  // sort the containers by z-index of the tile
  const sortedContainers = _args.droppableContainers.slice().sort((aContainer, bContainer) => {
    const aTileNode = aContainer.node.current?.closest("[data-tile-z-index]")
    const aTileZIndex = aTileNode ? parseInt(aTileNode.getAttribute("data-tile-z-index") || "0", 10) : 0
    const bTileNode = bContainer.node.current?.closest("[data-tile-z-index]")
    const bTileZIndex = bTileNode ? parseInt(bTileNode.getAttribute("data-tile-z-index") || "0", 10) : 0
    return bTileZIndex - aTileZIndex
  })
  const args = { ..._args, droppableContainers: sortedContainers }

  // first determine the component we're in using pointerWithin (for pointer sensor) or
  // rectIntersection (for keyboard sensor)
  const collisions = args.pointerCoordinates ? pointerWithin(args) : rectIntersection(args)

  // if this is a tile drag, then ignore all collisions other than the container
  if (args.active.data.current?.type === "tile") {
    const containers = args.droppableContainers.filter(({id}) => id === "codap-container-drop")
    return rectIntersection({ ...args, droppableContainers: containers })
  }

  // check for registered tile-specific collision handlers
  for (const collision of collisions) {
    const { id: collisionId } = collision
    // find the first tile handler overlay that matches the collision
    const handler = gTileCollisionDetectionRegistry.find(({overlayRegex}) => overlayRegex.test(`${collisionId}`))
    if (handler) {
      const { droppableRegex, detect } = handler
      // filter the drop zones to those appropriate for the relevant tile
      const containers = sortedContainers.filter(({id: containerId}) => droppableRegex.test(`${containerId}`))
      // apply the collection detection function specified by the tile
      return detect({ ...args, droppableContainers: containers })
    }
  }

  return collisions
}
