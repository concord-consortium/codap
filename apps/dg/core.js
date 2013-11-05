// ==========================================================================
//                                DG
//
//  DG is the namespace for all of the Data Games JavaScript code.
//
//  Copyright ©2013 KCP Technologies, Inc., a McGraw-Hill Education Company
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
if(!Object.keys) Object.keys = function(o) {
  var ret=[],p;
  for(p in o) if(Object.prototype.hasOwnProperty.call(o,p)) ret.push(p);
  return ret;
};

/*
Function.prototype.bind is a method introduced in ECMAscript 262-5 which allows
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
        fNOP = function () {},
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
if(!String.prototype.trim) {
  String.prototype.trim = function () {
    return this.replace(/^\s+|\s+$/g,'');
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
DG = SC.Application.create( (function() // closure
  /** @scope DG.prototype */ {
  
  var theStore = null;
  var fixtures = false;
  var kMemoryDataSource = 'DG.MemoryDataSource',
      // kRESTDataSource = 'DG.RESTDataSource',
      kDefaultDataSource = kMemoryDataSource;

  // Utility function for extracting URL parameters
  var getUrlParameter = function(iParam, iDefault) {
    iParam = iParam.replace(/[\[]/,"\\[").replace(/[\]]/,"\\]");
    iDefault = iDefault || '';
    var regexS = "[\\?&]"+iParam+"=([^&]*)";
    var regex = new RegExp( regexS );
    var results = regex.exec( window.location.href );
    if( SC.none(results) ) {
      return iDefault;
    } else {
      return decodeURIComponent( results[1]);
    }
  };
  
  var isDGBuild = function() {
    var appParam = getUrlParameter('app');
    return !SC.empty( appParam) ? appParam === 'dg'
                                : window.location.href.indexOf('/dg') >= 0;
  };
  
  var isInquirySpaceBuild = function() {
    var appParam = getUrlParameter('app');
    return !SC.empty( appParam) ? appParam === 'is'
                                : window.location.href.indexOf('/is') >= 0;
  };
  
  var isSrriBuild = function() {
    var appParam = getUrlParameter('app');
    return !SC.empty( appParam) ? appParam === 'srri'
                                : window.location.href.indexOf('srri') >= 0;
  };
  
  var isDevBuild = function() {
    return (window.location.href.indexOf('-dev.kcptech.com') >= 0) ||
           (window.location.href.indexOf('localhost:4020') >= 0);
  };
  
  // Attach ?fix='true' to the URL to use fixtures
  fixtures = getUrlParameter('fix');
  
  if (fixtures) {
    theStore = SC.Store.create().from(SC.Record.fixtures);
  }
  else {
    theStore = SC.Store.create({ 
      commitRecordsAutomatically: YES
    }).from( kDefaultDataSource);
  }
  
  theStore._originalCreateRecord = theStore.createRecord;
  theStore.createRecord = function(recordType, dataHash, id) {
    var newRecord = this._originalCreateRecord( recordType, dataHash, id);
    // Currently, must call normalize for defaultValues to get handled appropriately.
    // See https://github.com/sproutcore/sproutcore/issues/98 for details.
    newRecord.normalize();
    return newRecord;
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
  BUILD_NUM: '0220',

  /**
   * The subdomain for the Drupal site which must be hosted on the same domain.  This is used for various interactions
   * between the client app and the Drupal site directly for things like creating links for users to navigate to the
   * Drupal site.  Interactions which are done programmatically, like authentication, in which the user is not directly
   * involve in is done using the server as the middleman for security purposes.
   */
  DRUPAL_SUBDOMAIN: 'play.',

  IS_DG_BUILD: isDGBuild(),

  IS_INQUIRY_SPACE_BUILD: isInquirySpaceBuild(),

  IS_SRRI_BUILD: isSrriBuild(),

  /**
   * Modify the given string key (usually in strings.js), and return the associated variant of the
   * key if this is an SRRI build (also expected to be in in strings.js).
   * @param iKey
   * @return {String}
   */
  getVariantString: function(iKey) {
    var key = iKey;
    if( DG.IS_INQUIRY_SPACE_BUILD) {
        key += '.IS_BUILD';
    }
    else if( DG.IS_SRRI_BUILD) {
        key += '.SRRI_BUILD';
    }
    return key;
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
  
  defaultGameName: getUrlParameter('game'),

    /**
     * startingDocName can be passed as a Url parameter named doc. DG will attempt to open this document on startup.
     * 
     */
  startingDocName: getUrlParameter('doc'),

    /**
     * startingDocOwner can be passed as a Url parameter named doc. It is a second parameter required for DG to open a document
     * on startup.  It is the username of the owner of the document in the database.
     */
  startingDocOwner: getUrlParameter('owner'),
  
    /**
     * componentMode can be passed as a Url parameter named tools with values 'yes' or 'no'.
     *  With the value 'yes' DG will not display the tool shelf, nor will it display scroll bars.
     *  The default is 'no'.
     */
  componentMode: getUrlParameter('componentMode', 'no'),
  
  /**
    More useful alternative to JavaScript built-in typeof operator.
    From http://javascriptweblog.wordpress.com/2011/08/08/fixing-the-javascript-typeof-operator/
   */
  toType: function(obj) {
    return ({}).toString.call(obj).match(/\s([a-zA-Z]+)/)[1].toLowerCase();
  },
  
  /**
    Creates a shallow copy of its argument.
    The argument can be a primitive type, a JS object, an array, an SC object, etc.
    @param    {Object}  The object to be copied.
    @returns  {Object}  A shallow copy of its argument.
   */
  copy: function( iObject) {
    return SC.copy( iObject, NO);
  },
  
  /**
    Creates a deep copy of its argument.
    The argument can be a primitive type, a JS object, an array, an SC object, etc.
    @param    {Object}  The object to be cloned.
    @returns  {Object}  A deep copy of its argument.
   */
  clone: function( iObject) {
    return SC.clone( iObject, YES);
  },
  
  iUser : getUrlParameter('username'),
  iPassword : getUrlParameter('password'),
  iSessionID : getUrlParameter('sessionid')
  
  }; // end return from closure

}()));
