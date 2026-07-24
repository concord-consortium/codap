import escapeStringRegexp from "escape-string-regexp"
import { Collision, CollisionDetection, pointerWithin, rectIntersection } from "@dnd-kit/core"

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

function getZIndexForCollision(collision: Collision) {
  const tileNode = collision.data?.droppableContainer.node.current?.closest("[data-tile-z-index]")
  return tileNode ? parseInt(tileNode.getAttribute("data-tile-z-index") || "0", 10) : 0
}

export const dndDetectCollision: CollisionDetection = (args) => {
  // first determine the component we're in using pointerWithin (for pointer sensor) or
  // rectIntersection (for keyboard sensor)
  const collisions = args.pointerCoordinates ? pointerWithin(args) : rectIntersection(args)

  // sort collisions by z-index of the tile
  const sortedCollisions = collisions.slice().sort((aCollision, bCollision) => {
    const aTileZIndex = getZIndexForCollision(aCollision)
    const bTileZIndex = getZIndexForCollision(bCollision)
    return bTileZIndex - aTileZIndex
  })

  // check for registered tile-specific collision handlers
  if (sortedCollisions.length > 0) {
    // pointerWithin returns droppables whose measured *rects* contain the cursor, and sorting by
    // data-tile-z-index orders the tiles correctly by paint order. The problem isn't the ordering:
    // the drag source tile (e.g., a case table) is raised to the top z-index when it's focused at
    // drag start, so it legitimately sorts above the destination tile (e.g., a graph) it's dragged
    // onto. At cursor positions where the source tile's droppable rect extends past its painted
    // area into the destination tile, the source's droppables still win even though the user sees
    // the destination under the cursor -- causing the drop highlight to flicker. z-index can't
    // disambiguate this (the ordering is already correct), so we use elementFromPoint to find the
    // actually-painted topmost tile and try its prefix first.
    //
    // We can't extract the prefix from the tile root <div>'s id, because tile DOM ids are
    // ULIDs (GRAPH_xxxx) while droppable prefixes use a separate instance-id convention
    // ("graph-1"). Instead we walk sortedCollisions (already sorted by z-index) and pick the
    // first whose droppable's DOM node contains the topmost element under the cursor.
    const candidatePrefixes: string[] = []
    if (args.pointerCoordinates) {
      const { x, y } = args.pointerCoordinates
      const topEl = document.elementFromPoint(x, y)
      if (topEl) {
        for (const collision of sortedCollisions) {
          const node = collision.data?.droppableContainer.node.current
          if (node?.contains(topEl)) {
            const prefix = `${collision.id}`.match(prefixRegex)?.[0]
            if (prefix) {
              candidatePrefixes.push(prefix)
              break
            }
          }
        }
      }
    }
    const firstPrefix = `${sortedCollisions[0].id}`.match(prefixRegex)?.[0]
    if (firstPrefix && !candidatePrefixes.includes(firstPrefix)) candidatePrefixes.push(firstPrefix)

    for (const prefix of candidatePrefixes) {
      const tileCollisions = sortedCollisions.filter(c => `${c.id}`.startsWith(prefix))
      for (const collision of tileCollisions) {
        const { id: collisionId } = collision
        const handler = gTileCollisionDetectionRegistry.find(({overlayRegex}) => overlayRegex.test(`${collisionId}`))
        if (handler) {
          const { droppableRegex, detect } = handler
          // filter the drop zones to those appropriate for the relevant tile
          const containers = args.droppableContainers.filter(({id: containerId}) => {
            return droppableRegex.test(`${containerId}`) && `${containerId}`.startsWith(prefix)
          })
          // apply the collision detection function specified by the tile
          return detect({ ...args, droppableContainers: containers })
        }
      }
    }
  }

  return sortedCollisions
}
