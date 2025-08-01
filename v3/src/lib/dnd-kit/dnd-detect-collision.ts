import escapeStringRegexp from "escape-string-regexp"
import { CollisionDetection, pointerWithin, rectIntersection } from "@dnd-kit/core"

const prefixRegex = /[A-Za-z-]+-\d+/

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

  // sort collisions by z-index of the tile
  const sortedCollisions = collisions.slice().sort((aCollision, bCollision) => {
    const aTileNode = aCollision.data?.droppableContainer.node.current?.closest("[data-tile-z-index]")
    const aTileZIndex = aTileNode ? parseInt(aTileNode.getAttribute("data-tile-z-index") || "0", 10) : 0
    const bTileNode = bCollision.data?.droppableContainer.node.current?.closest("[data-tile-z-index]")
    const bTileZIndex = bTileNode ? parseInt(bTileNode.getAttribute("data-tile-z-index") || "0", 10) : 0
    return bTileZIndex - aTileZIndex
  })

  // if this is a tile drag, then ignore all collisions other than the container
  if (args.active.data.current?.type === "tile") {
    const containers = args.droppableContainers.filter(({id}) => id === "codap-container-drop")
    return rectIntersection({ ...args, droppableContainers: containers })
  }

  // check for registered tile-specific collision handlers
  if (sortedCollisions.length > 0) {
    // find the prefix for the first tile collision
    const prefix = `${sortedCollisions[0].id}`.match(prefixRegex)?.[0]
    if (prefix) {
      // find all collisions for the first tile
      const tileCollisions = sortedCollisions.filter(c => `${c.id}`.startsWith(prefix))
      for (const collision of tileCollisions) {
        const { id: collisionId } = collision
        const handler = gTileCollisionDetectionRegistry.find(({overlayRegex}) => overlayRegex.test(`${collisionId}`))
        if (handler) {
          const { droppableRegex, detect } = handler
          // filter the drop zones to those appropriate for the relevant tile
          const containers =
            args.droppableContainers.filter(({id: containerId}) => droppableRegex.test(`${containerId}`))
          // apply the collision detection function specified by the tile
          return detect({ ...args, droppableContainers: containers })
        }
      }
    }
  }

  return sortedCollisions
}
