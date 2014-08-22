!function(e){"object"==typeof exports?module.exports=e():"function"==typeof define&&define.amd?define(e):"undefined"!=typeof window?window.iframePhone=e():"undefined"!=typeof global?global.iframePhone=e():"undefined"!=typeof self&&(self.iframePhone=e())}(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var structuredClone = require('./structured-clone');
var HELLO_INTERVAL_LENGTH = 200;
var HELLO_TIMEOUT_LENGTH = 1000;

function IFrameEndpoint() {
  var parentOrigin;
  var listeners = {};
  var isInitialized = false;
  var connected = false;
  var postMessageQueue = [];
  var helloInterval;

  function postToTarget(message, target) {
    // See http://dev.opera.com/articles/view/window-postmessage-messagechannel/#crossdoc
    //     https://github.com/Modernizr/Modernizr/issues/388
    //     http://jsfiddle.net/ryanseddon/uZTgD/2/
    if (structuredClone.supported()) {
      window.parent.postMessage(message, target);
    } else {
      window.parent.postMessage(JSON.stringify(message), target);
    }
  }

  function post(type, content) {
    var message;
    // Message object can be constructed from 'type' and 'content' arguments or it can be passed
    // as the first argument.
    if (arguments.length === 1 && typeof type === 'object' && typeof type.type === 'string') {
      message = type;
    } else {
      message = {
        type: type,
        content: content
      };
    }
    if (connected) {
      postToTarget(message, parentOrigin);
    } else {
      postMessageQueue.push(message);
    }
  }

  // Only the initial 'hello' message goes permissively to a '*' target (because due to cross origin
  // restrictions we can't find out our parent's origin until they voluntarily send us a message
  // with it.)
  function postHello() {
    postToTarget({
      type: 'hello',
      origin: document.location.href.match(/(.*?\/\/.*?)\//)[1]
    }, '*');
  }

  function addListener(type, fn) {
    listeners[type] = fn;
  }

  function removeAllListeners() {
    listeners = {};
  }

  function getListenerNames() {
    return Object.keys(listeners);
  }

  function messageListener(message) {
      // Anyone can send us a message. Only pay attention to messages from parent.
      if (message.source !== window.parent) return;

      var messageData = message.data;

      if (typeof messageData === 'string') messageData = JSON.parse(messageData);

      // We don't know origin property of parent window until it tells us.
      if (!connected && messageData.type === 'hello') {
        // This is the return handshake from the embedding window.
        parentOrigin = messageData.origin;
        connected = true;
        stopPostingHello();
        while(postMessageQueue.length > 0) {
          post(postMessageQueue.shift());
        }
      }

      // Perhaps-redundantly insist on checking origin as well as source window of message.
      if (message.origin === parentOrigin) {
        if (listeners[messageData.type]) listeners[messageData.type](messageData.content);
      }
   }

   function disconnect() {
     connected = false;
     stopPostingHello();
     window.removeEventListener('message', messsageListener);
   }

  /**
    Initialize communication with the parent frame. This should not be called until the app's custom
    listeners are registered (via our 'addListener' public method) because, once we open the
    communication, the parent window may send any messages it may have queued. Messages for which
    we don't have handlers will be silently ignored.
  */
  function initialize() {
    if (isInitialized) {
      return;
    }
    isInitialized = true;
    if (window.parent === window) return;

    // We kick off communication with the parent window by sending a "hello" message. Then we wait
    // for a handshake (another "hello" message) from the parent window.
    postHello();
    startPostingHello();
    window.addEventListener('message', messageListener, false);
  }

  function startPostingHello() {
    if (helloInterval) {
      stopPostingHello();
    }
    helloInterval = window.setInterval(postHello, HELLO_INTERVAL_LENGTH);
    window.setTimeout(stopPostingHello, HELLO_TIMEOUT_LENGTH);
  }

  function stopPostingHello() {
    window.clearInterval(helloInterval);
    helloInterval = null;
  }

  // Public API.
  return {
    initialize        : initialize,
    getListenerNames  : getListenerNames,
    addListener       : addListener,
    removeAllListeners: removeAllListeners,
    disconnect        : disconnect,
    post              : post
  };
}

var instance = null;

// IFrameEndpoint is a singleton, as iframe can't have multiple parents anyway.
module.exports = function getIFrameEndpoint() {
  if (!instance) {
    instance = new IFrameEndpoint();
  }
  return instance;
};
},{"./structured-clone":4}],2:[function(require,module,exports){
"use strict";

var ParentEndpoint = require('./parent-endpoint');
var getIFrameEndpoint = require('./iframe-endpoint');

// Not a real UUID as there's an RFC for that (needed for proper distributed computing).
// But in this fairly parochial situation, we just need to be fairly sure to avoid repeats.
function getPseudoUUID() {
    var chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    var len = chars.length;
    var ret = [];

    for (var i = 0; i < 10; i++) {
        ret.push(chars[Math.floor(Math.random() * len)]);
    }
    return ret.join('');
}

module.exports = function IframePhoneRpcEndpoint(handler, namespace, targetWindow, targetOrigin) {
    var phone;
    var pendingCallbacks = Object.create({});

    if (targetWindow === window.parent) {
        phone = getIFrameEndpoint();
        phone.initialize();
    } else {
        phone = new ParentEndpoint(targetWindow, targetOrigin);
    }

    phone.addListener(namespace, function(message) {
        var callbackObj;

        if (message.messageType === 'call') {
            handler(message.value, function(returnValue) {
                phone.post(namespace, {
                    messageType: 'returnValue',
                    uuid: message.uuid,
                    value: returnValue
                });
            });
        } else if (message.messageType === 'returnValue') {
            callbackObj = pendingCallbacks[message.uuid];

            if (callbackObj) {
                window.clearTimeout(callbackObj.timeout);
                if (callbackObj.callback) {
                    callbackObj.callback.call(undefined, message.value);
                }
                pendingCallbacks[message.uuid] = null;
            }
        }
    });

    function call(message, callback) {
        var uuid = getPseudoUUID();

        pendingCallbacks[uuid] = {
            callback: callback,
            timeout: window.setTimeout(function() {
                if (callback) {
                    callback(undefined, new Error("IframePhone timed out waiting for reply"));
                }
            }, 2000)
        };

        phone.post(namespace, {
            messageType: 'call',
            uuid: uuid,
            value: message
        });
    }

    function disconnect() {
        phone.disconnect();
    }

    return {
        call: call,
        disconnect: disconnect
    };
};

},{"./iframe-endpoint":1,"./parent-endpoint":3}],3:[function(require,module,exports){
var structuredClone = require('./structured-clone');

/**
  Call as:
    new ParentEndpoint(targetWindow, targetOrigin, afterConnectedCallback)
      targetWindow is a WindowProxy object. (Messages will be sent to it)

      targetOrigin is the origin of the targetWindow. (Messages will be restricted to this origin)

      afterConnectedCallback is an optional callback function to be called when the connection is
        established.

  OR (less secure):
    new ParentEndpoint(targetIframe, afterConnectedCallback)

      targetIframe is a DOM object (HTMLIframeElement); messages will be sent to its contentWindow.

      afterConnectedCallback is an optional callback function

    In this latter case, targetOrigin will be inferred from the value of the src attribute of the
    provided DOM object at the time of the constructor invocation. This is less secure because the
    iframe might have been navigated to an unexpected domain before constructor invocation.

  Note that it is important to specify the expected origin of the iframe's content to safeguard
  against sending messages to an unexpected domain. This might happen if our iframe is navigated to
  a third-party URL unexpectedly. Furthermore, having a reference to Window object (as in the first
  form of the constructor) does not protect against sending a message to the wrong domain. The
  window object is actualy a WindowProxy which transparently proxies the Window object of the
  underlying iframe, so that when the iframe is navigated, the "same" WindowProxy now references a
  completely differeent Window object, possibly controlled by a hostile domain.

  See http://www.esdiscuss.org/topic/a-dom-use-case-that-can-t-be-emulated-with-direct-proxies for
  more about this weird behavior of WindowProxies (the type returned by <iframe>.contentWindow).
*/

module.exports = function ParentEndpoint(targetWindow, targetOrigin, afterConnectedCallback) {
  var selfOrigin = window.location.href.match(/(.*?\/\/.*?)\//)[1];
  var postMessageQueue = [];
  var connected = false;
  var handlers = {};
  var targetWindowIsIframeElement;

  function getOrigin(iframe) {
    return iframe.src.match(/(.*?\/\/.*?)\//)[1];
  }

  function post(type, content) {
    var message;
    // Message object can be constructed from 'type' and 'content' arguments or it can be passed
    // as the first argument.
    if (arguments.length === 1 && typeof type === 'object' && typeof type.type === 'string') {
      message = type;
    } else {
      message = {
        type: type,
        content: content
      };
    }
    if (connected) {
      // if we are laready connected ... send the message
      message.origin = selfOrigin;
      // See http://dev.opera.com/articles/view/window-postmessage-messagechannel/#crossdoc
      //     https://github.com/Modernizr/Modernizr/issues/388
      //     http://jsfiddle.net/ryanseddon/uZTgD/2/
      if (structuredClone.supported()) {
        targetWindow.postMessage(message, targetOrigin);
      } else {
        targetWindow.postMessage(JSON.stringify(message), targetOrigin);
      }
    } else {
      // else queue up the messages to send after connection complete.
      postMessageQueue.push(message);
    }
  }

  function addListener(messageName, func) {
    handlers[messageName] = func;
  }

  function removeListener(messageName) {
    handlers[messageName] = null;
  }

  function receiveMessage(message) {
    var messageData;

    if (message.source === targetWindow && message.origin === targetOrigin) {
      messageData = message.data;
      if (typeof messageData === 'string') {
        messageData = JSON.parse(messageData);
      }
      if (handlers[messageData.type]) {
        handlers[messageData.type](messageData.content);
      } else {
        console.log("cant handle type: " + messageData.type);
      }
    }
  }

  function disconnect() {
    connected = false;
    window.removeEventListener('message', receiveMessage);
  }

  // handle the case that targetWindow is actually an <iframe> rather than a Window(Proxy) object
  // Note that if it *is* a WindowProxy, this probe will throw a SecurityException, but in that case
  // we also don't need to do anything
  try {
    targetWindowIsIframeElement = targetWindow.constructor === HTMLIFrameElement;
  } catch (e) {
    targetWindowIsIframeElement = false;
  }

  if (targetWindowIsIframeElement) {

    // Infer the origin ONLY if the user did not supply an explicit origin, i.e., if the second
    // argument is empty or is actually a callback (meaning it is supposed to be the
    // afterConnectionCallback)
    if ( !targetOrigin || targetOrigin.constructor === Function) {
      afterConnectedCallback = targetOrigin;
      targetOrigin = getOrigin(targetWindow);
    }

    targetWindow = targetWindow.contentWindow;
  }

  // when we receive 'hello':
  addListener('hello', function() {
    connected = true;

    // send hello response
    post('hello');

    // give the user a chance to do things now that we are connected
    // note that is will happen before any queued messages
    if (afterConnectedCallback && typeof afterConnectedCallback === "function") {
      afterConnectedCallback();
    }

    // Now send any messages that have been queued up ...
    while(postMessageQueue.length > 0) {
      post(postMessageQueue.shift());
    }
  });

  window.addEventListener('message', receiveMessage, false);

  // Public API.
  return {
    post: post,
    addListener: addListener,
    removeListener: removeListener,
    disconnect: disconnect
  };
};

},{"./structured-clone":4}],4:[function(require,module,exports){
var featureSupported = false;

(function () {
  var result = 0;

  if (!!window.postMessage) {
    try {
      // Safari 5.1 will sometimes throw an exception and sometimes won't, lolwut?
      // When it doesn't we capture the message event and check the
      // internal [[Class]] property of the message being passed through.
      // Safari will pass through DOM nodes as Null iOS safari on the other hand
      // passes it through as DOMWindow, gotcha.
      window.onmessage = function(e){
        var type = Object.prototype.toString.call(e.data);
        result = (type.indexOf("Null") != -1 || type.indexOf("DOMWindow") != -1) ? 1 : 0;
        featureSupported = {
          'structuredClones': result
        };
      };
      // Spec states you can't transmit DOM nodes and it will throw an error
      // postMessage implimentations that support cloned data will throw.
      window.postMessage(document.createElement("a"),"*");
    } catch(e) {
      // BBOS6 throws but doesn't pass through the correct exception
      // so check error message
      result = (e.DATA_CLONE_ERR || e.message == "Cannot post cyclic structures.") ? 1 : 0;
      featureSupported = {
        'structuredClones': result
      };
    }
  }
}());

exports.supported = function supported() {
  return featureSupported && featureSupported.structuredClones > 0;
};

},{}],5:[function(require,module,exports){
module.exports = {
  /**
   * Allows to communicate with an iframe.
   */
  ParentEndpoint:  require('./lib/parent-endpoint'),
  /**
   * Allows to communicate with a parent page.
   * IFrameEndpoint is a singleton, as iframe can't have multiple parents anyway.
   */
  getIFrameEndpoint: require('./lib/iframe-endpoint'),
  structuredClone: require('./lib/structured-clone'),

  // TODO: May be misnamed
  IframePhoneRpcEndpoint: require('./lib/iframe-phone-rpc-endpoint')

};

},{"./lib/iframe-endpoint":1,"./lib/iframe-phone-rpc-endpoint":2,"./lib/parent-endpoint":3,"./lib/structured-clone":4}]},{},[5])
(5)
});
;