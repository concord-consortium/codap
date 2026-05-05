import { observer } from "mobx-react-lite"
import { OutlineRing } from "./outline-ring"
import { Popover } from "./popover"
import { EngineLiveState } from "./tour-engine-state"

interface TourRootProps { state: EngineLiveState }

export const TourRoot = observer(function TourRoot({ state }: TourRootProps) {
  if (!state.active || !state.currentStep) return null
  return (
    <>
      <OutlineRing target={state.currentStep.element} state={state} />
      <Popover state={state} />
    </>
  )
})
