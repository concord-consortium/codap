/**
 * MST model for the Connecting Lines adornment.
 *
 * This model acts as a shim to support the related handler for Connecting Lines,
 * which is a special adornment that delegates its visibility and state to the store's
 * `showConnectingLines` property. Unlike other adornments, Connecting Lines does not
 * have its own renderer or maintain its own state. Instead, it relies on the handler
 * and store for its behavior.
 *
 * @remarks
 * - The `isVisible` view and `setVisibility` action are placeholders to satisfy the
 *   adornment interface, but actual visibility is managed externally in the adornment
 *   store.
 */

import { Instance, types } from "mobx-state-tree"
import { AdornmentModel } from "../adornment-models"
import { kConnectingLinesType } from "./connecting-lines-adornment-types"

export const ConnectingLinesAdornmentModel = AdornmentModel
  .named("ConnectingLinesAdornmentModel")
  .props({
    type: types.optional(types.literal(kConnectingLinesType), kConnectingLinesType)
  })
  .views(self => ({
    get isVisible() {
      // Since we can't easily access the store from here, we'll use a simple approach
      // The handler will manage the actual store state
      return true // Default to true, the handler will override this
    }
  }))
  .actions(self => ({
    setVisibility(isVisible: boolean) {
      // The handler will manage the actual store state
      // This is just a placeholder to satisfy the interface
    }
  }))

export interface IConnectingLinesAdornmentModel extends Instance<typeof ConnectingLinesAdornmentModel> {}
