import { closestCenter, CollisionDetection, pointerWithin, rectIntersection } from "@dnd-kit/core"

export const kGraphIdBase = "graph"

const isGraphDropTarget = ({ id }: { id: string | number }) => /^graph.+-drop$/.test(`${id}`)

export const graphCollisionDetection: CollisionDetection = (args) => {
  const graphTargets = args.droppableContainers.filter(isGraphDropTarget)

  // prioritize pointer within a target; need fallback for keyboard sensor
  const collisions = pointerWithin({ ...args, droppableContainers: graphTargets })
  if (collisions.length) return collisions

  // determine the targets that are intersecting the drag rect
  const intersectingTargets = rectIntersection({ ...args, droppableContainers: graphTargets })
  const intersectingTargetIds = new Set<string>(intersectingTargets.map(({ id }) => `${id}`))

  // use closest center to choose among the intersecting drop targets
  const intersectingContainers = graphTargets.filter(({ id }) => intersectingTargetIds.has(`${id}`))
  return closestCenter({ ...args, droppableContainers: intersectingContainers })
}
