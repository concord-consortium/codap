import { Selection } from "d3"
import { MutableRefObject } from "react"
import { measureTextExtent } from "../../../hooks/use-measure-text"
import { otherPlace } from "../axis-types"
import { AxisHelper, IAxisHelperArgs } from "./axis-helper"
import { kAxisGap, kAxisTickLength, kDefaultFontHeight } from "../axis-constants"
import { isDateAxisModel, IDateAxisModel } from "../models/axis-model"
import { convertToDate, createDate, determineLevels, EDateTimeLevel, shortMonthNames }
  from "../../../utilities/date-utils"

type ILabelDateAndString = {
  labelDate: Date
  labelString: string
}

const getLevelLabelForValue = (level: EDateTimeLevel, date: Date | null): ILabelDateAndString => {
  let labelString = '',
    labelDate: Date = new Date()
  if (date) {
    const year = date.getFullYear(),
      month = date.getMonth()

    if (level === EDateTimeLevel.eYear) {
      labelString = String(year)
      labelDate = new Date(year, 1, 1)
    } else if (level === EDateTimeLevel.eMonth) {
      labelDate = new Date(year, month, 1)
      labelString = `${shortMonthNames[month]}, ${year}`
    } else {
      // From below here we'll need the date and its short label
      const day = date.getDate()
      let hour = 0,
        minute = 0,
        second = 0

      if (level < EDateTimeLevel.eDay) {
        hour = date.getHours()
        if (level < EDateTimeLevel.eHour) {
          minute = date.getMinutes()
          if (level < EDateTimeLevel.eMinute) {
            second = date.getSeconds()
          }
        }
      }
      labelDate = new Date(year, month, day, hour, minute, second)
      labelString = labelDate.toLocaleDateString()
    }
  }

  return {labelString, labelDate}
}

const findFirstDateAboveOrAtLevel = (level: number, date: Date, gap: number) => {
  let resultDate: Date = new Date(),
    labelString = '',
    year = date.getFullYear(),
    month = date.getMonth(),
    dayOfMonth = date.getDate(),
    hour = date.getHours(),
    minute = date.getMinutes(),
    second = date.getSeconds()
  switch (level) {
    case EDateTimeLevel.eYear:
      year = Math.ceil(year / gap) * gap
      resultDate = new Date(year, 0, 1)
      if (resultDate.valueOf() < date.valueOf()) {
        resultDate = new Date(++year, 0, 1)
      }
      labelString = String(year)
      break
    case EDateTimeLevel.eMonth:
      resultDate = new Date(year, month, 1)
      if (resultDate.valueOf() < date.valueOf()) {
        month++
        if (month > 12) {
          year++
          month = 1
        }
        resultDate = new Date(year, month, 1)
      }
      labelString = shortMonthNames[resultDate.getMonth()]
      break
    case EDateTimeLevel.eDay:
      resultDate = new Date(year, month, dayOfMonth)
      if (resultDate.valueOf() < date.valueOf()) {
        dayOfMonth++
        resultDate = new Date(year, month, dayOfMonth)
      }
      dayOfMonth = resultDate.getDate()
      labelString = String(dayOfMonth)
      break
    case EDateTimeLevel.eHour:
      resultDate = new Date(year, month, dayOfMonth, hour)
      if (resultDate.valueOf() < date.valueOf()) {
        hour++
        resultDate = new Date(year, month, dayOfMonth, hour)
      }
      hour = resultDate.getHours()
      labelString = `${hour}:00`
      break
    case EDateTimeLevel.eMinute:
      resultDate = new Date(year, month, dayOfMonth, hour, minute)
      if (resultDate.valueOf() < date.valueOf()) {
        resultDate = new Date(year, month, dayOfMonth, hour, ++minute)
      }
      minute = resultDate.getMinutes()
      labelString = String(minute)
      break
    case EDateTimeLevel.eSecond:
      resultDate = new Date(year, month, dayOfMonth, hour, minute, second)
      if (resultDate.valueOf() < date.valueOf()) {
        resultDate = new Date(year, month, dayOfMonth, hour, minute, second)
      }
      second = resultDate.getSeconds()
      labelString = String(second)
      break
    default:
  }

  return {labelString, labelDate: resultDate}
}

const getNextLevelLabelForValue = (level: EDateTimeLevel, date: Date | null) => {
  let tNextDate: Date = new Date()
  if (date) {
    let year = date.getFullYear(),
      month = date.getMonth(),
      dayOfMonth = date.getDate(),
      hour = date.getHours(),
      minute = date.getMinutes(),
      second = date.getSeconds()
    switch (level) {
      case EDateTimeLevel.eYear:
        year++
        break
      case EDateTimeLevel.eMonth:
        month++
        if (month > 12) {
          year++
          month = 1
        }
        break
      case EDateTimeLevel.eDay:
        dayOfMonth++
        break
      case EDateTimeLevel.eHour:
        hour++
        if (hour > 24) {
          dayOfMonth++
          hour = 0
        }
        break
      case EDateTimeLevel.eMinute:
        minute++
        if (minute > 60) {
          hour++
          minute = 0
        }
        break
      case EDateTimeLevel.eSecond:
        second++
        if (second > 60) {
          minute++
          second = 0
        }
        break
      default:
    }

    if (level <= EDateTimeLevel.eHour) { // It was either year or month level
      tNextDate = new Date(year, month, dayOfMonth, hour, minute, second)
    } else {
      tNextDate = new Date(year, month, dayOfMonth)
    }
  }

  return getLevelLabelForValue(level, tNextDate)
}

export interface IDateAxisHelperArgs extends IAxisHelperArgs {
  showScatterPlotGridLines: boolean
  subAxisSelectionRef: MutableRefObject<Selection<SVGGElement, any, any, any> | undefined>
}

export class DateAxisHelper extends AxisHelper {
  showScatterPlotGridLines: boolean
  subAxisSelectionRef: MutableRefObject<Selection<SVGGElement, any, any, any> | undefined>
  maxNumberExtent: number = kDefaultFontHeight

  constructor(props: IDateAxisHelperArgs) {
    super(props)
    this.showScatterPlotGridLines = props.showScatterPlotGridLines
    this.subAxisSelectionRef = props.subAxisSelectionRef
  }

  get newRange() {
    return this.isVertical ? [this.rangeMax, this.rangeMin] : [this.rangeMin, this.rangeMax]
  }

  render() {
    if (!this.subAxisSelectionRef.current || !isDateAxisModel(this.axisModel)) return

    const drawTicks = () => {

      const dataToCoordinate = (dataValue: number) => {
        const proportion = (dataValue - lowerBoundsSeconds) / (upperBoundsSeconds - lowerBoundsSeconds)
        return isVertical ? rangeMax - proportion * this.subAxisLength : rangeMin + proportion * this.subAxisLength
      }

      const getLabelForIncrementedDateAtLevel = (iLevel: number, iDate: Date, iIncrementBy: number) => {
        let tResultDate: Date = new Date(),
          tLabelString = ''
        let tYear = iDate.getFullYear(),
          tMonth = iDate.getMonth(),
          tDayOfMonth = iDate.getDate(),
          tHour = iDate.getHours(),
          tMinute = iDate.getMinutes(),
          tSecond = iDate.getSeconds(),
          tMinuteString, tSecondString
        switch (iLevel) {
          case EDateTimeLevel.eYear:
            tYear += iIncrementBy
            tResultDate = new Date(tYear, 0, 1)
            tLabelString = String(tYear)
            break
          case EDateTimeLevel.eMonth:
            tMonth += iIncrementBy
            while (tMonth > 12) {
              tYear++
              tMonth -= 12
            }
            tResultDate = new Date(tYear, tMonth, 1)
            tLabelString = shortMonthNames[tResultDate.getMonth()]
            break
          case EDateTimeLevel.eDay:
            tDayOfMonth += iIncrementBy
            tResultDate = new Date(tYear, tMonth, tDayOfMonth)
            tDayOfMonth = tResultDate.getDate()
            tLabelString = String(tDayOfMonth)
            break
          case EDateTimeLevel.eHour:
            tHour += iIncrementBy
            while (tHour > 24) {
              tDayOfMonth++
              tHour -= 24
            }
            tResultDate = new Date(tYear, tMonth, tDayOfMonth, tHour)
            tHour = tResultDate.getHours()
            tLabelString = `${tHour}:00`
            break
          case EDateTimeLevel.eMinute:
            tMinute += iIncrementBy
            tResultDate = new Date(tYear, tMonth, tDayOfMonth, tHour, tMinute)
            tMinute = tResultDate.getMinutes()
            tMinuteString = tMinute < 10 ? `0${tMinute}` : String(tMinute)
            tLabelString = `${tHour}:${tMinuteString}`
            break
          case EDateTimeLevel.eSecond:
            tSecond += iIncrementBy
            tResultDate = new Date(tYear, tMonth, tDayOfMonth, tHour, tMinute, tSecond)
            tSecond = tResultDate.getSeconds()
            tMinuteString = tMinute < 10 ? `0${tMinute}` : String(tMinute)
            tSecondString = tSecond < 10 ? `0${tSecond}` : String(tSecond)
            tLabelString = `${tHour}:${tMinuteString}:${tSecondString}`
            break
          default:
        }

        return {labelString: tLabelString, labelDate: tResultDate}
      }

      const forEachTickDo = (iDoF: (worldTickCoord: number, screenTickCoord: number) => void) => {
        let dateLabel = findFirstDateAboveOrAtLevel(levels.innerLevel, lowerBoundsDate, levels.increment),
          value: number
        while (dateLabel.labelDate < upperBoundsDate) {
          value = dateLabel.labelDate.valueOf()
          iDoF(value, dataToCoordinate(value / 1000))
          dateLabel = getLabelForIncrementedDateAtLevel(levels.innerLevel, dateLabel.labelDate,
            levels.increment)
        }
      }

      const dateAxisModel = this.axisModel as IDateAxisModel,
        lower = dateAxisModel.min,
        upper = dateAxisModel.max
      if (lower === upper) return

      const drawOuterLabels = (level: EDateTimeLevel) => {

        const drawOneOuterLabel = (iCoord: number, iRefPoint: { x: number, y: number }, iLabelString: string,
                                   iRotation: number, iAnchor: string) => {
          sAS.append('text')
            .attr('x', isVertical ? iRefPoint.x : iCoord)
            .attr('y', isVertical ? iCoord : iRefPoint.y)
            .attr('text-anchor', iAnchor)
            .attr('transform', `rotate(${iRotation}, ${isVertical ? iRefPoint.x + kDefaultFontHeight : iCoord}, 
                      ${isVertical ? iCoord : iRefPoint.y})`)
            .text(iLabelString)
        }

        const rotation = isVertical ? -90 : 0,
          offset = kAxisGap + kAxisTickLength + 2.5 * kDefaultFontHeight,
          refPoint = isVertical ? {x: -offset, y: 0} : {x: 0, y: offset}
        let thisLabel = getLevelLabelForValue(level, convertToDate(lower))
        const firstLabelString = thisLabel.labelString
        let done = false,
          somethingDrawn = false,
          coord: number
        while (!done) {
          const nextLabel = getNextLevelLabelForValue(level, thisLabel.labelDate)
          if (!nextLabel.labelDate) {
            done = true
          }
          if (thisLabel.labelDate > upperBoundsDate) {
            if (!somethingDrawn) {
              // This is the special case of one outer label spanning the whole axis
              coord = dataToCoordinate((lowerBoundsSeconds + upperBoundsSeconds) / 2)
              drawOneOuterLabel(coord, refPoint, firstLabelString, rotation, 'middle')
            }
            done = true  // Nothing more to do
          } else if (somethingDrawn || (nextLabel.labelDate < upperBoundsDate)) { // This is the normal case
            coord = dataToCoordinate(Math.max(thisLabel.labelDate.valueOf() / 1000, lowerBoundsSeconds))
            let oKToDraw = true
            if (thisLabel.labelDate < lowerBoundsDate) {
              // If drawing this label will overlap the next label, then don't draw it
              const textExtent = measureTextExtent(nextLabel.labelString),
                tNextCoord = dataToCoordinate(nextLabel.labelDate.valueOf() / 1000)
              if (textExtent.width > 7 * Math.abs(tNextCoord - coord) / 8) {
                oKToDraw = false
              }
            }
            if (oKToDraw) {
              drawOneOuterLabel(coord, refPoint, thisLabel.labelString, rotation, 'start')
            }
            somethingDrawn = true  // even if we really didn't
          }
          thisLabel = nextLabel
        }
      }

      const drawInnerLabels = (level: EDateTimeLevel, iIncrement: number) => {

        const findDrawValueModulus = (innerLevel: number, firstDateLabel: ILabelDateAndString) => {
          let interval = 1,
            foundWorkableInterval = false
          while (!foundWorkableInterval) {
            let date = firstDateLabel.labelDate,
              dateInSeconds = date.valueOf() / 1000,
              label = firstDateLabel.labelString,
              currentDateLabel = firstDateLabel,
              lastPixelUsed = Number.MAX_VALUE,
              firstTime = true,
              foundCollision = false
            while (!foundCollision && (dateInSeconds < upperBoundsSeconds)) {
              const pixel = dataToCoordinate(dateInSeconds),
                textExtent = measureTextExtent(label),
                halfWidth = 5 * textExtent.width / 8,  // Overestimation creates gap between labels
                overlapped = !isVertical ? pixel - halfWidth < lastPixelUsed : pixel + halfWidth > lastPixelUsed
              if (firstTime || !overlapped) {
                firstTime = false
                lastPixelUsed = pixel + (isVertical ? -halfWidth : halfWidth)
                currentDateLabel = getLabelForIncrementedDateAtLevel(innerLevel,
                  date, interval * iIncrement)
                date = currentDateLabel.labelDate
                dateInSeconds = date.valueOf() / 1000
                label = currentDateLabel.labelString
              } else {
                foundCollision = true
              }
            }
            if (foundCollision) {
              interval++
            } else {
              foundWorkableInterval = true
            }
          }
          return interval
        }

        const drawTickAndLabel = (iDateLabel: ILabelDateAndString, drawLabel: boolean) => {
          const refPoint = {x: 0, y: 0}
          let rotation = 0
          const pixel = dataToCoordinate(iDateLabel.labelDate.valueOf() / 1000)
          if (!isVertical) {
            refPoint.y = kAxisTickLength + kAxisGap + kDefaultFontHeight              // y-value
            refPoint.x = pixel
            sAS.append('line')
              .attr('style', 'stroke: black')
              .attr('x1', refPoint.x)
              .attr('x2', refPoint.x)
              .attr('y1', 0)
              .attr('y2', kAxisTickLength)
          } else {  // 'vertical'
            rotation = -90              // x-value
            refPoint.x = -kAxisTickLength - kAxisGap
            refPoint.y = pixel
            sAS.append('line')
              .attr('style', 'stroke: black')
              .attr('x1', 0)
              .attr('x2', -kAxisTickLength)
              .attr('y1', refPoint.y)
              .attr('y2', refPoint.y)
          }

          if (drawLabel) {
            sAS.append('text')
              .attr('x', refPoint.x)
              .attr('y', refPoint.y)
              .attr('text-anchor', 'middle')
              .attr('transform', `rotate(${rotation}, ${isVertical ? refPoint.x : refPoint.y},
                      ${isVertical ? refPoint.y : 0})`)
              .text(iDateLabel.labelString)
          }
        }

        let dateLabel = findFirstDateAboveOrAtLevel(level, lowerBoundsDate, iIncrement),
          tCounter = 0
        const drawValueModulus = findDrawValueModulus(level, dateLabel)

        // To get the right formatting we have to call as below. Use 0 as increment for first time through.
        dateLabel = getLabelForIncrementedDateAtLevel(level, dateLabel.labelDate, 0)

        while (dateLabel.labelDate < upperBoundsDate) {
          drawTickAndLabel(dateLabel, tCounter === 0)
          tCounter = (tCounter + 1) % drawValueModulus
          dateLabel = getLabelForIncrementedDateAtLevel(level, dateLabel.labelDate, iIncrement)
        }
      }

      const renderScatterPlotGridLines = () => {
        const gridLength = this.layout.getAxisLength(otherPlace(this.axisPlace)) ?? 0
        forEachTickDo((worldTickCoord, screenTickCoord) => {
          sAS.append('line')
            .attr('x1', isVertical ? 0 : screenTickCoord)
            .attr('x2', isVertical ? gridLength : screenTickCoord)
            .attr('y1', isVertical ? screenTickCoord : 0)
            .attr('y2', isVertical ? screenTickCoord : -gridLength)
            .style('stroke', 'lightgray')
        })
      }

      const levels = determineLevels(lowerBoundsMS, upperBoundsMS),
        numLevels = (levels.outerLevel !== levels.innerLevel) ? 2 : 1

      this.maxNumberExtent = numLevels * kDefaultFontHeight
      if (numLevels === 2) {
        drawOuterLabels(levels.outerLevel)
      }
      drawInnerLabels(levels.innerLevel, levels.increment)
      this.showScatterPlotGridLines && renderScatterPlotGridLines()
    }

    const isVertical = this.isVertical,
      [lowerBoundsSeconds, upperBoundsSeconds] = this.axisModel.domain,
      lowerBoundsMS = 1000 * lowerBoundsSeconds,
      lowerBoundsDate = createDate(lowerBoundsSeconds) as Date,
      upperBoundsMS = 1000 * upperBoundsSeconds,
      upperBoundsDate = createDate(upperBoundsSeconds) as Date,
      sAS = this.subAxisSelectionRef.current,
      {rangeMin, rangeMax} = this

    sAS.selectAll('*').remove()

    this.renderAxisLine()
    drawTicks()
  }
}
