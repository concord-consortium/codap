import { isPointShape, kDefaultPointShape, PointShapes, pointShapeOrDefault } from "./point-shape-utils"

describe("point shape utils", () => {
  it("defaults to circle, which is what existing documents render as", () => {
    expect(kDefaultPointShape).toBe("circle")
    expect(PointShapes).toContain(kDefaultPointShape)
  })

  it("lists the seven shapes with circle first", () => {
    expect(PointShapes).toEqual(["circle", "square", "triangle", "diamond", "star", "plus", "x"])
  })

  describe("isPointShape", () => {
    it("accepts every listed shape", () => {
      PointShapes.forEach(shape => expect(isPointShape(shape)).toBe(true))
    })

    it("rejects anything else", () => {
      expect(isPointShape("hexagon")).toBe(false)
      expect(isPointShape("")).toBe(false)
      expect(isPointShape(undefined)).toBe(false)
      // case-sensitive: shapes are stored as written, not normalized
      expect(isPointShape("Circle")).toBe(false)
    })

    it("is not fooled by inherited Array properties", () => {
      expect(isPointShape("length")).toBe(false)
      expect(isPointShape("constructor")).toBe(false)
    })
  })

  describe("pointShapeOrDefault", () => {
    it("passes through a known shape", () => {
      expect(pointShapeOrDefault("star")).toBe("star")
    })

    it("falls back for values a future build might not know", () => {
      // A shape written by a newer version must not leave the point unrendered.
      expect(pointShapeOrDefault("hexagon")).toBe(kDefaultPointShape)
      expect(pointShapeOrDefault(undefined)).toBe(kDefaultPointShape)
      expect(pointShapeOrDefault("")).toBe(kDefaultPointShape)
    })
  })
})
