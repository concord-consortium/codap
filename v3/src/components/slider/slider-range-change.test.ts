import { ILogMessage } from "../../lib/log-message"
import { rangeChangeOptions } from "./slider-range-change"
import { setupSliderAndData } from "./slider-test-utils"

describe("rangeChangeOptions", () => {
  it("reports the committed range, not the values it was requested with", async () => {
    const { dataSet, slider, tile } = await setupSliderAndData()
    slider.configureFromAttribute(dataSet, dataSet.attrFromName("a3")!.id)
    const options = rangeChangeOptions(slider, tile)
    // a collapse requested at 4.6 commits the data value 5
    slider.applyModelChange(() => slider.setRange(4.6, 4.6), options)

    expect(options.undoStringKey).toBe("V3.Undo.slider.changeRange")
    const log = (options.log as () => ILogMessage)()
    expect(log.args).toMatchObject({ low: 5, high: 5 })
    // the component-level "change slider value" notification carries the committed low end
    const notifications = [options.notify].flat().map(notify => typeof notify === "function" ? notify() : notify)
    expect(JSON.stringify(notifications)).toContain('"to":5')
  })
})
