import { types, Instance, SnapshotIn } from "mobx-state-tree"
import { ConfigurationManager } from "./configuration-manager"
import { SettingsGroupMstType } from "./settings"
import { UnitConfiguration } from "./unit-configuration"

export const AppConfigModel = types
  .model("AppConfig", {
    config: types.frozen<UnitConfiguration>()
  })
  .volatile(self => ({
    configMgr: new ConfigurationManager(self.config, []),
    disabledFeatures: self.config?.disabledFeatures || [],
    settings: self.config?.settings
  }))
  .actions(self => ({
    setConfigs(configs: Partial<UnitConfiguration>[]) {
      self.configMgr = new ConfigurationManager(self.config, configs)
      self.disabledFeatures = self.configMgr.disabledFeatures
      self.settings = self.configMgr.settings
    }
  }))
  .views(self => ({
    get appName() { return self.configMgr.appName },
    get pageTitle() { return self.configMgr.pageTitle },
    get defaultDocumentTitle() { return self.configMgr.defaultDocumentTitle },
    get disableTileDrags() { return self.configMgr.disableTileDrags },
    get placeholderText() { return self.configMgr.placeholderText },
    getSetting(key: string, group?: string) {
      const groupSettings = group ? self.settings?.[group] as SnapshotIn<typeof SettingsGroupMstType> : undefined
      return groupSettings?.[key] || self.settings?.[key]
    }
  }))
  .views(self => ({
    isFeatureSupported(feature: string) {
      const featureIndex = self.disabledFeatures?.findIndex(f => f === feature || f === `!${feature}`)
      return featureIndex >= 0 ? self.disabledFeatures[featureIndex][0] === "!" : true
    },
    getDisabledFeaturesOfTile(tile: string) {
      const disabledFeatures = self.disabledFeatures
                                .filter(feature => (!tile || feature.includes(tile)) && (feature[0] !== "!"))
      return disabledFeatures
    }
  }))
export interface AppConfigModelType extends Instance<typeof AppConfigModel> {}
export interface AppConfigModelSnapshot extends SnapshotIn<typeof AppConfigModel> {}
