/*global require:true, process:true */
var util = require("util");
var fs   = require("fs");
//var path = require("path");

function main(args) {
/*
  function printArgs(args) {
    args.forEach(function(arg) {
      util.error(arg);
    });
  }
*/

  function abort(message) {
    util.error(message);
    process.exit(1);
  }

  function readStream(inputStream, callback) {
    var input = "";
    inputStream.on("data", function(data) { input += data; });
    inputStream.on("end", function() { callback(input); });
  }

  function readFile(fn, callback) {
    var inS = fs.createReadStream(fn);
    inS.on("error", function() {
      abort("Can't read from file \"" + fn + "\".");
    });
    readStream(inS, callback);
  }

  var obj, fileList = args, idMap, highestID = 0;

  function merge(obj1, obj2) {
    if (obj2 === undefined) {
      return;
    }
    if (Array.isArray(obj1)) {
      if (Array.isArray(obj2)) {
        obj2.forEach(function (element) {
          obj1.push(element);
        });
      } else {
        obj1.push(obj2);
      }
    } else {
      var key;
      for (key in obj2) {
        if (obj2.hasOwnProperty(key)) {
          if (obj1[key]) {
            if (typeof obj1 === 'object') {
              merge(obj1[key], obj2[key]);
            }
          } else {
            obj1[key] = obj2[key];
          }
        }
      }
    }
  }
  function findHighestID (obj) {
    var key;
    if (Array.isArray(obj)) {
      obj.forEach(function(element) {
        findHighestID(element);
      });
    } else if (typeof obj === 'object') {
      for (key in obj) {
        if (obj.hasOwnProperty(key)) {
          if (key === 'guid') {
            if (obj[key] && typeof obj[key] === 'number') {
              highestID = Math.max(highestID, obj[key]);
            } else {
              abort('Unset or non-numeric guid: ' + obj[key]);
            }
          } else {
            findHighestID(obj[key]);
          }
        }
      }
    }
  }
  function remapIDs (obj) {
    var key;
    if (Array.isArray(obj)) {
      obj.forEach(function(element) {
        remapIDs(element);
      });
    } else if (typeof obj === 'object') {
      for (key in obj) {
        if (obj.hasOwnProperty(key)) {
          if (key === 'guid') {
            highestID++;
            idMap[obj[key]] = highestID;
            obj[key] = highestID;
          } else {
            remapIDs(obj[key]);
          }
        }
      }
    }
  }
  function rereferenceIDs (obj) {
    var key;
    if (Array.isArray(obj)) {
      obj.forEach(function(element) {
        rereferenceIDs(element);
      });
    } else if (typeof obj === 'object') {
      for (key in obj) {
        if (obj.hasOwnProperty(key)) {
          if (key === 'id' || key === 'parent') {
            obj[key] = idMap[obj[key]];
          } else {
            rereferenceIDs(obj[key]);
          }
        }
      }
    }
  }
  function assembleObj(buf) {
    var fn = fileList.splice(0, 1)[0], newObj;
//    if (fn) { util.error('reading ' + fn); }
    if (buf) {
      newObj = JSON.parse(buf);
      if (!obj) {
        obj = newObj;
        findHighestID(obj);
      } else {
        idMap = {};
        remapIDs(newObj);
        rereferenceIDs(newObj);
        merge(obj, newObj);
      }
    }
    if (fn) {
      readFile(fn, assembleObj);
    } else {
      util.puts(JSON.stringify(obj, null, '  '));
    }
  }
//  var outputStream = process.stdout;
//  printArgs(args);
//  args.forEach(function(arg) {
//    var objs = [];
//    readFile(arg, function (buf) {
//      objs.push(JSON.parse(buf));
//    });
//    util.puts('objs: ' + objs.length);
//  });
  assembleObj();

}
main(process.argv.slice(2));
