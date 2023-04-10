import { Instance, types } from "mobx-state-tree"

export const UserTypeEnum = types.enumeration("type", ["student", "teacher"])
export type UserType = Instance<typeof UserTypeEnum>

export const DisplayUserTypeEnum = types.maybe(UserTypeEnum)
export type DisplayUserType = Instance<typeof DisplayUserTypeEnum>
