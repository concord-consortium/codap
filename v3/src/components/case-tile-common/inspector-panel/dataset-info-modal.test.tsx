import { render, screen } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { DataSetContext } from "../../../hooks/use-data-set-context"
import { DataSetMetadataContext } from "../../../hooks/use-data-set-metadata"
import { DataSet } from "../../../models/data/data-set"
import { DataSetMetadata } from "../../../models/shared/data-set-metadata"
import { t } from "../../../utilities/translation/translate"
import { DatasetInfoModal } from "./dataset-info-modal"

describe("DatasetInfoModal", () => {
  const setup = () => {
    const data = DataSet.create({ name: "data", _title: "Data" })
    const metadata = DataSetMetadata.create()
    metadata.setData(data)
    const changeSpy = jest.spyOn(data, "applyModelChange").mockImplementation((fn: () => unknown) => fn())
    const setShowInfoModal = jest.fn()
    render(
      <DataSetContext.Provider value={data}>
        <DataSetMetadataContext.Provider value={metadata}>
          <DatasetInfoModal showInfoModal={true} setShowInfoModal={setShowInfoModal} />
        </DataSetMetadataContext.Provider>
      </DataSetContext.Provider>
    )
    return { metadata, changeSpy, setShowInfoModal }
  }
  const apply = () => userEvent.click(screen.getByRole("button", { name: t("DG.AttrFormView.applyBtnTitle") }))

  it("closes without making a change when nothing was edited", async () => {
    const { changeSpy, setShowInfoModal } = setup()
    await apply()
    expect(setShowInfoModal).toHaveBeenCalledWith(false)
    expect(changeSpy).not.toHaveBeenCalled()
  })

  it("makes a change when something was edited", async () => {
    const { metadata, changeSpy, setShowInfoModal } = setup()
    await userEvent.type(screen.getByTestId("dataset-source-input"), "survey")
    await apply()
    expect(changeSpy).toHaveBeenCalledTimes(1)
    expect(setShowInfoModal).toHaveBeenCalledWith(false)
    expect(metadata.source).toBe("survey")
  })
})
