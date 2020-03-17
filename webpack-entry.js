/*global CodeMirror: true, React:true, ReactDOM:true, ReactDOMFactories: true, Popper:true, Tooltip:true, Papa:true */
/*global iframePhone:true, L:true, deepEqual:true, Promise:true, pluralize:true, dayjs:true, nanoid:true */
/* exported CodeMirror, React, ReactDOM, ReactDOMFactories, Popper, Tooltip, iframePhone, Papa, deepEqual, Promise, pluralize, dayjs, nanoid */
CodeMirror = require('codemirror/lib/codemirror.js');
require('codemirror/lib/codemirror.css');
require('codemirror/addon/display/placeholder.js');
require('codemirror/addon/hint/show-hint.js');
require('codemirror/addon/hint/show-hint.css');
require('codemirror/addon/mode/simple.js');
React = require('react');
ReactDOM = require('react-dom');
ReactDOMFactories = require('react-dom-factories');
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
