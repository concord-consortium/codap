import { ITileBaseProps } from "../tiles/tile-base-props"
import { isErrorTesterModel } from "./error-tester-model"
import { urlParams } from "../../utilities/url-params"
import { isDevelopment } from "../../utilities/environment-utils"

let renderCount = 0

// See react-render-errors.md on why this component throws multiple errors depending on
// the environment.
const numErrorsThrownOnFirstDisplay = isDevelopment() ? 4 : 2

/**
 * This component is used to test error handling.
 * If the URL has `errorTester=render`, it throws an error every time when rendered
 * If the URL has `errorTester=firstDisplay` it throws a fixed number of errors to test
 * the behavior of the error boundary.
 * It throws an error when clicked.
 * It can also be used to test what happens when a tile is loaded that isn't registered:
 * - set the `errorTester` URL parameter to "none" so the errorTester can be added to the document
 * - save the document
 * - remove the `errorTester` URL parameter
 * - load the saved document
 *
 * @param param0
 * @returns
 */
export const ErrorTesterComponent = ({ tile }: ITileBaseProps) => {
  const errorModel = tile?.content
  if (!isErrorTesterModel(errorModel)) return null

  if (urlParams.errorTester === "render") {
    throw new Error("Error Tester Component: example error on render")
  }

  renderCount++
  if (urlParams.errorTester === "firstDisplay" && renderCount <= numErrorsThrownOnFirstDisplay) {
    throw new Error(`Error Tester Component: example error on first render ${renderCount}`)
  }

  const handleClick = () => {
    throw new Error("Error Tester Component: example error on click")
  }

  return (
    <div className="error-tester" onClick={handleClick}>
      Error Tester Component. Click me to throw an error.
    </div>
  )
}
