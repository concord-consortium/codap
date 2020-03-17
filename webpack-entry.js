/*global CodeMirror:true, React:true, ReactDOM:true, ReactDOMFactories:true, createReactClass:true */
/*global createReactFactory:true, createReactClassFactory:true, Popper:true, Tooltip:true, Papa:true */
/*global iframePhone:true, L:true, deepEqual:true, Promise:true, pluralize:true, dayjs:true, nanoid:true */
/* exported CodeMirror, React, ReactDOM, ReactDOMFactories, createReactClass, createReactFactory, createReactClassFactory */
/* exported Popper, Tooltip, iframePhone, Papa, deepEqual, Promise, pluralize, dayjs, nanoid */
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
// https://reactjs.org/blog/2020/02/26/react-v16.13.0.html#deprecating-reactcreatefactory
createReactFactory = function(type) { return React.createElement.bind(null, type); };
createReactClassFactory = function(classDef) { return createReactFactory(createReactClass(classDef)); };
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
