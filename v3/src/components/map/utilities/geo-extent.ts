import * as L from "leaflet"
import unwrap from "bbox-fns/unwrap.js"

function isFunc(o: any) {
  return typeof o === "function"
}
function isObj(o: any) {
  return o !== null && typeof o === "object"
}
function hasFunc(o: any, f: string) {
  return isObj(o) && isFunc(o[f])
}
function hasFuncs(o: any, fs: string[]) {
  return fs.every(f => hasFunc(o, f))
}
function isLeafletLatLngBounds(o: any): o is L.LatLngBounds {
  return isObj(o) && hasFuncs(o, ["getEast", "getNorth", "getSouth", "getWest"])
}

export class GeoExtent {
  xmin: number
  xmax: number
  ymin: number
  ymax: number
  srs: number
  // TODO this should take a few options for the first argument:
  // - an array of [xmin, ymin, xmax, ymax]
  // - a L.LatLngBounds object
  // - a bounding box returned by snapped.bbox_in_coordinate_system
  // - the bounding box returned by GeoExtent#bbox this looks like it is just an array
  //   like the first option, but perhaps it is more?
  // and { srs: number} - the projection number
  //
  constructor(bbox: [number, number, number, number], options: { srs: number })
  constructor(leafletBounds: L.LatLngBounds)
  constructor(extent: GeoExtent)
  constructor(
    bboxOrExtentOrBounds: ([number, number, number, number]) | L.LatLngBounds | GeoExtent,
    options?: { srs: number }
  ) {
    if (Array.isArray(bboxOrExtentOrBounds)) {
      const [xmin, ymin, xmax, ymax] = bboxOrExtentOrBounds
      this.xmin = xmin
      this.xmax = xmax
      this.ymin = ymin
      this.ymax = ymax
      this.srs = options!.srs
    } else if (isLeafletLatLngBounds(bboxOrExtentOrBounds)) {
      const bounds = bboxOrExtentOrBounds
      this.xmin = bounds.getWest()
      this.xmax = bounds.getEast()
      this.ymin = bounds.getSouth()
      this.ymax = bounds.getNorth()
      this.srs = 4326
    } else {
      const {xmin, xmax, ymin, ymax, srs} = bboxOrExtentOrBounds
      this.xmin = xmin
      this.xmax = xmax
      this.ymin = ymin
      this.ymax = ymax
      this.srs = srs
    }
  }

  /*
   else if (isLeafletLatLngBounds(o)) {
      (xmin = o.getWest()), (xmax = o.getEast()), (ymin = o.getSouth()), (ymax = o.getNorth())
      if (!isDef(this.srs)) this.srs = "EPSG:4326"
    }
  */

  leafletProjection(code: number): L.Projection {
    switch (code) {
      case 4326:
        return L.Projection.LonLat
      case 3857:
        return L.Projection.SphericalMercator
      default:
        throw new Error(`Unsupported projection code: ${code}`)
    }
  }

  numericProjectionCode(code: number | string): number {
    if (typeof code === "number") {
      return code
    }
    switch (code) {
      case "EPSG:4326":
        return 4326
      case "EPSG:3857":
        return 3857
      default:
        throw new Error(`Invalid projection code: ${code}`)
    }
  }

  reproj(code: number | string): GeoExtent {
    const numCode = this.numericProjectionCode(code)
    // Note: this will only be accurate for certain projections (like 4326 and 3857)
    // To support other projections, we need to create a set of points on each line
    // of the bounding box and transform those points to the new projection
    // The https://github.com/DanielJDufour/geo-extent library does this.
    const points: L.Point[] = [
      L.point(this.xmin, this.ymin),
      L.point(this.xmax, this.ymin),
      L.point(this.xmax, this.ymax),
      L.point(this.xmin, this.ymax)
    ]

    const fromProjection = this.leafletProjection(this.srs)
    const toProjection = this.leafletProjection(numCode)
    const transformedPoints = points.map(point => {
      const latLng = fromProjection.unproject(point)
      return toProjection.project(latLng)
    })
    const xmin = Math.min(...transformedPoints.map(p => p.x))
    const xmax = Math.max(...transformedPoints.map(p => p.x))
    const ymin = Math.min(...transformedPoints.map(p => p.y))
    const ymax = Math.max(...transformedPoints.map(p => p.y))

    return new GeoExtent([xmin, ymin, xmax, ymax], { srs: numCode })
  }

  clone(): GeoExtent {
    return new GeoExtent(this)
  }

  contains(other: GeoExtent): boolean {
    const otherInOurSrs = other.reproj(this.srs)

    // Check if this extent completely contains the other extent
    return (this.xmin <= otherInOurSrs.xmin && this.xmax >= otherInOurSrs.xmax &&
            this.ymin <= otherInOurSrs.ymin && this.ymax >= otherInOurSrs.ymax)
  }

  unwrap(): GeoExtent[] {
    const { xmin, xmax, srs } = this

    if (srs !== 4326 || (xmin >= -180 && xmax <= 180)) {
      // Not in 4326 or already within the dateline bounds
      return [this.clone()]
    }

    const bboxes = unwrap(this.bbox, [-180, -90, 180, 90])

    return bboxes.map((bbox: any) => new GeoExtent(bbox, { srs: 4326 }))
  }

  combine(other: GeoExtent): GeoExtent {
    const otherInOurSrs = other.reproj(this.srs)

    const xmin = Math.min(this.xmin, otherInOurSrs.xmin)
    const xmax = Math.max(this.xmax, otherInOurSrs.xmax)
    const ymin = Math.min(this.ymin, otherInOurSrs.ymin)
    const ymax = Math.max(this.ymax, otherInOurSrs.ymax)

    return new GeoExtent([xmin, ymin, xmax, ymax], { srs: this.srs })
  }

  crop(other: GeoExtent): GeoExtent | null {
    // Note: in the original code it cloned the other extent first, but it isn't clear why

    if (!this.overlaps(other)) {
      // No overlap
      return null
    }

    if (other.contains(this)) {
      // The other extent completely contains this extent
      return this.clone()
    }

    if (other.srs === 4326 && (other.xmin < -180 || other.xmax > 180)) {
      const parts = other.unwrap()
      const croppedParts = parts
        .map(part => this.crop(part))
        .filter(part => part !== null)

      // no overlap
      if (croppedParts.length === 0) return null

      let combo = croppedParts[0]
      for (let i = 1; i < croppedParts.length; i++) {
        combo = combo.combine(croppedParts[i])
      }
      return combo
    }

    const another = this.srs === other.srs ? other.clone() : other.reproj(this.srs)
    if (!this.overlaps(another)) {
      // No overlap after reprojection
      return null
    }
    const xmin = Math.max(this.xmin, another.xmin)
    const ymin = Math.max(this.ymin, another.ymin)
    const xmax = Math.min(this.xmax, another.xmax)
    const ymax = Math.min(this.ymax, another.ymax)
    return new GeoExtent([xmin, ymin, xmax, ymax], { srs: this.srs })

    // Note: in the original version it handled some case where another couldn't be
    // created, but it seems like we can simplify that in this case
    // However I'm not entirely sure when using the 4326 projection what the xmin and xmax
    // should be. Are they pixel values on a rectangle that is offset or are the lat/long values?
    // Also what about the scale in these cases?
    // Hopefully that will all be clear as I implement more methods
  }

  overlaps(other: GeoExtent): boolean {
    const otherInOurSrs = other.reproj(this.srs)

    // Check if there is any overlap between this extent and the other extent
    const yOverlaps = this.ymin <= otherInOurSrs.ymax && this.ymax >= otherInOurSrs.ymin
    const xOverlaps = this.xmin <= otherInOurSrs.xmax && this.xmax >= otherInOurSrs.xmin
    return xOverlaps && yOverlaps
  }

  get width(): number {
    return this.xmax - this.xmin
  }

  get height(): number {
    return this.ymax - this.ymin
  }

  get bbox(): [number, number, number, number] {
    return [this.xmin, this.ymin, this.xmax, this.ymax]
  }

  // In the original code this would just return the coordinates directly
  // without making sure they were lat long
  get leafletBounds(): L.LatLngBounds {
    const latLngExtent = this.reproj(4326) // Always project to 4326 for Leaflet bounds

    return L.latLngBounds(
      L.latLng(latLngExtent.ymin, latLngExtent.xmin),
      L.latLng(latLngExtent.ymax, latLngExtent.xmax)
    )
  }
}
