/* global _:true, CodeMirror:true, React:true, ReactDOM:true, ReactDOMFactories:true, PropTypes:true, createReactClass:true,
  createReactClassFactory:true, createReactFactory:true, createReactFC:true, ReactSizeMe: true, Popper:true, Tooltip:true,
  L:true, Promise:true, pluralize:true, dayjs:true, nanoid:true, RTree:true, SlateEditor:true */
/* exported _, CodeMirror, React, ReactDOM, ReactDOMFactories, PropTypes, createReactClass, createReactClassFactory, createReactFC,
  createReactFactory, ReactSizeMe, Popper, Tooltip, L, Promise, pluralize, dayjs, nanoid, RTree, SlateEditor */

var NativeDate = Date;
require('es5-shim');
// Our monkey-patch of valueOf() (cf. DG.DateUtilities.createDate) conflicts with ES5Shim's assumptions
// about the behavior of native Dates, so we replace ES5Shim's Date with the browser's original Date
// and figure we can live with whatever browser foibles we've been living with before now.
// eslint-disable-next-line no-implicit-globals, no-global-assign
Date = NativeDate;
require('es6-shim');
_ = require('lodash');
CodeMirror = require('codemirror/lib/codemirror.js');
require('codemirror/lib/codemirror.css');
require('codemirror/addon/display/placeholder.js');
require('codemirror/addon/hint/show-hint.js');
require('codemirror/addon/hint/show-hint.css');
require('codemirror/addon/mode/simple.js');
React = require('react');
ReactDOM = require('react-dom');
ReactDOMFactories = require('react-dom-factories');
// https://reactjs.org/docs/react-without-es6.html
createReactClass = require('create-react-class');
// https://reactjs.org/docs/typechecking-with-proptypes.html
PropTypes = require('prop-types');
// https://reactjs.org/blog/2020/02/26/react-v16.13.0.html#deprecating-reactcreatefactory
createReactFactory = function(type) { return React.createElement.bind(null, type); };
createReactClassFactory = function(classDef) { return createReactFactory(createReactClass(classDef)); };
// creates a functional component (FC) with optional properties like displayName and propTypes
createReactFC = function(optsOrFn, maybeFn) {
  var fn = maybeFn || optsOrFn;
  if (optsOrFn && (typeof maybeFn === "function")) {
    for (var p in optsOrFn) {
      optsOrFn.hasOwnProperty(p) && (fn[p] = optsOrFn[p]);
    }
  }
  return createReactFactory(fn);
};
ReactSizeMe = require('react-sizeme');
Popper = require('popper.js');
Tooltip = require('tooltip.js')['default'];
/*
iframePhone = require('iframe-phone');
*/
L = require('leaflet');
L.esri = require('esri-leaflet');
pluralize = require('pluralize');
dayjs  = require('dayjs');
nanoid = require('nanoid');
RTree = require('rtree');
SlateEditor = require('@concord-consortium/slate-editor');
require('@concord-consortium/slate-editor/build/index.css');
RandVarGen = require('random-variate-generators');