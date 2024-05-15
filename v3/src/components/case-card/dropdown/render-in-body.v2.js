import { createRoot } from "react-dom/client"
import ReactDOMFactories from "react-dom-factories"
import { DG } from "../../../v2/dg-compat.v2"

DG.React.ready(function () {
  var
      div = ReactDOMFactories.div
  DG.React.Components.RenderInBody = DG.React.createComponent(
      (function () {
        return {

          componentDidMount () {
            this.popup = document.createElement("div")
            this.root = createRoot(this.popup)
            document.body.appendChild(this.popup)
            this._renderLayer()
          },


          componentDidUpdate () {
            this._renderLayer()
          },


          componentWillUnmount () {
            // ReactDOM.unmountComponentAtNode(this.popup)
            document.body.removeChild(this.popup)
          },


          _renderLayer () {
            this.root.render(this.props.children)
          },


          render () {
            return div({})
          }
        }
      }()), [])

})
