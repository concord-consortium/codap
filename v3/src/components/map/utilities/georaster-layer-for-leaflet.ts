import "regenerator-runtime/runtime.js"
import * as L from "leaflet"
import type { Coords, DoneCallback, LatLngBounds } from "leaflet"
import { GeoExtent } from "./geo-extent"
import snap from "snap-bbox"

import type {
  CustomCSSStyleDeclaration,
  GeoRasterLayerOptions,
  GeoRaster,
  GeoRasterKeys,
  DrawTileOptions,
  Tile,
  DebugLevel,
} from "./georaster-types"

const EPSG4326 = 4326

const log = (obj: any) => console.log("[georaster-layer-for-leaflet] ", obj)

if (!L) {
  console.warn(
    "[georaster-layer-for-leaflet] can't find Leaflet."
  )
}

export class GeoRasterLayerClass extends L.GridLayer {

  // properties copied from the GeoRaster
  height!: number
  width!: number
  noDataValue: GeoRaster["noDataValue"]
  palette!: GeoRaster["palette"]
  pixelHeight!: number
  pixelWidth!: number
  projection!: number
  xmin!: number
  xmax!: number
  ymin!: number
  ymax!: number

  // Other properties
  extent!: GeoExtent
  ratio!: number
  debugLevel!: DebugLevel
  tileHeight!: number
  tileWidth!: number
  georaster!: GeoRaster
  cache: Record<string, HTMLElement> = {}
  xMinOfLayer!: number
  xMaxOfLayer!: number
  yMinOfLayer!: number
  yMaxOfLayer!: number

  rawToRgb!: (values: number[]) => string

  // Options
  options!: GeoRasterLayerOptions

  // TODO: this is just a guess, need to confirm this is correct
  protected _cache!: {innerTile: Record<string, L.Rectangle>, tile: Record<string, L.Rectangle>}

  protected _bounds: LatLngBounds | undefined

  // This property is referenced but not defined by the Leaflet types
  // nor is it set by the GeoRasterLayer class. It is defined in the leaflet
  // code though, and is used by the GridLayer implementation.
  protected _globalTileRange!: L.Bounds

  initialize(options: GeoRasterLayerOptions) {
    try {
      this.georaster = options.georaster

      /*
          Unpacking values for use later.
          We do this in order to increase speed.
      */
      const keys = [
        "height",
        "width",
        "noDataValue",
        "palette",
        "pixelHeight",
        "pixelWidth",
        "projection",
        "xmin",
        "xmax",
        "ymin",
        "ymax"
      ] as const
      keys.forEach(key => {
        (this as any)[key] = this.georaster[key]
      })

      this._cache = {
        innerTile: {},
        tile: {}
      }

      this.extent = new GeoExtent([this.xmin, this.ymin, this.xmax, this.ymax], { srs: this.projection })

      // used later if simple projection
      this.ratio = this.height / this.width

      this.debugLevel = options.debugLevel || 0
      if (this.debugLevel >= 1) log({ options })

      // could probably replace some day with a simple
      // (for let k in options) { this.options[k] = options[k]; }
      // but need to find a way around TypeScript any issues
      L.Util.setOptions(this, options)

      /*
          Caching the constant tile size, so we don't recalculate every time we
          create a new tile
      */
      const tileSize = this.getTileSize()
      this.tileHeight = tileSize.y
      this.tileWidth = tileSize.x

    } catch (error) {
      console.error("ERROR initializing GeoTIFFLayer", error)
    }
  }

  onAdd(map: L.Map) {
    if (!this.options.maxZoom) {
      // maxZoom is needed to display the tiles in the correct order over the zIndex between the zoom levels
      // https://github.com/Leaflet/Leaflet/blob/2592967aa6bd392db0db9e58dab840054e2aa291/src/layer/tile/GridLayer.js#L375C21-L375C21
      this.options.maxZoom = map.getMaxZoom()
    }

    L.GridLayer.prototype.onAdd.call(this, map)
    return this
  }

  createTile(coords: Coords, done: DoneCallback) {
    /* This tile is the square piece of the Leaflet map that we draw on */
    const tile = L.DomUtil.create("canvas", "leaflet-tile")

    // we do this because sometimes css normalizers will set * to box-sizing: border-box
    tile.style.boxSizing = "content-box"

    // start tile hidden
    tile.style.visibility = "hidden"

    const context = tile.getContext("2d")

    // note that we aren't setting the tile height or width here
    // drawTile dynamically sets the width and padding based on
    // how much the georaster takes up the tile area
    const coordsKey = this._tileCoordsToKey(coords)

    const resolution = this._getResolution(coords.z)

    if (!context || resolution === undefined) {
      done(new Error("Could not get canvas context or resolution is undefined"), tile)
      return tile
    }

    const key = `${coordsKey}:${resolution}`
    const doneCb = (error?: Error, _tile?: HTMLElement): void => {
      done(error, _tile)

      // caching the rendered tile, to skip the calculation for the next time
      if (!error && this.options.caching && _tile) {
        this.cache[key] = _tile
      }
    }

    if (this.options.caching && this.cache[key]) {
      done(undefined, this.cache[key])
      return this.cache[key]
    } else {
      this.drawTile({ tile, coords, context, done: doneCb, resolution })
    }

    return tile
  }

  drawTile({ tile, coords, context, done, resolution }: DrawTileOptions) {
    try {
      const { debugLevel = 0 } = this

      if (debugLevel >= 2) console.log("starting drawTile with", { tile, coords, context, done })

      let error: Error

      const { z: zoom } = coords

      // stringified hash of tile coordinates for caching purposes
      const cacheKey = [coords.x, coords.y, coords.z].join(",")
      if (debugLevel >= 2) log({ cacheKey })

      const mapCRS = this.getMapCRS()
      if (debugLevel >= 2) log({ mapCRS })

      // Unpacking values for increased speed
      const { xmin, xmax, ymin, ymax } = this

      const extentOfLayer = new GeoExtent(this.getBounds())
      if (debugLevel >= 2) log({ extentOfLayer })

      const pixelHeight = this.pixelHeight
      const pixelWidth = this.pixelWidth
      if (debugLevel >= 2) log({ pixelHeight, pixelWidth })

      // these values are used, so we don't try to sample outside of the raster
      const { xMinOfLayer, xMaxOfLayer, yMinOfLayer, yMaxOfLayer } = this
      const boundsOfTile = this._tileCoordsToBounds(coords)
      if (debugLevel >= 2) log({ boundsOfTile })

      const { code } = mapCRS
      if (debugLevel >= 2) log({ code })
      const extentOfTile = new GeoExtent(boundsOfTile)
      if (debugLevel >= 2) log({ extentOfTile })

      // create blue outline around tiles
      if (debugLevel >= 4) {
        if (!this._cache.tile[cacheKey]) {
          this._cache.tile[cacheKey] = L.rectangle(extentOfTile.leafletBounds, { fillOpacity: 0 })
            .addTo(this.getMap())
            .bindTooltip(cacheKey, { direction: "center", permanent: true })
        }
      }

      // Types of extentOfTile.reproj() are messed up
      // If we are not in a simple CRS, then the code of the CRS will be defined
      const extentOfTileInMapCRS = extentOfTile.reproj(code!)
      if (debugLevel >= 2) log({ extentOfTileInMapCRS })

      let extentOfInnerTileInMapCRS = extentOfTileInMapCRS.crop(this.extent)
      if (!extentOfInnerTileInMapCRS) {
        error = new Error(
          `[georaster-layer-for-leaflet] tile ${cacheKey} is outside of the extent of the layer`
        )
        done(error)
        return
      }
      if (debugLevel >= 2) {
        console.log(
          "[georaster-layer-for-leaflet] extentOfInnerTileInMapCRS",
          extentOfInnerTileInMapCRS.reproj(4326)
        )
      }
      if (debugLevel >= 2) log({ coords, extentOfInnerTileInMapCRS, extent: this.extent })

      // create blue outline around tiles
      if (debugLevel >= 4) {
        if (!this._cache.innerTile[cacheKey]) {
          this._cache.innerTile[cacheKey] = L.rectangle(extentOfInnerTileInMapCRS.leafletBounds, {
            color: "#F00",
            dashArray: "5, 10",
            fillOpacity: 0
          }).addTo(this.getMap())
        }
      }

      const widthOfScreenPixelInMapCRS = extentOfTileInMapCRS.width / this.tileWidth
      const heightOfScreenPixelInMapCRS = extentOfTileInMapCRS.height / this.tileHeight
      if (debugLevel >= 3) log({ heightOfScreenPixelInMapCRS, widthOfScreenPixelInMapCRS })

      // expand tile sampling area to align with raster pixels
      const oldExtentOfInnerTileInRasterCRS = extentOfInnerTileInMapCRS.reproj(this.projection)
      const snapped = snap({
        bbox: oldExtentOfInnerTileInRasterCRS.bbox,
        // pad xmax and ymin of container to tolerate ceil() and floor() in snap()
        container: [xmin, ymin - 0.25 * pixelHeight, xmax + 0.25 * pixelWidth, ymax],
        debug: debugLevel >= 2,
        origin: [xmin, ymax],
        scale: [pixelWidth, -pixelHeight] // negative because origin is at ymax
      })
      const extentOfInnerTileInRasterCRS = new GeoExtent(snapped.bbox_in_coordinate_system, {
        srs: this.projection
      })

      const gridbox = snapped.bbox_in_grid_cells
      const snappedSamplesAcross = Math.abs(gridbox[2] - gridbox[0])
      const snappedSamplesDown = Math.abs(gridbox[3] - gridbox[1])
      const rasterPixelsAcross = Math.ceil(oldExtentOfInnerTileInRasterCRS.width / pixelWidth)
      const rasterPixelsDown = Math.ceil(oldExtentOfInnerTileInRasterCRS.height / pixelHeight)
      const layerCropExtent = this.extent
      const recropTileOrig = oldExtentOfInnerTileInRasterCRS.crop(layerCropExtent) // may be null
      let maxSamplesAcross = 1
      let maxSamplesDown = 1
      if (recropTileOrig !== null) {
        const recropTileProj = recropTileOrig.reproj(code!)
        const recropTile = recropTileProj.crop(extentOfTileInMapCRS)
        if (recropTile !== null) {
          maxSamplesAcross = Math.ceil(resolution * (recropTile.width / extentOfTileInMapCRS.width))
          maxSamplesDown = Math.ceil(resolution * (recropTile.height / extentOfTileInMapCRS.height))
        }
      }

      const overdrawTileAcross = rasterPixelsAcross < maxSamplesAcross
      const overdrawTileDown = rasterPixelsDown < maxSamplesDown
      const numberOfSamplesAcross = overdrawTileAcross ? snappedSamplesAcross : maxSamplesAcross
      const numberOfSamplesDown = overdrawTileDown ? snappedSamplesDown : maxSamplesDown

      if (debugLevel >= 3) {
        console.log(
          `[georaster-layer-for-leaflet] extent of inner tile before snapping ${
            extentOfInnerTileInMapCRS.reproj(4326).bbox.toString()}`
        )
      }

      // Reprojecting the bounding box back to the map CRS would expand it
      // (unless the projection is purely scaling and translation),
      // so instead just extend the old map bounding box proportionately.
      {
        const oldrb = new GeoExtent(oldExtentOfInnerTileInRasterCRS.bbox, { srs: 4326})
        const newrb = new GeoExtent(extentOfInnerTileInRasterCRS.bbox, { srs: 4326})
        const oldmb = new GeoExtent(extentOfInnerTileInMapCRS.bbox, { srs: 4326})
        if (oldrb.width !== 0 && oldrb.height !== 0) {
          let n0 = ((newrb.xmin - oldrb.xmin) / oldrb.width) * oldmb.width
          let n1 = ((newrb.ymin - oldrb.ymin) / oldrb.height) * oldmb.height
          let n2 = ((newrb.xmax - oldrb.xmax) / oldrb.width) * oldmb.width
          let n3 = ((newrb.ymax - oldrb.ymax) / oldrb.height) * oldmb.height
          if (!overdrawTileAcross) {
            n0 = Math.max(n0, 0)
            n2 = Math.min(n2, 0)
          }
          if (!overdrawTileDown) {
            n1 = Math.max(n1, 0)
            n3 = Math.min(n3, 0)
          }
          const newbox = [
            oldmb.xmin + n0, oldmb.ymin + n1, oldmb.xmax + n2, oldmb.ymax + n3
          ] as [number, number, number, number]
          extentOfInnerTileInMapCRS = new GeoExtent(newbox, { srs: extentOfInnerTileInMapCRS.srs })
        }
      }

      // create outline around raster pixels
      if (debugLevel >= 4) {
        if (!this._cache.innerTile[cacheKey]) {
          this._cache.innerTile[cacheKey] = L.rectangle(extentOfInnerTileInMapCRS.leafletBounds, {
            color: "#F00",
            dashArray: "5, 10",
            fillOpacity: 0
          }).addTo(this.getMap())
        }
      }

      if (debugLevel >= 3) {
        console.log(
          `[georaster-layer-for-leaflet] extent of inner tile after snapping ${
            extentOfInnerTileInMapCRS.reproj(4326).bbox.toString()}`
        )
      }

      // Note that the snapped "inner" tile may extend beyond the original tile,
      // in which case the padding values will be negative.

      // we round here because sometimes there will be slight floating arithmetic issues
      // where the padding is like 0.00000000000001
      const padding = {
        left: Math.round((extentOfInnerTileInMapCRS.xmin - extentOfTileInMapCRS.xmin) / widthOfScreenPixelInMapCRS),
        right: Math.round((extentOfTileInMapCRS.xmax - extentOfInnerTileInMapCRS.xmax) / widthOfScreenPixelInMapCRS),
        top: Math.round((extentOfTileInMapCRS.ymax - extentOfInnerTileInMapCRS.ymax) / heightOfScreenPixelInMapCRS),
        bottom: Math.round((extentOfInnerTileInMapCRS.ymin - extentOfTileInMapCRS.ymin) / heightOfScreenPixelInMapCRS)
      }
      if (debugLevel >= 3) log({ padding })

      const innerTileHeight = this.tileHeight - padding.top - padding.bottom
      const innerTileWidth = this.tileWidth - padding.left - padding.right
      if (debugLevel >= 3) log({ innerTileHeight, innerTileWidth })

      if (debugLevel >= 4) {
        const xMinOfInnerTileInMapCRS = extentOfTileInMapCRS.xmin + padding.left * widthOfScreenPixelInMapCRS
        const yMinOfInnerTileInMapCRS = extentOfTileInMapCRS.ymin + padding.bottom * heightOfScreenPixelInMapCRS
        const xMaxOfInnerTileInMapCRS = extentOfTileInMapCRS.xmax - padding.right * widthOfScreenPixelInMapCRS
        const yMaxOfInnerTileInMapCRS = extentOfTileInMapCRS.ymax - padding.top * heightOfScreenPixelInMapCRS
        log({ xMinOfInnerTileInMapCRS, yMinOfInnerTileInMapCRS, xMaxOfInnerTileInMapCRS, yMaxOfInnerTileInMapCRS })
      }

      const canvasPadding = {
        left: Math.max(padding.left, 0),
        right: Math.max(padding.right, 0),
        top: Math.max(padding.top, 0),
        bottom: Math.max(padding.bottom, 0)
      }
      const canvasHeight = this.tileHeight - canvasPadding.top - canvasPadding.bottom
      const canvasWidth = this.tileWidth - canvasPadding.left - canvasPadding.right

      // set padding and size of canvas tile
      tile.style.paddingTop = `${canvasPadding.top  }px`
      tile.style.paddingRight = `${canvasPadding.right  }px`
      tile.style.paddingBottom = `${canvasPadding.bottom  }px`
      tile.style.paddingLeft = `${canvasPadding.left  }px`

      // Only set the height and width if they are different, otherwise the canvas will be cleared
      if (tile.height !== canvasHeight) {
        tile.height = canvasHeight
      }
      tile.style.height = `${canvasHeight  }px`

      if (tile.width !== canvasWidth) {
        tile.width = canvasWidth
      }
      tile.style.width = `${canvasWidth  }px`
      if (debugLevel >= 3) console.log(`setting tile height to ${  canvasHeight  }px`)
      if (debugLevel >= 3) console.log(`setting tile width to ${  canvasWidth  }px`)

      // set how large to display each sample in screen pixels
      const heightOfSampleInScreenPixels = innerTileHeight / numberOfSamplesDown
      const heightOfSampleInScreenPixelsInt = Math.ceil(heightOfSampleInScreenPixels)
      const widthOfSampleInScreenPixels = innerTileWidth / numberOfSamplesAcross
      const widthOfSampleInScreenPixelsInt = Math.ceil(widthOfSampleInScreenPixels)

      const map = this.getMap()
      const tileSize = this.getTileSize()

      // this converts tile coordinates (how many tiles down and right)
      // to pixels from left and top of tile pane
      const tileNwPoint = coords.scaleBy(tileSize)
      if (debugLevel >= 4) log({ tileNwPoint })
      const xLeftOfInnerTile = tileNwPoint.x + padding.left
      const yTopOfInnerTile = tileNwPoint.y + padding.top
      const innerTileTopLeftPoint = { x: xLeftOfInnerTile, y: yTopOfInnerTile }
      if (debugLevel >= 4) log({ innerTileTopLeftPoint })

      // render asynchronously so tiles show up as they finish instead of all at once (which blocks the UI)
      setTimeout(async () => {
        try {
          for (let h = 0; h < numberOfSamplesDown; h++) {
            const yCenterInMapPixels = yTopOfInnerTile + (h + 0.5) * heightOfSampleInScreenPixels
            const latWestPoint = L.point(xLeftOfInnerTile, yCenterInMapPixels)
            const { lat } = map.unproject(latWestPoint, zoom)
            if (lat > yMinOfLayer && lat < yMaxOfLayer) {
              const yInTilePixels = Math.round(h * heightOfSampleInScreenPixels) + Math.min(padding.top, 0)

              let yInRasterPixels = 0
              if (this.projection === EPSG4326) {
                yInRasterPixels = Math.floor((yMaxOfLayer - lat) / pixelHeight)
              }

              for (let w = 0; w < numberOfSamplesAcross; w++) {
                const latLngPoint = L.point(
                  xLeftOfInnerTile + (w + 0.5) * widthOfSampleInScreenPixels,
                  yCenterInMapPixels
                )
                const { lng: xOfLayer } = map.unproject(latLngPoint, zoom)
                if (xOfLayer > xMinOfLayer && xOfLayer < xMaxOfLayer) {
                  let xInRasterPixels = 0
                  if (this.projection === EPSG4326) {
                    xInRasterPixels = Math.floor((xOfLayer - xMinOfLayer) / pixelWidth)
                  } else {
                    throw new Error(
                      `[georaster-layer-for-leaflet] projection ${this.projection} is not supported`)
                  }

                  // get value from array with data for entire raster
                  const values = this.georaster.values.map((band: number[][]) => {
                    return band[yInRasterPixels][xInRasterPixels]
                  })

                  // x-axis coordinate of the starting point of the rectangle representing the raster pixel
                  const x = Math.round(w * widthOfSampleInScreenPixels) + Math.min(padding.left, 0)

                  // y-axis coordinate of the starting point of the rectangle representing the raster pixel
                  const y = yInTilePixels

                  // how many real screen pixels does a pixel of the sampled raster take up
                  const width = widthOfSampleInScreenPixelsInt
                  const height = heightOfSampleInScreenPixelsInt

                  const color = this.getColor(values)
                  if (color && context) {
                    context.fillStyle = color
                    context.fillRect(x, y, width, height)
                  }
                }
              }
            }
          }

          tile.style.visibility = "visible" // set to default
        } catch (e: any) {
          console.error(e)
          error = e
        }
        done && done(error, tile)
      }, 0)

      // return the tile so it can be rendered on screen
      return tile
    } catch (error: any) {
      console.error(error)
      done && done(error, tile)
    }
  }

  // copied from Leaflet with slight modifications,
  // including removing the lines that set the tile size
  _initTile (tile: HTMLCanvasElement) {
    L.DomUtil.addClass(tile, "leaflet-tile")

    tile.onselectstart = L.Util.falseFn
    tile.onmousemove = L.Util.falseFn

    // update opacity on tiles in IE7-8 because of filter inheritance problems
    if (this.options.opacity !== undefined && L.Browser.ielt9 && this.options.opacity < 1) {
      L.DomUtil.setOpacity(tile, this.options.opacity)
    }

    // without this hack, tiles disappear after zoom on Chrome for Android
    // https://github.com/Leaflet/Leaflet/issues/2078
    if (L.Browser.android && !L.Browser.android23) {
      (<CustomCSSStyleDeclaration>tile.style).WebkitBackfaceVisibility = "hidden"
    }
  }

  // method from https://github.com/Leaflet/Leaflet/blob/bb1d94ac7f2716852213dd11563d89855f8d6bb1/src/layer/ImageOverlay.js
  getBounds () {
    this.initBounds()
    // initBounds will throw an error if it can't initialize the bounds
    return this._bounds!
  }

  getMap () {
    // This _mapToAdd property is not defined by typescript, but perhaps it is used
    // by some versions of Leaflet?
    return this._map || (this as any)._mapToAdd
  }

  getMapCRS () {
    return this.getMap()?.options.crs || L.CRS.EPSG3857
  }

  // add in to ensure backwards compatability with Leaflet 1.0.3
  _tileCoordsToNwSe (coords: Coords) {
    const map = this.getMap()
    // This normalizes the tileSize option passed to the layer into a point
    // So typically a point with x and y equal to 256.
    const tileSize = this.getTileSize()
    // This multiplies the x and y coordinates of the tile by the tileSize
    const nwPoint = coords.scaleBy(tileSize)
    const sePoint = nwPoint.add(tileSize)
    // Convert the pixel coordinates at this zoom level to geographical coordinates
    const nw = map.unproject(nwPoint, coords.z)
    const se = map.unproject(sePoint, coords.z)
    return [nw, se]
  }

  /**
   * Lat Lng bounds of the tile at these coordinates, the bounds are wrapped if necessary
   * @param coords
   * @returns
   */
  _tileCoordsToBounds (coords: Coords) {
    const [nw, se] = this._tileCoordsToNwSe(coords)
    let bounds: LatLngBounds = new L.LatLngBounds(nw, se)

    if (!this.options.noWrap) {
      const crs = this.getMapCRS()
      // In the types wrapLatLngBounds is defined on the L.Map class, there is a wrapLatLng defined
      // on the CRS interface just not a wrapLatLngBounds.
      bounds = (crs as any).wrapLatLngBounds(bounds) as LatLngBounds
    }
    return bounds
  }

  _isValidTile (coords: Coords) {
    const crs = this.getMapCRS()

    // This first part is copied from  _isValidTile method in GridLayer
    if (!crs.infinite) {
      // don't load tile if it's out of bounds and not wrapped
      const globalBounds = this._globalTileRange
      if (
        (!crs.wrapLng && (coords.x < globalBounds.min!.x || coords.x > globalBounds.max!.x)) ||
        (!crs.wrapLat && (coords.y < globalBounds.min!.y || coords.y > globalBounds.max!.y))
      ) {
        return false
      }
    }

    const bounds = this.getBounds()

    if (!bounds) {
      return true
    }
    // End of copied part

    const { x, y, z } = coords

    const layerExtent = new GeoExtent(bounds)

    const boundsOfTile = this._tileCoordsToBounds(coords)

    // check given tile coordinates
    // boundsOfTile is a LatLngBounds object, the types of GeoExtent only
    // alow GeoExtent objects, however the code appears to allow LatLngBounds objects too
    if (layerExtent.overlaps(new GeoExtent(boundsOfTile))) return true

    // width of the globe in tiles at the given zoom level
    const width = Math.pow(2, z)

    // check one world to the left
    const leftCoords = L.point(x - width, y) as Coords
    leftCoords.z = z
    const leftBounds = this._tileCoordsToBounds(leftCoords)
    if (layerExtent.overlaps(new GeoExtent(leftBounds))) return true

    // check one world to the right
    const rightCoords = L.point(x + width, y) as Coords
    rightCoords.z = z
    const rightBounds = this._tileCoordsToBounds(rightCoords)
    if (layerExtent.overlaps(new GeoExtent(rightBounds))) return true

    return false
  }

  getColor (values: number[]): string | undefined {
    const numberOfValues = values.length
    const haveDataForAllBands = values.every(value => value !== undefined && value !== this.noDataValue)
    if (haveDataForAllBands) {
      if (numberOfValues === 1) {
        const value = values[0]
        if (this.palette) {
          const [r, g, b, a] = this.palette[value]
          return `rgba(${r},${g},${b},${a / 255})`
        }
      } else if (numberOfValues === 2) {
        return `rgb(${values[0]},${values[1]},0)`
      } else if (numberOfValues === 3) {
        return `rgb(${values[0]},${values[1]},${values[2]})`
      } else if (numberOfValues === 4) {
        return `rgba(${values[0]},${values[1]},${values[2]},${values[3] / 255})`
      }
    }
  }

  getTiles(): Tile[] {
    // transform _tiles object collection into an array
    // assume the _tiles all all of our own tiles which means their elements are HTMLCanvasElements
    return Object.values(this._tiles) as Tile[]
  }

  getActiveTiles(): Tile[] {
    const tiles: Tile[] = this.getTiles()
    // only return valid tiles
    return tiles.filter(tile => this._isValidTile(tile.coords))
  }

  isSupportedProjection () {
    return this.projection === EPSG4326
  }

  initBounds (options?: GeoRasterLayerOptions) {
    if (!options) options = this.options
    if (!this._bounds) {
      const { debugLevel, projection, xmin, xmax, ymin, ymax } = this
      if (projection === EPSG4326) {
        if (debugLevel >= 1) console.log(`georaster projection is in ${EPSG4326}`)
        const minLatWest = L.latLng(ymin, xmin)
        const maxLatEast = L.latLng(ymax, xmax)
        this._bounds = L.latLngBounds(minLatWest, maxLatEast)
      } else {
        throw new Error(`No support for rasters with the projection ${projection}.`)
      }

      const bounds = this._bounds
      // these values are used so we don't try to sample outside of the raster
      this.xMinOfLayer = bounds.getWest()
      this.xMaxOfLayer = bounds.getEast()
      this.yMaxOfLayer = bounds.getNorth()
      this.yMinOfLayer = bounds.getSouth()

      options.bounds = this._bounds
    }
  }

  same(array: GeoRaster[], key: GeoRasterKeys) {
    return new Set(array.map(item => item[key])).size === 1
  }

  clearCache() {
    this.cache = {}
  }

  _getResolution(zoom: number) {
    const { resolution } = this.options

    let resolutionValue: number | undefined
    if (typeof resolution === "object") {
      const zoomLevels = Object.keys(resolution)

      for (const key in zoomLevels) {
        if (Object.prototype.hasOwnProperty.call(zoomLevels, key)) {
          const zoomLvl = parseInt(zoomLevels[key], 10)
          if (zoomLvl <= zoom) {
            resolutionValue = resolution[zoomLvl]
          } else {
            break
          }
        }
      }
    } else {
      resolutionValue = resolution
    }

    return resolutionValue
  }

  /**
   * Update the GeoRaster of the layer and redraw the active tiles.
   * If the new GeoRaster has incompatible dimensions or opacity, it will not be updated.
   * If the GeoRaster can't be updated we return false.
   *
   * @param georaster
   * @param opacity
   * @returns
   */
  updateGeoraster(georaster: GeoRaster, opacity: number): boolean {
    // Make sure this is a simple update
    if (
      this.georaster.width !== georaster.width ||
      this.georaster.height !== georaster.height ||
      this.georaster.pixelWidth !== georaster.pixelWidth ||
      this.georaster.pixelHeight !== georaster.pixelHeight ||
      this.options.opacity !== opacity
    ) {
      // The new GeoRaster is not compatible with this layer
      return false
    }

    this.georaster = georaster
    this.palette = georaster.palette

    const tiles = this.getActiveTiles()
    console.log("Updating existing GeoRasterLayer with new georaster. Num tiles", tiles.length)
    if (!tiles) {
      console.error("No active tiles available")
      // We did update the georaster, but we can't redraw the tiles
      return true
    }

    // We clear the cache so that the tiles all the way down will be redrawn with the new georaster
    this.clearCache()

    tiles.forEach((tile: any) => {
      const { coords, el } = tile
      const wrappedCoords = this._wrapCoords(coords)
      const resolution = this._getResolution(wrappedCoords.z)
      if (resolution === undefined) {
        console.error("Could not get resolution for tile")
        return
      }

      const done = () => {}
      this.drawTile({ tile: el, coords: wrappedCoords, resolution, context: el.getContext("2d"), done })
    })

    return true
  }
}

// We define the properties in the GeoRasterLayerClass so we can use Typescript's checking of this
// and automatically declaration of the method signature so they can be used
// by other methods of the class.
// Then we extract the properties and create an object which is what we pass
// to Leaflet's L.GridLayer.extend method.
// This should mean Leaflet's class system works as expected.
const properties = Object.getOwnPropertyNames(GeoRasterLayerClass.prototype)
  .filter(name => name !== "constructor") // Exclude the constructor
  .reduce((acc, propertyName) => {
    acc[propertyName] = GeoRasterLayerClass.prototype[propertyName as keyof GeoRasterLayerClass]
    return acc
  }, {} as Record<string, any>)

const GeoRasterLayer: (new (options: GeoRasterLayerOptions) => any) & typeof L.Class = L.GridLayer.extend({
  ...properties,

  options: {
    updateWhenIdle: true,
    updateWhenZooming: false,
    keepBuffer: 25,
    resolution: 2 ** 5,
    debugLevel: 0,
    caching: true
  },
})

export default GeoRasterLayer

// Explicitly exports public types
export type { GeoRaster, GeoRasterLayerOptions, PixelValuesToColorFn } from "./georaster-types"
