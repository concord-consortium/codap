/*global require:true, React:true, ReactDOM:true, Popper:true, Tooltip:true, Papa:true */
/*global iframePhone:true, L:true, deepEqual:true, Promise:true, pluralize:true, moment:true */
/* exported React, ReactDOM, Popper, Tooltip, iframePhone, Papa, deepEqual, Promise, pluralize, moment */
React = require('react');
ReactDOM = require('react-dom');
Popper = require('popper.js');
Tooltip = require('tooltip.js')['default'];
iframePhone = require('iframe-phone');
Papa = require('papaparse');
L = require('leaflet');
L.esri = require('esri-leaflet');
deepEqual = require('deep-equal');
Promise = require('es6-promise').Promise;
pluralize = require('pluralize');
moment = require('moment');
