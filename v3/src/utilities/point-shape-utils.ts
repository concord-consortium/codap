/*
 * The shapes a data point can take, in menu order.
 *
 * In utilities rather than under data-display so the models layer can reference it without
 * importing from components, the way color-utils already serves both.
 */
export const PointShapes = ["circle", "square", "triangle", "diamond", "star", "plus", "x"] as const

export type PointShape = typeof PointShapes[number]

export const kDefaultPointShape: PointShape = "circle"

const kPointShapeSet: ReadonlySet<string> = new Set(PointShapes)

export function isPointShape(value?: string): value is PointShape {
  return kPointShapeSet.has(value as PointShape)
}

/*
 * Shapes arriving from saved documents, v2 imports and plugins are unvalidated strings. Anything
 * unrecognized resolves to the default, so a value this build does not know about renders as a
 * circle rather than leaving the point undrawn.
 */
export function pointShapeOrDefault(value?: string): PointShape {
  return isPointShape(value) ? value : kDefaultPointShape
}
