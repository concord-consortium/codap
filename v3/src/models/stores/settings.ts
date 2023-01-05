import { Instance, types } from "mobx-state-tree"

const SettingValueMstType = types.union(types.string, types.number, types.boolean)
export const SettingsGroupMstType = types.map(SettingValueMstType)
export const SettingsMstType = types.map(types.union(SettingValueMstType, SettingsGroupMstType))

export type SettingValueType = string | number | boolean
export type MaybeSettingValueType = SettingValueType | undefined
export type SettingsGroupType = Instance<typeof SettingsGroupMstType>
export type SettingsType = Instance<typeof SettingsMstType>

export function getSetting(settings: SettingsType, key: string, group?: string): MaybeSettingValueType {
  if (group) {
    const groupSettings: SettingsGroupType | undefined = settings.get(group) as SettingsGroupType | undefined
    return groupSettings?.get(key)
  }
  return settings.get(key) as MaybeSettingValueType
}
