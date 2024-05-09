import React from "react"
import * as ReactDOM from "react-dom"
// https://reactjs.org/docs/react-without-es6.html
import createReactClass from "create-react-class"
// https://reactjs.org/blog/2020/02/26/react-v16.13.0.html#deprecating-reactcreatefactory
export const createReactFactory = function(type) { return React.createElement.bind(null, type) }
export const createReactClassFactory = function(classDef) { return createReactFactory(createReactClass(classDef)) }

import { DGAttribute } from "../models/v2/dg-attribute"
import { DGCase } from "../models/v2/dg-case"
import { DGDataContext } from "../models/v2/dg-data-context"
import { DGMainPage } from "./dg-main-page"
import { parseColor } from "../utilities/color-utils"
import { isFiniteNumber } from "../utilities/math-utils"

/*
// https://reactjs.org/docs/typechecking-with-proptypes.html
PropTypes = require('prop-types');
*/

// creates a functional component (FC) with optional properties like displayName and propTypes
export const createReactFC = function(optsOrFn, maybeFn) {
  var fn = maybeFn || optsOrFn
  if (optsOrFn && (typeof maybeFn === "function")) {
    for (var p in optsOrFn) {
      optsOrFn.hasOwnProperty(p) && (fn[p] = optsOrFn[p])
    }
  }
  return createReactFactory(fn)
}

// this would be defined once in CODAP
export const DG = {
  Attribute: DGAttribute,
  Case: DGCase,
  Core: {
    setClickHandlingForReact() {}
  },
  DataContext: DGDataContext,
  DataUtilities: {
    canonicalizeInputValue(value) {
      // canonicalize null, undefined, and "undefined"
      if ((value == null) || (value === "undefined")) return ""
      if (typeof iValue !== 'string') return value
      return value.trim()
    }
  },
  globalEditorLock: {
    commitCurrentEdit() {}
  },
  mainPage: new DGMainPage(),
  React: {
    createClass (def, highOrderComponentList) {
      var finalClass = createReactClass(def)
      if (highOrderComponentList) {
        highOrderComponentList.forEach(function (highOrderComponent) {
          finalClass = highOrderComponent(finalClass)
        })
      }
      return finalClass
    },

    createComponent (def, highOrderComponentList) {
      return createReactFactory(DG.React.createClass(def, highOrderComponentList))
    },

    // toggles the component to render in the container node
    toggleRender (containerNode, component) {
      if (containerNode.children.length > 0) {
        ReactDOM.unmountComponentAtNode(containerNode)
      }
      else if (component) {
        ReactDOM.render(component, containerNode)
      }
    },

    // wait for React to become available when the CFM loads
    ready(callback) {
      callback()
    },

    Components: {}
  },
  TouchTooltips: {
    hideAllTouchTooltips() {
    }
  },

  isColorSpecString(str) {
    return !!parseColor(str)
  },

  isNumeric(value) {
    return isFiniteNumber(value)
  }

}

/*
DG.React.SlateContainer = createReactFactory(SlateEditor.SlateContainer)
DG.React.SlateEditor = createReactFactory(SlateEditor.SlateEditor)
DG.React.SlateToolbar = createReactFactory(SlateEditor.SlateToolbar)

// these augment custom components with common behaviors
DG.React.HighOrderComponents = {
  _render (componentInstance, childComponentClass, highOrderProps) {
    var props = { ...componentInstance.props, ...componentInstance.state, ...(highOrderProps || {})}
    return createReactFactory(childComponentClass)(props)
  },

  UnmountOnOutsideClick (childComponentClass) {
    return createReactClass({
      componentDidMount () {
        window.addEventListener('mousedown', this.checkForToggle, true)
        window.addEventListener('touchstart', this.checkForToggle, true)
      },

      componentWillUnmount () {
        window.removeEventListener('mousedown', this.checkForToggle, true)
        window.removeEventListener('touchstart', this.checkForToggle, true)
      },

      checkForToggle (e) {
        // eslint-disable-next-line react/no-find-dom-node
        var containerNode = ReactDOM.findDOMNode(this).parentNode,
            clickedNode = e.target

        // check if clicked node is within the rendered child container
        while (clickedNode && (clickedNode !== containerNode)) {
          clickedNode = clickedNode.parentNode
        }

        // the clicked node was outside the child container so unmount it
        if (!clickedNode) {
          this.unmount()
          e.preventDefault()
          e.stopPropagation()
        }
      },

      unmount () {
        // eslint-disable-next-line react/no-find-dom-node
        DG.React.toggleRender(ReactDOM.findDOMNode(this).parentNode)
      },

      render () {
        return DG.React.HighOrderComponents._render(this, childComponentClass, {unmount: this.unmount})
      }
    })
  },

  UnmountOnEscapeKey (childComponentClass) {
    return createReactClass({
      componentDidMount () {
        window.addEventListener('keydown', this.checkForEscape, true)
      },

      componentWillUnmount () {
        window.removeEventListener('keydown', this.checkForEscape, true)
      },

      checkForEscape (e) {
        if (e.keyCode === 27) {
          this.unmount()
          e.preventDefault()
          e.stopPropagation()
        }
      },

      unmount () {
        // eslint-disable-next-line react/no-find-dom-node
        DG.React.toggleRender(ReactDOM.findDOMNode(this).parentNode)
      },

      render () {
        return DG.React.HighOrderComponents._render(this, childComponentClass, {unmount: this.unmount})
      }
    })
  }
}

DG.React.Components = {}
*/
