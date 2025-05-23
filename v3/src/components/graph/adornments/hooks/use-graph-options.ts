import { useGraphContentModelContext } from "../../hooks/use-graph-content-model-context"
import { getDocumentContentPropertyFromNode } from "../../../../utilities/mst-utils"

export const useGraphOptions = () => {
  const graphModel = useGraphContentModelContext()
  const isGaussianFit = graphModel?.plotType === "histogram" &&
    getDocumentContentPropertyFromNode(graphModel, "gaussianFitEnabled")
  return {isGaussianFit}
}
