import { SnapshotIn } from "mobx-state-tree"
import { SettingsMstType } from "./settings"

export interface ProblemConfiguration {
  disabledFeatures: string[];
  placeholderText: string;
  settings: SnapshotIn<typeof SettingsMstType>;
}
