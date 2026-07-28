import { createContext, useContext } from "react"
import { MarqueeState } from "../models/marquee-state"

// Shares the display's MarqueeState with descendants (e.g. a plot that renders its own marquee)
// without threading it through props. Provided by the graph alongside the Background/Marquee it
// already passes the same state to.
export const MarqueeStateContext = createContext<MarqueeState | undefined>(undefined)

export const useMarqueeStateContext = () => useContext(MarqueeStateContext)
