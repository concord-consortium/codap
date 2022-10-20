import React, {memo, useEffect, useRef} from "react"
import {useDataConfigurationContext} from "../../hooks/use-data-configuration-context"
import {range, select} from "d3"

interface ICategoricalLegendProps {
  legendAttrID: string
}

/*
interface Key {
  category: string
  color: string
  index: number
  column: number,
  row: number
}
*/

const keySize = 10

export const CategoricalLegend = memo(function CategoricalLegend({legendAttrID}: ICategoricalLegendProps) {
  const keysRef = useRef<SVGSVGElement>(null),
    dataConfiguration = useDataConfigurationContext(),
    categories = dataConfiguration?.categorySetForPlace('legend'),
    numCategories = categories?.size,
    categoryData = categories && Array.from(categories).map((cat: string, index) => {
      return {
        category: cat,
        color: dataConfiguration?.getLegendColorForCase(cat),
        index,
        column: Math.floor(index / 2),
        row: index % 2
      }
    }),
    keyFunc = (index: number) => index

  useEffect(function setup() {
    if (keysRef.current && categoryData) {
      select(keysRef.current).selectAll('.key')
        .data(range(0, numCategories ?? 0), keyFunc)
        .join(
          // @ts-expect-error void => Selection
          (enter) => {
            enter.append('rect')
              .attr('class', 'key')
              .attr('width', keySize)
              .attr('height', keySize)
              .attr('fill', index => categoryData[index].color || 'white')
          },
          (update) => {
            update
              .attr('x', (index) => {
                const x = categoryData[index].column * 50
                console.log(`[${index}]: x = ${x}`)
                return x
              })
              .attr('y', index => categoryData[index].row * 15)
          }
        )
    }
  }, [keysRef, categoryData, numCategories])

  return (
    <svg className='categories' ref={keysRef}></svg>
  )
})
CategoricalLegend.displayName = "CategoricalLegend"
