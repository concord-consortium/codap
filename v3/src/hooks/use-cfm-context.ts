import { createContext, useContext } from "react"
import { CloudFileManager } from "@concord-consortium/cloud-file-manager"

export const CfmContext = createContext<Maybe<CloudFileManager>>(undefined)

export const useCfmContext = () => {
  return useContext(CfmContext)
}
