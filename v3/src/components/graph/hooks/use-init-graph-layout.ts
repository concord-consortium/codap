import { reaction } from "mobx"
import { useEffect } from "react"
import { useMemo } from "use-memo-one"
import { AxisPlace } from "../../axis/axis-types"
import { GraphLayout } from "../models/graph-layout"
import { IGraphModel } from "../models/graph-model"

export function useInitGraphLayout(model?: IGraphModel) {
  const layout = useMemo(() => new GraphLayout(), [])

  useEffect(() => {
    // synchronize the number of repetitions from the DataConfiguration to the layout's MultiScales
    return reaction(
      () => {
        const repetitions: Partial<Record<AxisPlace, number>> = {}
        layout.axisScales.forEach((multiScale, place) => {
          repetitions[place] = model?.config.numRepetitionsForPlace(place) ?? 1
        })
        return repetitions
      },
      (repetitions) => {
        (Object.keys(repetitions) as AxisPlace[]).forEach((place: AxisPlace) => {
          layout.getAxisMultiScale(place)?.setRepetitions(repetitions[place] ?? 0)
        })
      }
    )
  }, [layout, model?.config])

  return layout
}
