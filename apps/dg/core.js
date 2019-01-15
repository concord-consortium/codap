// ==========================================================================
//                                DG
//
//  DG is the namespace for all of the CODAP(formerly Data Games) JavaScript code.
//
//  Copyright (c) 2014 by The Concord Consortium, Inc. All rights reserved.
//
//  Licensed under the Apache License, Version 2.0 (the "License");
//  you may not use this file except in compliance with the License.
//  You may obtain a copy of the License at
//
//    http://www.apache.org/licenses/LICENSE-2.0
//
//  Unless required by applicable law or agreed to in writing, software
//  distributed under the License is distributed on an "AS IS" BASIS,
//  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//  See the License for the specific language governing permissions and
//  limitations under the License.
// ==========================================================================
/*jslint newcap:true */
/*global DG:true */

/**
 *  Returns an array of all own enumerable properties found upon a given object,
 *  in the same order as that provided by a for-in loop (the difference being that
 *  a for-in loop enumerates properties in the prototype chain as well).
 *  New in JavaScript 1.8.5 (Safari 5, Firefox 4, etc.).
 *  Compatibility implementation from the Mozilla Developer Network at
 *  https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/Object/keys.
 */
if (!Object.keys) Object.keys = function (o) {
  var ret = [], p;
  for (p in o) if (Object.prototype.hasOwnProperty.call(o, p)) ret.push(p);
  return ret;
};

// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/findIndex
// https://tc39.github.io/ecma262/#sec-array.prototype.findIndex
if (!Array.prototype.findIndex) {
  Object.defineProperty(Array.prototype, 'findIndex', {
    value: function(predicate) {
      // 1. Let O be ? ToObject(this value).
      if (this == null) {
        throw new TypeError('"this" is null or not defined');
      }

      var o = Object(this);

      // 2. Let len be ? ToLength(? Get(O, "length")).
      /*jshint bitwise:false */ // allow bitwise operations
      var len = o.length >>> 0; // eslint-disable-line no-bitwise

      // 3. If IsCallable(predicate) is false, throw a TypeError exception.
      if (typeof predicate !== 'function') {
        throw new TypeError('predicate must be a function');
      }

      // 4. If thisArg was supplied, let T be thisArg; else let T be undefined.
      var thisArg = arguments[1];

      // 5. Let k be 0.
      var k = 0;

      // 6. Repeat, while k < len
      while (k < len) {
        // a. Let Pk be ! ToString(k).
        // b. Let kValue be ? Get(O, Pk).
        // c. Let testResult be ToBoolean(? Call(predicate, T, « kValue, k, O »)).
        // d. If testResult is true, return k.
        var kValue = o[k];
        if (predicate.call(thisArg, kValue, k, o)) {
          return k;
        }
        // e. Increase k by 1.
        k++;
      }

      // 7. Return -1.
      return -1;
    }
  });
}

/*
 Function.prototype.bind is a method introduced in ECMAScript 262-5 which allows
 changes to the running context of a function  (i.e. the 'this' variable)

 This extension provides .bind functionality in browsers (ex. Safari) which haven't
 yet implemented it, and should be a close enough approximation to function in any
 current browser.

 Sourced from:
 https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/Function/bind
 and assumed to be freely distributable

 */

if (!Function.prototype.bind) {
  /* eslint new-cap:off */
  Function.prototype.bind = function (oThis) {
    if (typeof this !== "function") {
      // closest thing possible to the ECMAScript 5 internal IsCallable function
      throw new TypeError("Function.prototype.bind - what is trying to be bound is not callable");
    }

    var fSlice = Array.prototype.slice,
      aArgs = fSlice.call(arguments, 1),
      fToBind = this,
      fNOP = function () {
      },
      fBound = function () {
        return fToBind.apply(this instanceof fNOP
            ? this
            : oThis || window,
          aArgs.concat(fSlice.call(arguments)));
      };

    fNOP.prototype = this.prototype;
    fBound.prototype = new fNOP();

    return fBound;
  };
}

/**
 Trim whitespace from ends of string.
 Polyfill adopted from
 https://developer.mozilla.org/en-US/docs/JavaScript/Reference/Global_Objects/String/Trim
 */
if (!String.prototype.trim) {
  String.prototype.trim = function () {
    return this.replace(/^\s+|\s+$/g, '');
  };
}

// polyfill for object.assign (not supported by ie11)
// polyfill from https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/assign
/*eslint-disable */
/* jshint ignore:start*/
if (typeof Object.assign != 'function') {
  // Must be writable: true, enumerable: false, configurable: true
  Object.defineProperty(Object, "assign", {
    value: function assign(target, varArgs) { // .length of function is 2
      'use strict';
      if (target == null) { // TypeError if undefined or null
        throw new TypeError('Cannot convert undefined or null to object');
      }

      var to = Object(target);

      for (var index = 1; index < arguments.length; index++) {
        var nextSource = arguments[index];

        if (nextSource != null) { // Skip over if undefined or null
          for (var nextKey in nextSource) {
            // Avoid bugs when hasOwnProperty is shadowed
            if (Object.prototype.hasOwnProperty.call(nextSource, nextKey)) {
              to[nextKey] = nextSource[nextKey];
            }
          }
        }
      }
      return to;
    },
    writable: true,
    configurable: true
  });
}
/* jshint ignore:end*/
/*eslint-enable */
/*  According to Erich Ocean, apps should always ignore unknown properties on records.
 Here's the meaning of this from the code:

 Whether to ignore unknown properties when they are being set on the record
 object. This is useful if you want to strictly enforce the model schema
 and not allow dynamically expanding it by setting new unknown properties
 */
SC.Record.ignoreUnknownProperties = true;

/*  The QUERY_MATCHING_THRESHOLD is used to by SC.RecordArray.flush() to break up
 large updates into smaller packets of work. Unfortunately, when this occurs
 our notifications do not go out as expected and we end up only processing
 some of the data. This was seen as not all of the cases showing up when
 opening up a large document on the iPad, for instance. As a short-term
 quick-fix, we simply up the threshold from 100msec to 10sec. Eventually,
 a proper fix should be found which allows us to detect when this has
 occurred and to process the cases as they become available. Here's the
 description of the QUERY_MATCHING_THRESHOLD in the SproutCore code:

 Number of milliseconds to allow a query matching to run for. If this number
 is exceeded, the query matching will be paced so as to not lock up the
 browser (by essentially splitting the work with a setTimeout)
 */
SC.RecordArray.QUERY_MATCHING_THRESHOLD = 10000;

/** @namespace

 A web app prototype for the DataGames project.

 @extends SC.Object
 */
DG = SC.Application.create((function () // closure
/** @scope DG.prototype */ {

  var theStore = null;

  // Utility function for extracting URL parameters
  var getUrlParameter = function (iParam, iDefault) {
    iParam = iParam.replace(/[\[]/, "\\[").replace(/[\]]/, "\\]");
    iDefault = iDefault || '';
    var regexS = "[\\?&]" + iParam + "=([^&]*)";
    var regex = new RegExp(regexS);
    var results = regex.exec(window.location.search);
    var encoded;
    if (SC.none(results)) {
      return iDefault;
    } else {
      encoded = results[1].replace(/[+]/g, '%20');
      return decodeURIComponent(encoded);
    }
  };

  var isDGBuild = function () {
    var appParam = getUrlParameter('app');
    return !SC.empty(appParam) ? appParam === 'dg'
      : window.location.href.indexOf('/dg') >= 0;
  };

  var isInquirySpaceBuild = function () {
    var appParam = getUrlParameter('app');
    return !SC.empty(appParam) ? appParam === 'is'
      : window.location.href.indexOf('/is') >= 0;
  };

  var isSrriBuild = function () {
    var appParam = getUrlParameter('app');
    return !SC.empty(appParam) ? appParam === 'srri'
      : window.location.href.indexOf('srri') >= 0;
  };

  var isDevBuild = function () {
    return (window.location.href.indexOf('-dev.codap.concord.org') >= 0) ||
      (window.location.href.indexOf('localhost:4020') >= 0);
  };

  var noDataTipPref = function () {
    var noDtParam = getUrlParameter('no_dt');
    return !SC.empty(noDtParam) && noDtParam === 'true';
  };

  var useStandaloneMode = function () {
    var standaloneParam = getUrlParameter('standalone');
    return !SC.empty(standaloneParam) && standaloneParam !== 'false';
  };

  var keepInBoundsPref = function () {
    var keepInBoundsParam = getUrlParameter('inbounds');
    return !SC.empty(keepInBoundsParam) && keepInBoundsParam === 'true';
  };

  return Object.assign({ // return from closure

    NAMESPACE: 'DG',
    APPNAME: 'DG',
    USER_APPNAME: 'CODAP',

    /*
     * Semantic version number
     */
    VERSION: '2.0',

    /*
     * Build number
     */
    BUILD_NUM: '0472',

    IS_DG_BUILD: isDGBuild.property(),

    IS_INQUIRY_SPACE_BUILD: isInquirySpaceBuild.property(),

    IS_SRRI_BUILD: isSrriBuild.property(),

    exampleListBaseURL: '//codap.concord.org/resources/latest/example-documents',

    exampleListURL: function () {
      return '%@1/index.json.%@2'.loc(this.get('exampleListBaseURL'), SC.Locale.currentLanguage);
    }.property(),

    showHelpURL: 'https://codap.concord.org/help',

    showWebSiteURL: 'https://codap.concord.org',

    splashURL: static_url('images/codap-splash-screen.png'),

    /* This is the developer client id. Provides access to an unverified
     * version of the app. Should be overridden for end users */
    googleDriveClientID: '891260722961-81f8ic8tddobbh66p1j7nenr42hb93u1.apps.googleusercontent.com',

    /**
     * URL for a plugin data store.
     */
    pluginURL: function () {
      return getUrlParameter('pluginURL') ||
          '//codap.concord.org/plugins/releases/latest';
    }.property(),

    /**
     * URL for metadata describing the contents of the plugin data store.
     * This is a JSON document consisting of an array of plugin descriptions
     * like the following:
     *      * [
     *  {
     *    "title": "Sampler",
     *    "description": "Has a mixer, a spinner, and a collector for sampling simulation. Modeled on TinkerPlots Sampler and created for the <a target=\"_blank\" href=\"http://hirise.fi.ncsu.edu/projects/esteem/\">ESTEEM</a> project at NCSU.",
     *    "width": 450,
     *    "height": 200,
     *    "path": "/TP-Sampler/index.html",
     *    "visible": true,
     *    "categories": [
     *      "Partners",
     *      "Utilities"
     *    ]
     *  }
     * ]
     */
    pluginMetadataURL: function () {
      return this.get('pluginURL') + '/published-plugins.json';
    }.property(),

    /**
     * plugin metadata: information about published plugins.
    */
    pluginMetadata: null,

    drawToolPluginURL: function() {
      return this.get('pluginURL') + '/DrawTool';
    }.property(),

    /*
     * Logging is enabled when server matches this DNS name.
     */
    logFromServer: 'codap.concord.org',

    defaultLogServerLoginURL: 'http://cc-log-manager.herokuapp.com/api/logs',

    defaultLogServerLoginURLSecure: 'https://cc-log-manager.herokuapp.com/api/logs',

    getQueryParam: function(iParam, iDefault) {
      return getUrlParameter(iParam, iDefault);
    },

    removeQueryParams: function(iParams) {
      var queryParams = window.location.search,
          paramsToRemove = Array.isArray(iParams) ? iParams : [iParams];
      paramsToRemove.forEach(function(iParam) {
        iParam = iParam.replace(/[\[]/, "\\[").replace(/[\]]/, "\\]");
        // match the leading delimiter along with the query parameter
        var regexS = "[\\?&]" + iParam + "=([^&]*)",
            regex = new RegExp(regexS),
            result = regex.exec(queryParams),
            match = result && result[0],
            matchIndex = result && result.index,
            matchLength = match && match.length,
            isFirstParam = matchIndex === 0,
            isLastParam = matchIndex + matchLength >= queryParams.length;

        // leave the initial question mark if there are more parameters
        if (isFirstParam && !isLastParam)
          match = match.substr(1) + '&';
        if (match)
          queryParams = queryParams.replace(match, '');
      });
      if ((queryParams !== window.location.search) && window.history.replaceState) {
        var newUrl = window.location.protocol + '//' + window.location.host +
                      window.location.pathname + queryParams + window.location.hash;
        window.history.replaceState(null, null, newUrl);
      }
    },

    /**
     * Modify the given string key (usually in strings.js), and return the associated variant of the
     * key if this is an SRRI build (also expected to be in in strings.js).
     * @param iKey
     * @return {String}
     */
    getVariantString: function (iKey) {
      var key = iKey;
      if (DG.get('IS_INQUIRY_SPACE_BUILD')) {
        key += '.IS_BUILD';
      }
      else if (DG.get('IS_SRRI_BUILD')) {
        key += '.SRRI_BUILD';
      }
      return key;
    },

    IS_DEV_BUILD: isDevBuild(),

    NO_DATA_TIP_PREF: noDataTipPref(),

    KEEP_IN_BOUNDS_PREF: keepInBoundsPref(),

    STANDALONE_MODE: useStandaloneMode(),
    STANDALONE_PLUGIN: getUrlParameter('standalone'),
    isStandaloneComponent: function (iComponentName, iComponentType) {
      return (DG.STANDALONE_MODE
          && (iComponentType === 'DG.GameView')
          && (DG.STANDALONE_PLUGIN === 'true' || (iComponentName === DG.STANDALONE_PLUGIN))
      );
    },

    // This is your application store.  You will use this store to access all
    // of your model data.  You can also set a data source on this store to
    // connect to a backend server.
    appStore: theStore,

    // The current document store. Clients that refer to DG.store are implicitly
    // referring to the store that corresponds to the current document.
    store: null,

    urlParamGames: getUrlParameter('moreGames'),

    startingDocUrl: getUrlParameter('url'),

    /**
     * startingDataInteractive can be passed as a Url parameter named 'di'
     * Expects the URL of an executable page. For now, it will only have
     * an effect if the 'doc' query parameter is _not_ set, and must be singular
     * if present.
     */
    _startingDataInteractive: getUrlParameter('di'),

    startingDataInteractive: function() {
      var parsedGames, hash;

      if (this._startingDataInteractive) {
        hash = window.location.hash;
        return this._startingDataInteractive + (hash.length > 1 ? hash : '');
      } else if (this.urlParamGames) {
        try {
          parsedGames = JSON.parse(this.urlParamGames);
          if (parsedGames && parsedGames[0]) {
            return parsedGames[0].url;
          }
        } catch (ex) {
          DG.logWarn(ex);
        }
      }
    }.property('urlParamGames, _startingDataInteractive'),

    /**
     * enables 'di' URL param to override stored URL that matches
     */
    _dataInteractiveOverride: getUrlParameter('di-override'),

    /**
     * overrides the specified URL with one specified via 'di' URL parameter if
     * and only if the 'di-override' string is found within the specified URL.
     */
    finalGameUrl: function(iGameUrl) {
      if (!iGameUrl || !DG._startingDataInteractive || !DG._dataInteractiveOverride)
        return iGameUrl;
      var hashIndex = iGameUrl.indexOf('#'),
          gameUrlNoHash = hashIndex >= 0 ? iGameUrl.substring(0, hashIndex) : iGameUrl,
          gameUrlHash = hashIndex >= 0 ? iGameUrl.substring(hashIndex) : '',
          matchIndex = gameUrlNoHash.indexOf(DG._dataInteractiveOverride);
      return matchIndex >= 0
              ? DG._startingDataInteractive + gameUrlHash
              : iGameUrl;
    },

    /**
     * runKey can be passed as a Url parameter named runKey. It is a key which will be passed to the document server to enable
     * anonymous read-write access to documents. It can be any string.
     * ex: 'e342d47a-d3e5-48b8-9675-8622e40bb2c8'
     */
    runKey: getUrlParameter('runKey') || '',

    /**
     * componentMode can be passed as a Url parameter named tools with values 'yes' or 'no'.
     *  With the value 'yes' DG will not display the tool shelf, nor will it display scroll bars.
     *  The default is 'no'.
     */
    componentMode: function () {
      return getUrlParameter('componentMode', 'no');
    }.property(),

    hideCFMMenu: function () {
      return !!getUrlParameter('launchFromLara') || !!getUrlParameter('lara');
    }.property(),

    cfmBaseUrl: getUrlParameter('cfmBaseUrl'),

    /**
     * This URL specifies the location of a JSON file that describes the boundaries (country, state,
     * county, congressional district, PUMA) that CODAP supports.
     */
    boundarySpecsUrl: '//codap.concord.org/codap-data/boundaries/default_boundary_specs.json',

    /**
     * embeddedMode can be passed as a Url parameter named tools with values 'yes' or 'no'.
     *  With the value 'yes' DG will not display the tool shelf, nor will it display scroll bars or the background image and
     *  a iframePhone server will be setup to enable communication with the outside page.
     *  The default is 'no'.
     */
    embeddedMode: function () {
      return getUrlParameter('embeddedMode', 'no');
    }.property(),

    /**
     * hideSplashScreen can be passed as a Url parameter named tools with values 'yes' or 'no'.
     *  With the value 'yes' DG will not display the CODAP splash screen.
     *  The default is 'no'.
     */
    hideSplashScreen: function () {
      return getUrlParameter('hideSplashScreen', 'no');
    }.property(),

    /**
     * hideWebViewLoading can be passed as a Url parameter named tools with values 'yes' or 'no'.
     *  With the value 'yes' DG will not display the loading view when loading webviews.
     *  The default is 'no'.
     */
    hideWebViewLoading: function () {
      return getUrlParameter('hideWebViewLoading', 'no');
    }.property(),

    /**
     * hideUndoRedoInComponent can be passed as a url parameter with values 'yes' or 'no'.
     *  With the value 'yes' DG will not display the undo/redo buttons in the component
     *  when embeddedMore or componentMode is enabled.
     */
    hideUndoRedoInComponent: function () {
      return getUrlParameter('hideUndoRedoInComponent', 'no');
    }.property(),

    /**
     * If set, amends the options object sent to the CFM at initialization.
     * See the main.js:cfmInit().
     * @param {Object}
     */
    cfmConfigurationOverride: null,

    /**
     * embeddedServer can be passed as a Url parameter named tools with values 'yes' or 'no'.
     *  With the value 'yes' the embedded iframePhone server is setup to enable communication with the outside page.
     *  The default is 'no' and this option is ignored if embeddedMode is 'yes'
     */
    embeddedServer: function () {
      return getUrlParameter('embeddedServer', 'no');
    }.property(),

    /**
     * Returns the index of a guide page, if set as a query parameter. This is
     * taken to designate the guid page that should be present when CODAP opens
     * the document. This value should override whichever guide page is current
     * in the document and if the parameter is present and the guide is closed
     * in the document, the guide should be opened.
     */
    _guideIndex: getUrlParameter('guideIndex', undefined),
    initialGuideIndex: function (key, value) {
      if (value !== undefined) {
        this._guideIndex = value;
      }
      return this._guideIndex;
    }.property(),

    toolButtons: [ // These appear on the left side of the tool shelf
      'tableButton',
      'graphButton',
      'mapButton',
      'sliderButton',
      'calcButton',
      'textButton',
      'pluginButton'
    ],

    rightButtons: [ // These appear on the right side of the tool shelf
      'undoButton',
      'redoButton',
      'tileListButton',
      'optionButton',
      'helpButton',
      'guideButton'
    ],

    logServerUrl: function () {
      if (window.location.protocol.toLowerCase() === 'http') {
        return DG.defaultLogServerLoginURL;
      } else {
        return DG.defaultLogServerLoginURLSecure;
      }
    }.property(),

    /**
     More useful alternative to JavaScript built-in typeof operator.
     From http://javascriptweblog.wordpress.com/2011/08/08/fixing-the-javascript-typeof-operator/
     */
    toType: function (obj) {
      return ({}).toString.call(obj).match(/\s([a-zA-Z]+)/)[1].toLowerCase();
    },

    /**
     Creates a shallow copy of its argument.
     The argument can be a primitive type, a JS object, an array, an SC object, etc.
     @param    {Object}  iObject The object to be copied.
     @returns  {Object}  A shallow copy of its argument.
     */
    copy: function (iObject) {
      return SC.copy(iObject, NO);
    },

    /**
     Creates a deep copy of its argument.
     The argument can be a primitive type, a JS object, an array, an SC object, etc.
     @param    {Object}  iObject The object to be cloned.
     @returns  {Object}  A deep copy of its argument.
     */
    clone: function (iObject) {
      return SC.clone(iObject, YES);
    },

    /**
     * Determines whether attribute/slider names will be automatically canonicalized
     */
    canonicalizeNames: false,

    // CFM functions, null until connected
    exportFile: null,

    enableUndoHistory: true, //getUrlParameter('undo') === 'true'

    locales: [
      {
        langName: 'DG.Locale.name.de',
        langDigraph: 'de',
        countryDigraph: 'DE',
        icon: 'flag flag-de'
      },
      {
        langName: 'DG.Locale.name.en',
        langDigraph: 'en',
        countryDigraph: 'US',
        icon: 'flag flag-us'
      },
      {
        langName: 'DG.Locale.name.es',
        langDigraph: 'es',
        countryDigraph: 'ES',
        icon: 'flag flag-es'
      },
      {
        langName: 'DG.Locale.name.he',
        langDigraph: 'he',
        countryDigraph: 'IL',
        icon: 'flag flag-il'
      },
      {
        langName: 'DG.Locale.name.tr',
        langDigraph: 'tr',
        countryDigraph: 'TR',
        icon: 'flag flag-tr'
      },
      {
        langName: 'DG.Locale.name.zh',
        langDigraph: 'zh',
        countryDigraph: 'TW',
        icon: 'flag flag-tw'
      }
    ]

  }, window.DG); // end return from closure

}()));
