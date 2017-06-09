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


  return { // return from closure

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
    BUILD_NUM: '0389',

    IS_DG_BUILD: isDGBuild(),

    IS_INQUIRY_SPACE_BUILD: isInquirySpaceBuild(),

    IS_SRRI_BUILD: isSrriBuild(),

    exampleListURL: 'https://codap-resources.concord.org/examples/index.json',

    showHelpURL: 'https://codap.concord.org/help',

    showWebSiteURL: 'https://codap.concord.org',

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
        var regexS = "[\\?&]" + iParam + "=([^&]*)",
            regex = new RegExp(regexS),
            result = regex.exec(queryParams),
            match = result && result[0],
            matchIndex = result && result.index,
            matchLength = match && match.length;
        if ((matchIndex > 0) && (queryParams[matchIndex-1] === '&'))
          match = '&' + match;
        else if ((matchIndex + matchLength < queryParams.length) &&
                  (queryParams[matchIndex + matchLength] === '&')) {
          match = match + '&';
        }
        else if ((matchLength + 1 === queryParams.length))
          match = '?' + match;

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
      if (DG.IS_INQUIRY_SPACE_BUILD) {
        key += '.IS_BUILD';
      }
      else if (DG.IS_SRRI_BUILD) {
        key += '.SRRI_BUILD';
      }
      return key;
    },

    IS_DEV_BUILD: isDevBuild(),

    NO_DATA_TIP_PREF: noDataTipPref(),

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
    componentMode: getUrlParameter('componentMode', 'no'),

    hideCFMMenu: !!getUrlParameter('launchFromLara') || !!getUrlParameter('lara'),

    cfmBaseUrl: getUrlParameter('cfmBaseUrl'),

    /**
     * embeddedMode can be passed as a Url parameter named tools with values 'yes' or 'no'.
     *  With the value 'yes' DG will not display the tool shelf, nor will it display scroll bars or the background image and
     *  a iframePhone server will be setup to enable communication with the outside page.
     *  The default is 'no'.
     */
    embeddedMode: getUrlParameter('embeddedMode', 'no'),

    /**
     * embeddedServer can be passed as a Url parameter named tools with values 'yes' or 'no'.
     *  With the value 'yes' the embedded iframePhone server is setup to enable communication with the outside page.
     *  The default is 'no' and this option is ignored if embeddedMode is 'yes'
     */
    embeddedServer: getUrlParameter('embeddedServer', 'no'),

    toolButtons: [ // These appear on the left side of the tool shelf
      'tableButton',
      'graphButton',
      'mapButton',
      'sliderButton',
      'calcButton',
      'textButton'
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

    enableUndoHistory: true //getUrlParameter('undo') === 'true'

  }; // end return from closure

}()));
