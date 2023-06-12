import {observer} from "mobx-react-lite"
import React, {/*useEffect,*/ useRef} from "react"
// import {reaction} from "mobx"
// import {drag, ScaleBand, ScaleContinuousNumeric, select, Selection} from "d3"
// import t from "../../../utilities/translation/translate"
// import {RectIndices, selectDragRects} from "../axis-types"
// import {useAxisLayoutContext} from "../models/axis-layout-context"
// import {ICategoricalAxisModel, /*INumericAxisModel*/} from "../models/axis-model"
// import {isVertical} from "../../axis-graph-shared"
// import {MultiScale} from "../models/multi-scale"
// import {ICategorySet} from "../../../models/data/category-set"

import "./axis.scss"

/*
interface IProps {
  axisModel: ICategoricalAxisModel
  axisWrapperElt: SVGGElement | null
  numSubAxes?: number
  subAxisIndex?: number
  getCategorySet?: () => ICategorySet | undefined  // only used for categorical axes
}
*/

// type D3Handler = (this: Element, event: any, d: any) => void

// const dragCategoryHint = t("DG.CellAxis.dragCategory")

export const CategoricalAxisDragRects = observer(
  function CategoricalAxisDragRects(/*{axisModel, axisWrapperElt, numSubAxes = 1, subAxisIndex = 0,
                                    getCategorySet}: IProps*/) {
    const rectRef = useRef() as React.RefObject<SVGGElement>
/*
      place = axisModel.place,
      layout = useAxisLayoutContext(),
      categorySet = getCategorySet && getCategorySet(),
      categories = categorySet?.values ?? []

    useEffect(function createRects() {
      let multiScale: MultiScale | undefined,
        d3Scale: ScaleBand<string>,
        d3ScaleAtStart: ScaleBand<string>,
        dragging = false

      const onDragStart: D3Handler = function() {
          const subAxisLength = layout.getAxisLength(place) / numSubAxes,
            rangeMin = subAxisIndex * subAxisLength,
            rangeMax = (subAxisIndex + 1) * subAxisLength,
            range = isVertical(place) ? [rangeMax, rangeMin] : [rangeMin, rangeMax]
          multiScale = layout.getAxisMultiScale(place)
          d3Scale = (multiScale?.scale as ScaleBand<string>).copy()
            .range(range)
          d3ScaleAtStart = d3Scale.copy()
          select(this)
            .classed('dragging', true)
          axisModel.setTransitionDuration(0)
        },

        onDrag: D3Handler = function(event: { x: number, y: number }) {
          select(this)
            .classed('dragging', true)
          multiScale = layout.getAxisMultiScale(place)
          d3Scale = multiScale?.scale as ScaleBand<string>
          d3ScaleAtStart = d3Scale.copy()
          dragging = true
        },

        onDragEnd: D3Handler = function() {
          select(this)
            .classed('dragging', false)
          dragging = false
        }

      if (rectRef.current) {
        // Add rects which the user can drag to change the order of categories
        const
          classPrefix = place === 'bottom' ? 'h' : 'v'

        selectDragRects(rectRef.current)
          ?.data(categories)
          .join(
            (enter) =>
              enter.append('rect')
                .attr('class', (d) => `dragRect`)
                .append('title')
                .text(dragCategoryHint)
          )
      }
    }, [axisModel, place, layout, numSubAxes, subAxisIndex])

    // update layout of axis drag rects when axis bounds change
    useEffect(() => {
      const disposer = reaction(
        () => {
          return layout.getComputedBounds(place)
        },
        (axisBounds) => {
          const
            length = layout.getAxisLength(place) / numSubAxes,
            start = subAxisIndex * length,
            numbering = place === 'bottom' ? [0, 1, 2] : [2, 1, 0]
          if (length != null && axisBounds != null) {
            selectDragRects(rectRef.current)
              ?.data(numbering)// data signify lower, middle, upper rectangles
              .join(
                enter => enter,
                (update) =>
                  update
                    .attr('x', (d) => axisBounds.left + (place === 'bottom'
                      ? (start + d * length / 3) : 0))
                    .attr('y', (d) => axisBounds.top + (place === 'bottom'
                      ? 0 : (start + d * length / 3)))
                    .attr('width', () => (place === 'bottom' ? length / 3 : axisBounds.width))
                    .attr('height', () => (place === 'bottom' ? axisBounds.height : length / 3))
              )
            selectDragRects(rectRef.current)?.raise()
          }
        }, {fireImmediately: true}
      )
      return () => disposer()
    }, [axisModel, layout, axisWrapperElt, place, numSubAxes, subAxisIndex])
*/
    return (
      <g className={'dragRectWrapper'} ref={rectRef}/>
    )
  })
