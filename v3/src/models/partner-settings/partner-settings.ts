import { action, makeObservable, observable } from "mobx"
import { PartnerSettingValue, PartnerSettingValues, validatePartnerSettings } from "./partner-setting-values"
import { PartnerSettingName } from "./partner-settings-registry"

export class PartnerSettings {
  @observable.ref
  private values: PartnerSettingValues = {}

  constructor() {
    makeObservable(this)
  }

  // Replaces every setting with the valid values in `settings`; see docs/partner-settings.md for when to call it.
  @action
  setSettings(settings: unknown) {
    this.values = validatePartnerSettings(settings)
  }

  get<N extends PartnerSettingName>(name: N): PartnerSettingValue<N> | undefined {
    return this.values[name]
  }
}

export const partnerSettings = new PartnerSettings()

/*
 * The way code reads a partner setting; `undefined` means the partner config
 * doesn't set it. Never read one at module scope. See docs/partner-settings.md.
 */
export function getPartnerSetting<N extends PartnerSettingName>(name: N): PartnerSettingValue<N> | undefined {
  return partnerSettings.get(name)
}
