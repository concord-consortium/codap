import { CollisionDetection, pointerWithin, rectIntersection } from "@dnd-kit/core"

// the instance-id base of slider droppables (see useNextInstanceId("slider"))
export const kSliderIdBase = "slider"

export const sliderCollisionDetection: CollisionDetection = (args) => {
  // prioritize pointer within a target; need fallback for keyboard sensor
  const collisions = pointerWithin(args)
  return collisions.length ? collisions : rectIntersection(args)
}
