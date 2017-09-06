// ==========================================================================
//                              DG.Browser
// 
//   A collection of utilities for browser specific fixes / workarounds.
//  
//   Author:    Matt Litwin
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

DG.Browser = {

  /**
    Initial browser sniffing.
    Will inject various workarounds, so call after loading SC.
   */   
  init: function() {
    // SproutCore changes the 'overflow' setting of the document at various times
    // to avoid presenting scroll bars when they would not be desirable.
    // Firefox has had a long-running bug (supposedly fixed in Firefox 13) which
    // would cause embedded Flash objects to reload unnecessarily when the 'overflow'
    // setting of the document (or various other settings) were changed.
    // Our attempts to prevent the change to the 'overflow' setting in Firefox
    // when there were embedded plugin objects led to other problems, e.g. crashes
    // when attempting to determine whether to apply the fix or not.
    // For 0138 (2012-10-05) we only try to change the SproutCore behavior for
    // Firefox versions before Firefox 13; and when we do change the SproutCore
    // behavior we use a simpler test that applies the change more universally:
    // If there are any <embed>, <object>, or <iframe> tags, we disable SproutCore's
    // 'overflow' changes.
    // See http://dgbugs.kcptech.com/show_bug.cgi?id=111 and comments below for
    // more details.
    if( (SC.browser.name === SC.BROWSER.firefox) && (SC.browser.compare( SC.browser.version, '46') < 0)) {
      // The menu pane base class picker.js plays with
      // the SC.$(document.body) css overflow attribute,
      // toggling between 'hidden' and 'visible' in its private
      // _hideOverflow and _showOverflow functions.
      
      // Code comment to _hideOverflow says.
      // (https://github.com/sproutcore/sproutcore/blob/master/frameworks/desktop/panes/picker.js)
      /*
        Internal method to hide the overflow on the body to make sure we don't
        show scrollbars when the picker has shadows, as it's really anoying.
      */
      
      // But this runs into a Firefox bug which reloads flash in many situtations where it should not
      // https://bugzilla.mozilla.org/show_bug.cgi?id=90268 (Start with comment #80)
      // According to the Bugzilla bug, a fix landed in Firefox 13.
      
      // We'll check for embed and object tags, which show the bug.
      var hasActivePlugin; // Declare function var before referencing it in definition (JSLint warning)     
      hasActivePlugin = function(rootNode) {
        var hasPlugins = false;

        try {
          // Are there any embed/object tags in the main document?
          if((SC.$('embed', rootNode).length > 0) || (SC.$('object', rootNode).length > 0))
              hasPlugins = true;

          // Are there any iframes which could have embedded plugins?
          // Note: We used to try to recursively search through the contents of the
          // iframe looking for <embed>/<object> tags. These tests failed on some
          // versions of Firefox, so we simplify the test to say if there are any
          // iframes, we assume that there could be plugins.
          if( SC.$('iframe', rootNode) > 0)
            hasPlugins = true;
        }
        catch(e) {
          hasPlugins = true;
        }
         
         return hasPlugins;
      };
      
      // Keep track of the SC version of the function.
      var original_hideOverflow = SC.PickerPane.prototype._hideOverflow;
      
      // Override _hideOverflow
      SC.PickerPane.prototype._hideOverflow = function() {
        // Skip the call to SproutCore's _hideOverflow() if we have plug-ins.
        // In the absence of plug-ins, preserve the original behavior.
        if( !hasActivePlugin(SC.$(document)))
          original_hideOverflow.call(this,arguments);
      };
            
      // SC.PickerPane.prototype._showOverflow is bullet proof against a no-op _hideOverflow,
      // so no action is needed here. Saves us the trouble of tracking if we have called 
      // original_hideOverflow() or not.
    }
  },
  
  /**
    Returns true if the current browser is supported (or not explicitly unsupported),
    false otherwise.
   */
  isCompatibleBrowser: function() {

    // Returns true if iCurrentVersion >= iRequiredVersion
    function isSupportedVersion( iRequiredVersion, iCurrentVersion) {
      var requiredParts = iRequiredVersion.split('.'),
          requiredPartCount = requiredParts.length,
          currentParts = iCurrentVersion.split('.');
      for( var i = 0; i < requiredPartCount; ++i) {
        var currentVersion = Number( currentParts[ i]) || 0,
            requiredVersion = Number( requiredParts[ i]);
        if( currentVersion > requiredVersion)
          return true;
        if( currentVersion < requiredVersion)
          return false;
      }
      // If we get here, we have exactly the required version
      return true;
    }
  
    //DG.log('Browser: %@, Version: %@', SC.browser.name, SC.browser.version);
    
    // DEV builds are used for browser compatibility testing
    if( DG.IS_DEV_BUILD)
      return true;
      
    switch( SC.browser.name) {
    case SC.BROWSER.ie: //Win Edge is still recognized as ie in Sproutcore
        //return isSupportedVersion('11',SC.browser.version) ;
        return false; //Not supporting IE11 as of 8/30/2017
    case SC.BROWSER.firefox:
      // Version number corresponds to Gecko version number for Firefox 3.6.
      // See http://en.wikipedia.org/wiki/Firefox_history for details.
      return isSupportedVersion('46', SC.browser.version) ||
              isSupportedVersion('46', SC.browser.engineVersion); //after Gecko 2.0, Firefox and Gecko version number are the same.
    case SC.BROWSER.chrome:
      return isSupportedVersion('50', SC.browser.version);
    case SC.BROWSER.safari:
      // Version number corresponds to WebKit version number for Safari 4.
      // See http://en.wikipedia.org/wiki/Safari_version_history for details.
      return isSupportedVersion('10', SC.browser.version) ||
              isSupportedVersion('603.1.30', SC.browser.engineVersion);
    }
    // Give other (largely untested) browsers the benefit of the doubt
    return true;
  },

  /**
    Encapsulate browser-specific differences in cursor-specification.
    See http://www.useragentman.com/blog/2011/12/21/cross-browser-css-cursor-images-in-depth/
    for more information about custom cursor browser compatibility.
    IE uses the the hotspot information in .cur files, but can't handle
    hot spot information provided in code.
    Chrome ignores the hotspot information in .cur files and so requires
    hot spot information provided in code.
    Most other browsers respect hot spot information in .cur files and
    in code, leading to an interesting question about what happens when
    they conflict. The code below generates different cursor specification
    strings depending on the browser.
    @param    {String}    iUrl -- The URL path for the cursor file
    @param    {Number}    iXHotSpot -- The X coordinate of the cursor hot spot
    @param    {Number}    iYHotSpot -- The Y coordinate of the cursor hot spot
    @param    {String}    iDefault -- [Optional] Defaults to 'auto'
    @returns  {String}    The cursor specification string for the browser
   */
  customCursorStr: function( iUrl, iXHotSpot, iYHotSpot, iDefault) {
    iDefault = iDefault || 'auto';
    return ( SC.browser.engine === SC.ENGINE.trident
                 ? 'url(' + iUrl + '), ' + iDefault
                 : 'url(' + iUrl + ') ' + iXHotSpot + ' ' + iYHotSpot + ', ' + iDefault);
  }
};
