import { types } from "mobx-state-tree"
import { V2Model } from "./v2-model"

export const V2UserTitleModel = V2Model.named("V2UserTitleModel")
.props({
  userSetTitle: types.maybe(types.boolean)
})
.actions(self => ({
  setUserTitle(title: string) {
    self._title = title
    self.userSetTitle = true
  }
}))
