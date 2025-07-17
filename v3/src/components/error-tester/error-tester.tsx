import React from "react"
import { ITileBaseProps } from "../tiles/tile-base-props"
import { isErrorTesterModel } from "./error-tester-model"
import { urlParams } from "../../utilities/url-params"

/**
 * This component is used to test error handling.
 * It throws an error when rendered if the `errorTester` URL parameter is set to "render".
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

  const handleClick = () => {
    throw new Error("Error Tester Component: example error on click")
  }

  return (
    <div className="error-tester" onClick={handleClick}>
      Error Tester Component. Click me to throw an error.
    </div>
  )
}
