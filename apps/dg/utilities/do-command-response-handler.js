// this code is shared between the embedded server in main.js and the data interactive server in game_controller.js

DG.doCommandResponseHandler = function (ret, callback) {
  // Analysis shows that the object returned by DG.doCommand may contain Error values, which
  // are not serializable and thus will cause DataCloneErrors when we call 'callback' (which
  // sends the 'ret' to the game window via postMessage). The 'requestFormulaValue' and
  // 'requestAttributeValues' API commands are the guilty parties. The following is an
  // ad-hoc attempt to clean up the object for successful serialization.

  if (ret && ret.error && ret.error instanceof Error) {
    ret.error = ret.error.message;
  }

  if (ret && ret.values && ret.values.length) {
    ret.values = ret.values.map(function (value) {
      return value instanceof Error ? null : value;
    });
  }

  // If there's a DataCloneError anyway, at least let the client know something is wrong:
  try {
    callback(ret);
  } catch (e) {
    if (e instanceof window.DOMException && e.name === 'DataCloneError') {
      callback({success: false});
    }
  }
};