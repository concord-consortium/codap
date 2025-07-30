import React from "react"
import { MenuItem, MenuList } from "@chakra-ui/react"
import { useCfmContext } from "../../../hooks/use-cfm-context"
import { useTileModelContext } from "../../../hooks/use-tile-model-context"
import { t } from "../../../utilities/translation/translate"
import { UnimplementedMenuItem } from "../../beta/unimplemented-menu-item"
import { isGraphContentModel } from "../models/graph-content-model"
import { graphSvg } from "../utilities/image-utils"

export const CameraMenuList = () => {
  const tile = useTileModelContext().tile
  const graphModel = isGraphContentModel(tile?.content) ? tile?.content : undefined
  const cfm = useCfmContext()

  const handleExportPNG = async () => {
    if (!graphModel?.renderState) return

    await graphModel.renderState.updateSnapshot()

    if (graphModel.renderState.dataUri) {
      const imageString = graphModel.renderState.dataUri.replace("data:image/png;base64,", "")
      cfm?.client.saveSecondaryFileAsDialog(imageString, "png", "image/png", () => null)
    } else {
      console.error("Error exporting PNG image.")
    }
  }

  const handleExportSVG = () => {
    if (!graphModel?.renderState) return

    const { imageOptions } = graphModel.renderState
    if (!imageOptions) return

    // TODO: The current strategy for turning a graph into an SVG involves wrapping the whole tile in a foreignObject,
    // which will not render in Word, Notes, etc.
    const svgString = graphSvg(imageOptions)

    if (svgString) {
      cfm?.client.saveSecondaryFileAsDialog(svgString, "svg", "text/plain", () => null)
    }
  }

  return (
    <MenuList data-testid="graph-camera-menu-list">
      {/* TODO: This is left in for reference when we're ready to implement background images.
      {hasBackgroundImage
        ? <>
            <UnimplementedMenuItem
              label={t("DG.DataDisplayMenu.addBackgroundImage")}
              testId="add-background-image-disabled"
            />
            {imageLocked
              ? <UnimplementedMenuItem
                  label={t("DG.DataDisplayMenu.unlockImageFromAxes")}
                  testId="unlock-image"
                />
              : <UnimplementedMenuItem
                  label={t("DG.DataDisplayMenu.lockImageToAxes")}
                  testId="lock-image"
                />
            }
          </>
        : <UnimplementedMenuItem
            label={t("DG.DataDisplayMenu.addBackgroundImage")}
            testId="add-background-image"
          />
      } */}
      <UnimplementedMenuItem
        label={t("DG.DataDisplayMenu.addBackgroundImage")}
        testId="add-background-image"
      />
      <UnimplementedMenuItem
        label={t("DG.DataDisplayMenu.copyAsImage")}
        testId="open-in-draw-tool"
      />
      <MenuItem data-testid="export-png-image" onClick={handleExportPNG}>
        {t("DG.DataDisplayMenu.exportPngImage")}
      </MenuItem>
      <MenuItem data-testid="export-svg-image" onClick={handleExportSVG}>
        {t("DG.DataDisplayMenu.exportSvgImage")}
      </MenuItem>
    </MenuList>
  )
}
