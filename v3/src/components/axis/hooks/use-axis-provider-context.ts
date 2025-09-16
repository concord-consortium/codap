import { createContext, useContext } from "react"
import { AxisPlace } from "../axis-types"
import { IAxisProvider } from "../models/axis-provider"

export const AxisProviderContext = createContext<Maybe<IAxisProvider>>(undefined)

export const useAxisProviderContext = () => {
  const context = useContext(AxisProviderContext)
  if (!context) {
    throw new Error("useAxisProviderContext must be used within an AxisProviderContextProvider")
  }
  return context
}

export function useAxisModel(place: AxisPlace) {
  return useAxisProviderContext().getAxis(place)
}
