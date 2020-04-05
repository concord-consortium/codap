/* global CodeMirror:true, React:true, ReactDOM:true, ReactDOMFactories:true, PropTypes:true, createReactClass:true,
  createReactFactory:true, createReactFC:true, createReactClassFactory:true, ReactSizeMe: true, Popper:true, Tooltip:true,
  Papa:true, L:true, deepEqual:true, Promise:true, pluralize:true, dayjs:true, nanoid:true */
/* exported CodeMirror, React, ReactDOM, ReactDOMFactories, PropTypes, createReactClass, createReactFactory, createReactFC,
  createReactClassFactory, ReactSizeMe, Popper, Tooltip, Papa, L, deepEqual, Promise, pluralize, dayjs, nanoid */
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
Papa = require('papaparse');
L = require('leaflet');
L.esri = require('esri-leaflet');
deepEqual = require('deep-equal');
Promise = require('es6-promise').Promise;
pluralize = require('pluralize');
dayjs  = require('dayjs');
nanoid = require('nanoid');
