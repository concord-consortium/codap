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

if (SC.Request.prototype.allowCredentials != null) {
  throw new Error("Looks like Sproutcore was updated and now implements SC.Request.allowCredentials! Remove the SC.XHRResponse monkey patch in core.js, and its override in DG.authorizationController.logToServer.");
}

SC.XHRResponse.prototype.oldCreateRequest = SC.XHRResponse.prototype.createRequest;
SC.XHRResponse.prototype.createRequest = function() {
  var rawRequest = this.oldCreateRequest();
  if ("withCredentials" in rawRequest) {
    rawRequest.withCredentials = true;
  }
  return rawRequest;
};

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
    var results = regex.exec(window.location.href);
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

  var isTestBuild = function () {
    return (window.location.href.indexOf('-test.') >= 0);
  };


  return { // return from closure

    NAMESPACE: 'DG',
    APPNAME: 'DG',

    /*
     * Semantic version number
     */
    VERSION: '1.1',

    /*
     * Build number
     */
    BUILD_NUM: '0293',

    /**
     * The subdomain for the Drupal site which must be hosted on the same domain.  This is used for various interactions
     * between the client app and the Drupal site directly for things like creating links for users to navigate to the
     * Drupal site.  Interactions which are done programmatically, like authentication, in which the user is not directly
     * involve in is done using the server as the middleman for security purposes.
     */
    DRUPAL_SUBDOMAIN: 'play', // see also getDrupalSubdomain()

    IS_DG_BUILD: isDGBuild(),

    IS_INQUIRY_SPACE_BUILD: isInquirySpaceBuild(),

    IS_SRRI_BUILD: isSrriBuild(),

    USE_DIFFERENTIAL_SAVING: true,

    USE_COMPRESSION: true,

    FORCE_SPLIT_DOCUMENT: true,

    AUTOSAVE: (function() {
      var runKey = getUrlParameter('runKey');
      if (!SC.none(runKey) && runKey.length > 0) {
        return true;
      }
      return false;
    })(),

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

    // get the drupal subdomain sub-string, eg. "play-srri.", "play-srri-test." to form 'play-srri-test.kcptech.com", etc.
    getDrupalSubdomain: function () {
      var domainString = DG.DRUPAL_SUBDOMAIN;
      if (DG.IS_SRRI_BUILD) {
        domainString += '-srri';
      }
      if (isTestBuild()) {
        domainString += '-test';
      }
      return domainString + '.';
    },

    IS_DEV_BUILD: isDevBuild(),

    // This is your application store.  You will use this store to access all
    // of your model data.  You can also set a data source on this store to
    // connect to a backend server.
    appStore: theStore,

    // The current document store. Clients that refer to DG.store are implicitly
    // referring to the store that corresponds to the current document.
    store: null,

    urlParamGames: getUrlParameter('moreGames'),

    /**
     * startingDocName can be passed as a Url parameter named doc.
     * DG will attempt to open this document on startup.
     *
     */
    startingDocName: getUrlParameter('doc'),

    /**
     * startingDataInteractive can be passed as a Url parameter named 'di'
     * Expects the URL of an executable page. For now, it will only have
     * an effect if the 'doc' query parameter is _not_ set, and must be singular
     * if present.
     */
    _startingDataInteractive: getUrlParameter('di'),

    startingDataInteractive: function() {
      var parsedGames;

      if (this._startingDataInteractive) {
        return this._startingDataInteractive;
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
     * startingDocOwner can be passed as a Url parameter named doc.
     * It is a second parameter required for DG to open a document
     * on startup.  It is the username of the owner of the document in the
     * database.
     */
    startingDocOwner: getUrlParameter('owner'),

    /**
     * startingDocId can be passed as a Url parameter named doc. It is a parameter that can be used instead of startingDocName and
     * startingDocOwner to open a document on startup.  It is the id of the document in the database.
     */
    startingDocId: getUrlParameter('recordid'),

    /**
     * documentServer can be passed as a Url parameter named documentServer. It is the server from which DG will use to open/save
     * documents. It should be formatted as a full url, to which 'document/*' will be appended.
     * A trailing slash (/) will be appended if it is omitted.
     * ex: 'http://docs.example.com/', 'https://www.example.com/docserver/'
     */
    documentServer: (function() {
      var docServer = getUrlParameter('documentServer') || '';
      if (docServer.length > 0 && SC.none(docServer.match(/\/$/))) {
        docServer += '/';
      }
      return docServer;
    })(),

    /**
     * runKey can be passed as a Url parameter named runKey. It is a key which will be passed to the document server to enable
     * anonymous read-write access to documents. It can be any string.
     * ex: 'e342d47a-d3e5-48b8-9675-8622e40bb2c8'
     */
    runKey: getUrlParameter('runKey') || '',

    /**
     * runAsGuest can be passed as a Url parameter named runAsGuest. It is a boolean which tells the login logic to avoid prompting
     * for a login if a user isn't currently logged in, and instead runs as guest automatically.
     */
    runAsGuest: getUrlParameter('runAsGuest') === 'true',

    /**
     * componentMode can be passed as a Url parameter named tools with values 'yes' or 'no'.
     *  With the value 'yes' DG will not display the tool shelf, nor will it display scroll bars.
     *  The default is 'no'.
     */
    componentMode: getUrlParameter('componentMode', 'no'),

    toolButtons: [
      'fileMenu',
      //'gameMenu',
      'tableButton',
      'graphButton',
      'mapButton',
      'sliderButton',
      'calcButton',
      'textButton',
      'optionButton',
      'guideButton'
    ],

    logServerUrl: 'http://cc-log-manager.herokuapp.com/api/logs',

//    logServerUrl: 'http://localhost:3000/api/logs',

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

    iUser: getUrlParameter('username'),
    iPassword: getUrlParameter('password'),
    iSessionID: getUrlParameter('sessionid')

  }; // end return from closure

}()));
