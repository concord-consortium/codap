// ==========================================================================
//                      DG.authorizationController
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

sc_require('models/authorization_model');

/**
  Logs the specified message, along with any additional properties, to the server.

  @param    iLogMessage   {String}    The main message to log
  @param    iProperties   {Object}    Additional properties to pass to the server,
                                      e.g. { type: DG.Document }
  @param    iMetaArgs     {Object}    Additional flags/properties to control the logging.
                                      The only meta-arg currently supported is { force: true }
                                      to force logging to occur even when logging is otherwise
                                      disabled for a given user. This is used to guarantee that
                                      login/logout events get logged even when other user actions
                                      are not logged (e.g. for guest users). Clients using the
                                      utility functions (e.g. DG.logUser()) can add an additional
                                      argument, which must be a JavaScript object, and which will
                                      be passed on to the logToServer function as the meta-args.
 */
DG.logToServer = function( iLogMessage, iProperties, iMetaArgs) {
  DG.authorizationController.logToServer( iLogMessage, iProperties, iMetaArgs);
};

/** @class

  (Document Your Controller Here)

  @extends SC.Object
*/
DG.authorizationController = SC.Controller.create( (function() {

return {
/** @scope DG.authorizationController.prototype */

  /**
    Logs the specified message, along with any additional properties, to the server.

    description and signature TODO
   */
  logToServer: function(event, iProperties, iMetaArgs) {
    function extract(obj, prop) {
      var p = obj[prop];
      obj[prop] = undefined;
      return p;
    }

    var shouldLog = this.getPath('currLogin.isLoggingEnabled') ||
                    (!DG.documentServer && iMetaArgs && iMetaArgs.force),
        time = new Date(),
        eventValue,
        parameters = {},
        body;

    if( !shouldLog) {
      // The logging path below indirectly triggers SproutCore notifications.
      // Calling SC.run() allows the same notifications to get triggered without the logging.
      SC.run();
      return;
    }

    if (DG.get('logServerUrl')) {
      this.currLogin.incrementProperty('logIndex');

      eventValue = extract(iProperties, 'args');

      // test for simple string
      if (/^[a-zA-Z]*$/.test(eventValue)) {
        parameters = {value: eventValue};
      }
      else {
        try {
          parameters = JSON.parse(eventValue);
          // If the value of parameters is not an object, then wrap the value in
          // an object. Otherwise the log manager will reject it.
          if (typeof parameters !== 'object') {
            parameters = {value: parameters};
          }
        } catch (e) {
          // ignore exceptions
        }
      }

      // hack to deal with pgsql 'varying' type length limitation

      if (eventValue && eventValue.length > 255) {
        eventValue = eventValue.substr(0, 255);
      }

      body = {
        activity:    extract(iProperties, 'activity') || 'Unknown',
        application: extract(iProperties, 'application'),
        session:     DG.get('runKey'),
        // avoids TZ ambiguity; getTime returns milliseconds since the epoch (1-1-1970 at 0:00 *UTC*)
        time:        time.getTime(),
        event:       event,
        event_value: eventValue,
        parameters:  parameters
      };

      $.ajax(DG.get('logServerUrl'), {
        type: 'POST',
        contentType: 'application/json',
        data: SC.json.encode(body),
        xhrFields: {
          withCredentials: false
        }
      });
    }
  }

}; })());
