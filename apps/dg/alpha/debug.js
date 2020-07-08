// ==========================================================================
//                              DG.Debug
//
//  Debugging utilities for use in the DG application.
//
//  Author:   Kirk Swenson
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
sc_require('utilities/analytics');
/**
  Constant used to indicate logging of user actions.
  Analogous to SC.LOGGER_LEVEL_INFO, which as also the SC.Logger level
  at which it is such user log events are processed by SC.Logger.
*/
DG.LOGGER_LEVEL_USER = 'user';

/**
  Global function used to reload the current page.
  Called by the assert code when user presses the Reload button.
*/
DG.debugForceReload = function() {
  window.location.reload();
};

/**
  Global function used to drop into the JavaScript debugger, if one is running.
*/
DG.debugLaunchDebugger = function() {
  /* eslint no-eval: "off" */
  /* jslint evil:true */
  eval('debugger');
};


/** @class

  DG.Debug provides debugging utilities for use during development.
  These debugging utilities are synchronized with the SproutCore facilities.

  (1) Expanded logging support (enhances SC.Logger)
      -- Log messages can be logged to the DG server via DG.logToServer().
      -- Addition of the DG.LOGGER_LEVEL_USER for logging of user actions

      Clients control the level of server logging via the 'logServerLevel'
      property of DG.Debug. Clients should use the global convenience
      functions for their logging needs:
        DG.log(), DG.logRaw(), DG.logGroupBegin(), DG.logGroupEnd()
        DG.logInfo(), DG.logInfoRaw(), DG.logUser(), DG.logUserRaw(),
        DG.logWarn(), DG.logWarnRaw(), DG.logError(), DG.logErrorRaw()

      Note that the "standard" functions support printf-style formatting
      to simplify formatting of log strings. See SC.Logger for details.
      The "raw" functions skip the printf-style formatting for clients
      that would prefer to do the formatting themselves.

  (2) Assert functions

      Assert functions test a condition and put up an alert if it fails.
      As currently configured, the alert provides "Reload" and "Ignore"
      buttons and for developer builds (i.e. when running from sc-server
      during development), a "Debugger" button which drops into the debugger.

      In addition, for developer builds (i.e. when running from sc-server),
      the assert functions will drop into the debugger at a point at which
      the stack is meaningful, as it will contain the function which called
      the assert function.

      The following functions are defined at this point:

      DG.assert( iCondition, iMessage, iDescription)
      DG.check( iObject, iMessage, iDescription)
        -- Equivalent to assert( !SC.none( iObject))

      The assert functions as they exist now are designed to return the
      condition being tested. Thus, it is possible to handle the failure
      as well as being notified about it, e.g.

        if( DG.check( iObject))
          iObject.doSomething();

      Thus, even if the alert and dropping into the debugger features
      of the assert functions are eliminated in a production build, clients
      may still use the assertion functions to bypass code that would
      otherwise fail

      Note that currently the assert function will bring up the assertion
      failure dialog in production builds as well as during development.
      If we decide at some point that this is not what we want, at least
      there will be a single place in which to make the change.

  (3) Unhandled exception handling

      The SproutCore White Screen of Death (WSOD) is the built-in SproutCore
      handler of last resort for otherwise unhandled exceptions. We intercept
      this mechanism to log it (using DG.logError()) and to stop in the debugger
      in developer builds (i.e. when running from sc-server) to allow the
      developer to look around and perhaps set a breakpoint before calling the
      SproutCore White Screen of Death handler.

  @author Kirk Swenson
  @extends SC.Object
*/

SC.Logger.logOutputLevel = SC.LOGGER_LEVEL_WARN;
// @if (debug)
SC.Logger.logOutputLevel = SC.LOGGER_LEVEL_DEBUG;
// @endif

DG.Debug = SC.Object.create( (function() {
/** @scope DG.GlobalsController.prototype */

  // interval within which CODAP will suppress duplicate alerts
  var kAssertInterval = 1000;
  // the last Assert Message displayed
  var lastAssertMessage = null;
  // the time of the last assert message
  var lastAssertTime = 0;

  return {

    /**
      Controls the logging level to the DG server.
      Analogous to SC.Logger.logOutputLevel and SC.Logger.logRecordingLevel.

      @property: {Constant}
     */
    logServerLevel: SC.LOGGER_LEVEL_INFO,

    /**
      Controls the logging level to Google Analytics.
      Analogous to SC.Logger.logOutputLevel and SC.Logger.logRecordingLevel.

      @property: {Constant}
     */
    googleAnalyticsLevel: SC.LOGGER_LEVEL_INFO,

    /**
      Previous message logging function
      Called from our intervening message log handler.
    */
    _prevHandleLogMessage: null,

    /**
      Previous exception handler
      Called from our intervening exception handler.
    */
    _prevExceptionHandler: null,

    /** the time in milliseconds when init() or logDebugTimer(true) was last called. */
    _debugStartTime: 0,

    /**
      Install our overrides/interventions.
    */
    init: function() {

      this._debugStartTime = Date.now(); // record current time in milliseconds "since the epoch"

      // Install our message-logging intervention
      this._prevHandleLogMessage = SC.Logger._handleMessage;
      SC.Logger._handleMessage = this._prevHandleLogMessage;

      // Install our exception-handling intervention
      // this._prevExceptionHandler = SC.ExceptionHandler.handleException;
      SC.ExceptionHandler.handleException = this._handleException;

      SC.ExceptionHandler.enabled = YES;

    },

    /**
      Issue a log warning if the specified value is not finite (NaN, infinite, etc.)
     */
    logIfNotFinite: function(iValue, iOptString) {
      if( !isFinite( iValue))
        this.logWarn("DG.Debug.logIfNotFinite: String: %@, Value: %@", iOptString, iValue);
    },

    /**
      DG.Debug logging methods.
      Clients will generally use the global convenience functions defined later.
    */
    logDebug: function( iMessage, iOptFormatArgs) {
      DG.Debug._handleLogMessage(SC.LOGGER_LEVEL_DEBUG, YES, iMessage, arguments);
    },

    logDebugRaw: function( iRawArgs) {
      DG.Debug._handleLogMessage(SC.LOGGER_LEVEL_DEBUG, NO, null, arguments);
    },

    /** DG.Debug logging method with '[TIME=0.1234]' timing message (in seconds). */
    logDebugTimer: function( iResetTimer, iMessage, iOptFormatArgs ) {
      var tTimeMS = Date.now(); // time in milliseconds
      if( iResetTimer ) {    // reset the timer to zero
        DG.Debug._debugStartTime = tTimeMS;
        tTimeMS = 0;
      } else {                  // else relative to last start
        tTimeMS -= DG.Debug._debugStartTime;
      }
      // log with '[TIME=seconds.milliseconds] {message}'
      DG.Debug._handleLogMessage(SC.LOGGER_LEVEL_DEBUG, YES, "[TIME="+(tTimeMS/1000)+"] "+iMessage, arguments);
    },

    logDebugGroupBegin: function( iMessage, iOptFormatArgs) {
      SC.Logger._handleGroup(SC.LOGGER_LEVEL_DEBUG, iMessage, arguments);
    },

    logDebugGroupEnd: function() {
      SC.Logger._handleGroupEnd(SC.LOGGER_LEVEL_DEBUG);
    },

    logInfo: function( iMessage, iOptFormatArgs) {
      DG.Debug._handleLogMessage(SC.LOGGER_LEVEL_INFO, YES, iMessage, arguments);
    },

    logInfoRaw: function( iRawArgs) {
      DG.Debug._handleLogMessage(SC.LOGGER_LEVEL_INFO, NO, null, arguments);
    },

    /**
     * Log user actions. Has the priority of an Info level log message but may
     * also be logged to the log server and other places.
     * @param iMessage {string} A string, potentially with format strings as in
     * SC.String.fmt.
     * @param iOptFormatArgs {string} ... A variable number of substitution
     * parameters according to the format fields in IMessage.
     */
    logUser: function( iMessage, iOptFormatArgs) {
      var values = {
        formatStr: iMessage,
        replaceArgs: [].slice.call(arguments, 1)
      };
      var notificationManager = DG.currDocumentController().notificationManager;
      if (notificationManager) {
        notificationManager.notifyLogMessageSubscribers(values);
      }

      DG.Debug._handleLogMessage(DG.LOGGER_LEVEL_USER, YES, iMessage, arguments);
    },

    /**
     * This is a special purpose logger to support log messages coming from
     * the DI API. These may have an additional "topic" argument which we
     * need to handle specially. We need to convey them forward to the NotificationManager.
     * @param iTopic {string}
     * @param iMessage {string} A string, potentially with format strings as in
     * SC.String.fmt.
     * @param iOptFormatArgs {string} ... A variable number of substitution
     * parameters according to the format fields in IMessage.
     */
    logUserWithTopic: function( iTopic, iMessage, iOptFormatArgs) {
      var values = {
        topic: iTopic,
        formatStr: iMessage,
        replaceArgs: [].slice.call(arguments, 2)
      };

      var notificationManager = DG.currDocumentController().notificationManager;

      // Notification manager will not exist before there is a document.
      // Neither, of course, will any entities to notify.
      if (notificationManager) {
        notificationManager.notifyLogMessageSubscribers(values);
      }

      var args = [].slice.call(arguments, 1);

      DG.Debug._handleLogMessage(DG.LOGGER_LEVEL_USER, YES, iMessage, args);
    },

    logUserRaw: function( iRawArgs) {
      DG.Debug._handleLogMessage(DG.LOGGER_LEVEL_USER, NO, null, arguments);
    },

    logWarn: function( iMessage, iOptFormatArgs) {
      DG.Debug._handleLogMessage(SC.LOGGER_LEVEL_WARN, YES, iMessage, arguments);
    },

    logWarnRaw: function( iRawArgs) {
      DG.Debug._handleLogMessage(SC.LOGGER_LEVEL_WARN, NO, null, arguments);
    },

    logError: function( iMessage, iOptFormatArgs) {
      DG.Debug._handleLogMessage(SC.LOGGER_LEVEL_ERROR, YES, iMessage, arguments);
    },

    logErrorRaw: function( iRawArgs) {
      DG.Debug._handleLogMessage(SC.LOGGER_LEVEL_ERROR, NO, null, arguments);
    },

    /**
      Asserts that its condition is true.
      Puts up an alert message when its condition is not true, and
      automatically drops into the debugger in debug builds.
      Alert dialog has options for "Reload" and "Ignore" (and "Debug"
      for developer builds).

      @param {Boolean}  iCondition    The condition to test
      @param {String}   iMessage      A primary message
      @param {String}   iDescription  A secondary message
      @returns {Boolean}              The condition that was tested
    */
    assert: function( iCondition, iMessage, iDescription) {
      if( !iCondition) {

        var showAlert = ((lastAssertMessage !== iMessage) &&
                ((Date.now() - lastAssertTime) > kAssertInterval)),
            stopInDebugger = true;

        // Log assertion failures automatically
        DG.Debug.logErrorRaw( "Assertion Failed: " + iMessage + ": " + iDescription);

        // Stop in debugger in debug builds
        if( stopInDebugger ) {
          //@if(debug)
            /* eslint no-eval: "off" */
            /* jslint evil:true */
            eval('debugger');
          //@endif
        }

        // Show the assertion failure alert
        if( showAlert ) {
          SC.AlertPane.error({
            message: iMessage || "",
            description: iDescription || "",
            buttons: [
              { title: "Reload", action: DG.debugForceReload },
              //@if(debug)
                { title: "Debug", action: DG.debugLaunchDebugger },
              //@endif
              { title: "Ignore" }
            ]
          });
          lastAssertMessage = iMessage;
          lastAssertTime = Date.now();
        }
      }
      // Give clients a chance to handle the failure, e.g.
      // if( !DG.assert(myObj))
      //   myObj.doSomething();
      return iCondition;
    },

    /**
      Asserts that the specified object is defined and non-null.
      Equivalent to DG.assert( !SC.none( iObject, iMessage, iDescription))

      @param {Object}   iObject       The object to test
      @param {String}   iMessage      A primary message
      @param {String}   iDescription  A secondary message
      @returns {Boolean}              The condition that was tested
    */
    check: function( iObject, iMessage, iDescription) {
      return this.assert( !SC.none( iObject), iMessage, iDescription);
    },

    /** @private
      Private function used to decide when to log to the DG server.
      Analogous to SC.Logger._shouldOutputType and SC.Logger._shouldRecordType.

      @param {String}  iType  The name of the type in question from among
                                standard Sproutcore log types.
      @returns {Boolean}
    */
    _shouldLogTypeToServer: function( iType) {
      var logLevelMapping = SC.Logger._LOG_LEVEL_MAPPING,
          level           = logLevelMapping[iType]                      || 0,
          currentLevel    = logLevelMapping[this.get('logServerLevel')] || 0;

      return (level <= currentLevel);
    },

    /** @private
      Outputs to the console and/or records the specified message and/or
      logs it to the DG server if the respective current log levels allows for it.
      Assuming 'automaticallyFormat' is specified, then String.fmt() will be called
      automatically on the message, but only if at least one of the log levels
      is such that the result will be used.

      @param {String}  iType         Expected to be SC.LOGGER_LEVEL_DEBUG, etc.
      @param {Boolean} iAutoFormat   Whether or not to treat 'message' as a format string if there are additional arguments
      @param {String}  iMessage      Expected to a string format (for String.fmt()) if there are other arguments
      @param {Object}  iOriginalArgs (optional) All arguments passed into debug(), etc. (which includes 'message'; for efficiency, we don’t copy it)
    */
    _handleLogMessage: function( iType, iAutoFormat, iMessage, iOriginalArgs) {

      // Map DG-specific types to standard SC.Logger types
      //var scType = (iType === DG.LOGGER_LEVEL_USER ? SC.LOGGER_LEVEL_INFO : iType);
      var scType = iType;
      if (iType === DG.LOGGER_LEVEL_USER) { scType = SC.LOGGER_LEVEL_INFO; }
      else if (iType === DG.LOGGER_LEVEL_INFO) { scType = SC.LOGGER_LEVEL_DEBUG; }

      // Let SC.Logger log the message normally
      this._prevHandleLogMessage.call( SC.Logger, scType, iAutoFormat, iMessage, iOriginalArgs);

      var shouldLogToServer = DG.Debug._shouldLogTypeToServer( scType),
          shouldLogToGA = DG.Debug._shouldLogTypeToGoogleAnalytics(scType);
      if (shouldLogToServer || shouldLogToGA) {
        // Pass along any properties that were passed in the last argument as
        // metaArgs
        var lastArg = (iOriginalArgs && (iOriginalArgs.length > 0))
                ? iOriginalArgs[ iOriginalArgs.length - 1]
                : undefined,
            metaArgs = typeof lastArg === 'object' ? lastArg : {},
            messageParts = DG.Debug._currentMessage? DG.Debug._currentMessage.split(":"): [],
            activityName = DG.getPath('currDocumentController.documentName'),
            messageType = messageParts.shift(),
            messageArgs = messageParts.join(':').trim();

        // Warnings and errors have a messageType of their level. We pass the original message.
        if (scType === SC.LOGGER_LEVEL_ERROR || scType === SC.LOGGER_LEVEL_WARN) {
          messageType = scType;
          messageArgs = '{"message": "' +  DG.Debug._currentMessage + '"}';
        }

        // Log the message to the server as well, if appropriate
        if ( shouldLogToServer ) {
          try {
            DG.logToServer( messageType, {
                  type: iType,
                  args: messageArgs,
                  activity: activityName,
                  application: 'CODAP'
                }, metaArgs);
          } catch(ex) {
            if (console && console.log) {
              console.log('Log to server failed: ' + ex);
            }
          }
        }

        if ( shouldLogToGA ) {
          DG.Analytics.trackEvent(DG.Analytics.categoryForEvent(messageType), messageType, messageArgs);
        }
      }

    },

    /** @private
      Private function used to decide when to log to Google Analytics.
      Analogous to SC.Logger._shouldOutputType and SC.Logger._shouldRecordType.

      @param {String}  iType  The name of the type in question from among
                                standard Sproutcore log types.
      @returns {Boolean}
    */
    _shouldLogTypeToGoogleAnalytics: function( iType) {
      var logLevelMapping = SC.Logger._LOG_LEVEL_MAPPING,
          level           = logLevelMapping[iType]                      || 0,
          currentLevel    = logLevelMapping[this.get('googleAnalyticsLevel')] || 0;

      return DG.GOOGLE_ANALYTICS_ID && (level <= currentLevel);
    },

    /** @private
      Our exception handler override which logs the exception and stops in the debugger
      before calling the SproutCore exception handler.
    */
    _handleException: function( iException) {
      var shouldCallSystemHandler = !SC.none( DG.Debug._prevExceptionHandler);

      DG.Debug.logError( "Exception: " + iException);
      if (console && console.log) {
        DG.log(iException.stack);
      }


      //@if(debug)
        /* eslint no-eval: "off" */
        /* jslint evil:true */
        eval('debugger');
      //@endif
      window.alert('DG.mainPage.exceptionMessage'.loc(iException.message));  /* eslint no-alert: "off" */

      if( shouldCallSystemHandler)
        DG.Debug._prevExceptionHandler.call( this, iException);

      return true;
    }

  }; // return from function closure
}())); // function closure

/** @private
  Replace SC.Logger._shouldOutputType function with our own implementation which always
  returns true, thus guaranteeing that we have a chance to capture the formatted message.
  Stash the original SC.Logger._shouldOutputType function so we can call it later.
 */
DG.Debug._prevShouldOutputType = SC.Logger._shouldOutputType;
SC.Logger._shouldOutputType = function(type) {
  return true;
};

/** @private
  Replace SC.Logger._outputMessage function with our own implementation which captures the
  formatted message. We then call the original SC.Logger._shouldOutputType method to determine
  whether or not to call the original SC.Logger._outputMessage method.
 */
DG.Debug._prevOutputMessage = SC.Logger._outputMessage;
SC.Logger._outputMessage = function(type, timestampStr, indentation, message, originalArguments) {
  // be careful to place a string in _currentMessage. Otherwise we can fail badly
  // trying to report a minor error.
  if (typeof message === 'string') {
    DG.Debug._currentMessage = message;
  } else if (message && message.toString) {
    DG.Debug._currentMessage = message.toString();
  } else {
    DG.Debug._currentMessage = '';
  }
  if( DG.Debug._prevShouldOutputType.call( SC.Logger, type))
    DG.Debug._prevOutputMessage.call( SC.Logger, type, timestampStr, indentation, message, originalArguments);
};

/**
  Returns the unique SproutCore-generated ID for a SproutCore object.
  Returns "{none}" if there is not SproutCore ID associated with the object.
  This can be useful when logging to help identify objects.
 */
DG.Debug.scObjectID = function( iObject) {
  var scIDValue = "";
  DG.ObjectMap.findKey( iObject, function( iKey, iValue) {
    if( iKey.substr(0,10) === 'SproutCore') {
      scIDValue = iValue;
      return true;
    }
    return false;
  });
  return !SC.empty(scIDValue) ? scIDValue : "{none}";
};

/**
  Convenience functions for DG.Debug functions.
*/
DG.log = DG.Debug.logDebug;
DG.logRaw = DG.Debug.logDebugRaw;
DG.logTimer = DG.Debug.logDebugTimer;
DG.logGroupBegin = DG.Debug.logDebugGroupBegin;
DG.logGroupEnd = DG.Debug.logDebugGroupEnd;

DG.logInfo = DG.Debug.logInfo;
DG.logInfoRaw = DG.Debug.logInfoRaw;
DG.logUser = DG.Debug.logUser;
DG.logUserRaw = DG.Debug.logUserRaw;
DG.logWarn = DG.Debug.logWarn;
DG.logWarnRaw = DG.Debug.logWarnRaw;
DG.logError = DG.Debug.logError;
DG.logErrorRaw = DG.Debug.logErrorRaw;

DG.assert = DG.Debug.assert;
DG.check = DG.Debug.check;

