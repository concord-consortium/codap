import { Instance, types } from "mobx-state-tree"
import { uniqueId } from "../../utilities/js-utils"
import { TileRowModel } from "./tile-row"

/*
  Mosaic representation patterned after https://github.com/nomcopter/react-mosaic.
  The mosaic is represented as a binary tree. Rather than using pointers to objects, however,
  the nodes are stored in a map and specified by id. Note that the legacy CLUE row format can
  be represented as a mosaic so it is sufficient to support the mosaic and the CODAP-style
  free-form layout.
 */

export const SplitDirections = ["row", "column"] as const
export type SplitDirection = typeof SplitDirections[number]

export const MosaicTileNode = types.model("MosaicTileNode", {
  id: types.optional(types.identifier, () => uniqueId()),
  direction: types.enumeration(["row", "column"]),
  percent: 0.5,
  first: types.string,  // node id or tile id
  second: types.string  // node id or tile id
})
.views(self => ({
  otherId(nodeOrTileId: string) {
    return self.first === nodeOrTileId ? self.second : self.first
  }
}))
.actions(self => ({
  setPercent(percent: number) {
    self.percent = percent
  },
  replaceNodeOrTileId(matchNodeOrTileId: string, newNodeOrTileId: string) {
    if (self.first === matchNodeOrTileId) {
      self.first = newNodeOrTileId
    }
    else if (self.second === matchNodeOrTileId) {
      self.second = newNodeOrTileId
    }
  }
}))
export interface TMosaicTileNode extends Instance<typeof MosaicTileNode> {}

export const MosaicTileRow = TileRowModel
  .named("MosaicTileRow")
  .props({
    type: types.optional(types.string, "mosaic"),
    nodes: types.map(MosaicTileNode),
    // maps tile ids to parent node ids
    tiles: types.map(types.string),
    root: ""  // id of root node
  })
  .views(self => ({
    getNode(nodeId: string): TMosaicTileNode | undefined {
      return self.nodes.get(nodeId)
    },
    getParentNode(tileId: string): TMosaicTileNode | undefined {
      return self.nodes.get(self.tiles.get(tileId) ?? "")
    }
  }))
  .views(self => ({
    getGrandParentNode(tileId: string): TMosaicTileNode | undefined {
      const parent = self.getParentNode(tileId)

      function processNode(node?: TMosaicTileNode): TMosaicTileNode | undefined {
        const firstNode = node && self.getNode(node.first)
        if (firstNode && (firstNode === parent)) {
          return node
        }
        const secondNode = node && self.getNode(node.second)
        if (secondNode && (secondNode === parent)) {
          return node
        }
        const firstResult = firstNode && processNode(firstNode)
        if (firstResult) return firstResult
        return secondNode && processNode(secondNode)
      }

      return processNode(self.getNode(self.root))
    }
  }))
  .actions(self => ({
    // splitTileId is required except for the first tile
    addTile(newTileId: string, splitTileId?: string, direction: SplitDirection = "row") {
      if (!splitTileId) {
        if (!self.root) {
          self.root = newTileId
        }
        return
      }
      const parentNode = self.getParentNode(splitTileId)
      if (!parentNode) {
        // single tile with no nodes/splits yet
        if (self.root) {
          const rootTileId = self.root
          const firstNode = MosaicTileNode.create({ direction, first: rootTileId, second: newTileId })
          self.nodes.put(firstNode)
          self.root = firstNode.id
          self.tiles.set(rootTileId, firstNode.id)
          self.tiles.set(newTileId, firstNode.id)
        }
        return
      }
      // for now, new tile is always to right or below the tile being split
      const newNode = MosaicTileNode.create({ direction, first: splitTileId, second: newTileId })
      self.nodes.put(newNode)
      parentNode.replaceNodeOrTileId(splitTileId, newNode.id)
      self.tiles.set(splitTileId, newNode.id)
      self.tiles.set(newTileId, newNode.id)
    },
    removeTile(tileId: string) {
      const parentNode = self.getParentNode(tileId)
      if (!parentNode) {
        // there's only a root tile
        self.root = ""
        return
      }
      const grandParentNode = self.getGrandParentNode(tileId)
      if (!grandParentNode) {
        // parent is the root node
        const otherTileId = parentNode.otherId(tileId)
        self.root = otherTileId
        self.tiles.delete(tileId)
        self.tiles.delete(otherTileId)
        self.nodes.delete(parentNode.id)
        return
      }
      // adjust grandparent node
      const otherId = parentNode.otherId(tileId)
      grandParentNode.replaceNodeOrTileId(parentNode.id, otherId)
      self.tiles.delete(tileId)
      if (self.tiles.get(otherId)) {
        self.tiles.set(otherId, grandParentNode.id)
      }
      self.nodes.delete(parentNode.id)
    }
  }))
