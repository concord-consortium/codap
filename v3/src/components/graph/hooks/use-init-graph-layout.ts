import { comparer } from "mobx"
import { useEffect } from "react"
import { useMemo } from "use-memo-one"
import { DEBUG_LOWER_PLOT } from "../../../lib/debug"
import { mstReaction } from "../../../utilities/mst-reaction"
import { AxisPlace } from "../../axis/axis-types"
import {IGraphContentModel} from "../models/graph-content-model"
import { GraphLayout } from "../models/graph-layout"

export function useInitGraphLayout(model?: IGraphContentModel) {
  const layout = useMemo(() => {
    const l = new GraphLayout()
    if (DEBUG_LOWER_PLOT) l.setShowLowerPlot(true)
    return l
  }, [])

  useEffect(() => {
    // synchronize the number of repetitions from the DataConfiguration to the layout's MultiScales
    const { dataConfiguration } = model || {}
    return mstReaction(
      () => {
        dataConfiguration?.casesChangeCount // eslint-disable-line @typescript-eslint/no-unused-expressions
        const repetitions: Partial<Record<AxisPlace, number>> = {}
        layout.axisScales.forEach((multiScale, place) => {
          repetitions[place] = dataConfiguration?.numRepetitionsForPlace(place) ?? 1
        })
        return repetitions
      },
      (repetitions) => {
        (Object.keys(repetitions) as AxisPlace[]).forEach((place: AxisPlace) => {
          layout.getAxisMultiScale(place)?.setRepetitions(repetitions[place] ?? 0)
        })
      },
      { name: "useInitGraphLayout [repetitions]", fireImmediately: true, equals: comparer.structural },
      dataConfiguration
    )
  }, [layout, model])

  return layout
}
