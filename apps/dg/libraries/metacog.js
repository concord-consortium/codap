// AWS SDK for JavaScript v2.0.0-rc11
// Copyright 2012-2014 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// License at https://sdk.amazonaws.com/js/BUNDLE_LICENSE.txt
(function e(t,r,n){function i(a,o){if(!r[a]){if(!t[a]){var u=typeof require=="function"&&require;if(!o&&u)return u(a,!0);if(s)return s(a,!0);throw new Error("Cannot find module '"+a+"'")}var f=r[a]={exports:{}};t[a][0].call(f.exports,function(e){var r=t[a][1][e];return i(r?r:e)},f,f.exports,e,t,r,n)}return r[a].exports}var s=typeof require=="function"&&require;for(var a=0;a<n.length;a++)i(n[a]);return i})({1:[function(e,t,r){},{}],2:[function(e,t,r){var n=e("base64-js");var i=e("ieee754");r.Buffer=s;r.SlowBuffer=s;r.INSPECT_MAX_BYTES=50;s.poolSize=8192;s._useTypedArrays=function(){if(typeof Uint8Array!=="function"||typeof ArrayBuffer!=="function")return false;try{var e=new Uint8Array(0);e.foo=function(){return 42};return 42===e.foo()&&typeof e.subarray==="function"}catch(t){return false}}();function s(e,t,r){if(!(this instanceof s))return new s(e,t,r);var n=typeof e;if(t==="base64"&&n==="string"){e=L(e);while(e.length%4!==0){e=e+"="}}var i;if(n==="number")i=O(e);else if(n==="string")i=s.byteLength(e,t);else if(n==="object")i=O(e.length);else throw new Error("First argument needs to be a number, array or string.");var a;if(s._useTypedArrays){a=q(new Uint8Array(i))}else{a=this;a.length=i;a._isBuffer=true}var o;if(s._useTypedArrays&&typeof Uint8Array==="function"&&e instanceof Uint8Array){a._set(e)}else if(P(e)){for(o=0;o<i;o++){if(s.isBuffer(e))a[o]=e.readUInt8(o);else a[o]=e[o]}}else if(n==="string"){a.write(e,0,t)}else if(n==="number"&&!s._useTypedArrays&&!r){for(o=0;o<i;o++){a[o]=0}}return a}s.isEncoding=function(e){switch(String(e).toLowerCase()){case"hex":case"utf8":case"utf-8":case"ascii":case"binary":case"base64":case"raw":case"ucs2":case"ucs-2":case"utf16le":case"utf-16le":return true;default:return false}};s.isBuffer=function(e){return!!(e!==null&&e!==undefined&&e._isBuffer)};s.byteLength=function(e,t){var r;e=e+"";switch(t||"utf8"){case"hex":r=e.length/2;break;case"utf8":case"utf-8":r=M(e).length;break;case"ascii":case"binary":case"raw":r=e.length;break;case"base64":r=F(e).length;break;case"ucs2":case"ucs-2":case"utf16le":case"utf-16le":r=e.length*2;break;default:throw new Error("Unknown encoding")}return r};s.concat=function(e,t){G(j(e),"Usage: Buffer.concat(list, [totalLength])\n"+"list should be an Array.");if(e.length===0){return new s(0)}else if(e.length===1){return e[0]}var r;if(typeof t!=="number"){t=0;for(r=0;r<e.length;r++){t+=e[r].length}}var n=new s(t);var i=0;for(r=0;r<e.length;r++){var a=e[r];a.copy(n,i);i+=a.length}return n};function a(e,t,r,n){r=Number(r)||0;var i=e.length-r;if(!n){n=i}else{n=Number(n);if(n>i){n=i}}var a=t.length;G(a%2===0,"Invalid hex string");if(n>a/2){n=a/2}for(var o=0;o<n;o++){var u=parseInt(t.substr(o*2,2),16);G(!isNaN(u),"Invalid hex string");e[r+o]=u}s._charsWritten=o*2;return o}function o(e,t,r,n){var i=s._charsWritten=H(M(t),e,r,n);return i}function u(e,t,r,n){var i=s._charsWritten=H(B(t),e,r,n);return i}function f(e,t,r,n){return u(e,t,r,n)}function c(e,t,r,n){var i=s._charsWritten=H(F(t),e,r,n);return i}function l(e,t,r,n){var i=s._charsWritten=H(U(t),e,r,n);return i}s.prototype.write=function(e,t,r,n){if(isFinite(t)){if(!isFinite(r)){n=r;r=undefined}}else{var i=n;n=t;t=r;r=i}t=Number(t)||0;var s=this.length-t;if(!r){r=s}else{r=Number(r);if(r>s){r=s}}n=String(n||"utf8").toLowerCase();var h;switch(n){case"hex":h=a(this,e,t,r);break;case"utf8":case"utf-8":h=o(this,e,t,r);break;case"ascii":h=u(this,e,t,r);break;case"binary":h=f(this,e,t,r);break;case"base64":h=c(this,e,t,r);break;case"ucs2":case"ucs-2":case"utf16le":case"utf-16le":h=l(this,e,t,r);break;default:throw new Error("Unknown encoding")}return h};s.prototype.toString=function(e,t,r){var n=this;e=String(e||"utf8").toLowerCase();t=Number(t)||0;r=r!==undefined?Number(r):r=n.length;if(r===t)return"";var i;switch(e){case"hex":i=v(n,t,r);break;case"utf8":case"utf-8":i=p(n,t,r);break;case"ascii":i=d(n,t,r);break;case"binary":i=m(n,t,r);break;case"base64":i=h(n,t,r);break;case"ucs2":case"ucs-2":case"utf16le":case"utf-16le":i=g(n,t,r);break;default:throw new Error("Unknown encoding")}return i};s.prototype.toJSON=function(){return{type:"Buffer",data:Array.prototype.slice.call(this._arr||this,0)}};s.prototype.copy=function(e,t,r,n){var i=this;if(!r)r=0;if(!n&&n!==0)n=this.length;if(!t)t=0;if(n===r)return;if(e.length===0||i.length===0)return;G(n>=r,"sourceEnd < sourceStart");G(t>=0&&t<e.length,"targetStart out of bounds");G(r>=0&&r<i.length,"sourceStart out of bounds");G(n>=0&&n<=i.length,"sourceEnd out of bounds");if(n>this.length)n=this.length;if(e.length-t<n-r)n=e.length-t+r;for(var s=0;s<n-r;s++)e[s+t]=this[s+r]};function h(e,t,r){if(t===0&&r===e.length){return n.fromByteArray(e)}else{return n.fromByteArray(e.slice(t,r))}}function p(e,t,r){var n="";var i="";r=Math.min(e.length,r);for(var s=t;s<r;s++){if(e[s]<=127){n+=V(i)+String.fromCharCode(e[s]);i=""}else{i+="%"+e[s].toString(16)}}return n+V(i)}function d(e,t,r){var n="";r=Math.min(e.length,r);for(var i=t;i<r;i++)n+=String.fromCharCode(e[i]);return n}function m(e,t,r){return d(e,t,r)}function v(e,t,r){var n=e.length;if(!t||t<0)t=0;if(!r||r<0||r>n)r=n;var i="";for(var s=t;s<r;s++){i+=k(e[s])}return i}function g(e,t,r){var n=e.slice(t,r);var i="";for(var s=0;s<n.length;s+=2){i+=String.fromCharCode(n[s]+n[s+1]*256)}return i}s.prototype.slice=function(e,t){var r=this.length;e=D(e,r,0);t=D(t,r,r);if(s._useTypedArrays){return q(this.subarray(e,t))}else{var n=t-e;var i=new s(n,undefined,true);for(var a=0;a<n;a++){i[a]=this[a+e]}return i}};s.prototype.get=function(e){console.log(".get() is deprecated. Access using array indexes instead.");return this.readUInt8(e)};s.prototype.set=function(e,t){console.log(".set() is deprecated. Access using array indexes instead.");return this.writeUInt8(e,t)};s.prototype.readUInt8=function(e,t){if(!t){G(e!==undefined&&e!==null,"missing offset");G(e<this.length,"Trying to read beyond buffer length")}if(e>=this.length)return;return this[e]};function y(e,t,r,n){if(!n){G(typeof r==="boolean","missing or invalid endian");G(t!==undefined&&t!==null,"missing offset");G(t+1<e.length,"Trying to read beyond buffer length")}var i=e.length;if(t>=i)return;var s;if(r){s=e[t];if(t+1<i)s|=e[t+1]<<8}else{s=e[t]<<8;if(t+1<i)s|=e[t+1]}return s}s.prototype.readUInt16LE=function(e,t){return y(this,e,true,t)};s.prototype.readUInt16BE=function(e,t){return y(this,e,false,t)};function b(e,t,r,n){if(!n){G(typeof r==="boolean","missing or invalid endian");G(t!==undefined&&t!==null,"missing offset");G(t+3<e.length,"Trying to read beyond buffer length")}var i=e.length;if(t>=i)return;var s;if(r){if(t+2<i)s=e[t+2]<<16;if(t+1<i)s|=e[t+1]<<8;s|=e[t];if(t+3<i)s=s+(e[t+3]<<24>>>0)}else{if(t+1<i)s=e[t+1]<<16;if(t+2<i)s|=e[t+2]<<8;if(t+3<i)s|=e[t+3];s=s+(e[t]<<24>>>0)}return s}s.prototype.readUInt32LE=function(e,t){return b(this,e,true,t)};s.prototype.readUInt32BE=function(e,t){return b(this,e,false,t)};s.prototype.readInt8=function(e,t){if(!t){G(e!==undefined&&e!==null,"missing offset");G(e<this.length,"Trying to read beyond buffer length")}if(e>=this.length)return;var r=this[e]&128;if(r)return(255-this[e]+1)*-1;else return this[e]};function w(e,t,r,n){if(!n){G(typeof r==="boolean","missing or invalid endian");G(t!==undefined&&t!==null,"missing offset");G(t+1<e.length,"Trying to read beyond buffer length")}var i=e.length;if(t>=i)return;var s=y(e,t,r,true);var a=s&32768;if(a)return(65535-s+1)*-1;else return s}s.prototype.readInt16LE=function(e,t){return w(this,e,true,t)};s.prototype.readInt16BE=function(e,t){return w(this,e,false,t)};function E(e,t,r,n){if(!n){G(typeof r==="boolean","missing or invalid endian");G(t!==undefined&&t!==null,"missing offset");G(t+3<e.length,"Trying to read beyond buffer length")}var i=e.length;if(t>=i)return;var s=b(e,t,r,true);var a=s&2147483648;if(a)return(4294967295-s+1)*-1;else return s}s.prototype.readInt32LE=function(e,t){return E(this,e,true,t)};s.prototype.readInt32BE=function(e,t){return E(this,e,false,t)};function S(e,t,r,n){if(!n){G(typeof r==="boolean","missing or invalid endian");G(t+3<e.length,"Trying to read beyond buffer length")}return i.read(e,t,r,23,4)}s.prototype.readFloatLE=function(e,t){return S(this,e,true,t)};s.prototype.readFloatBE=function(e,t){return S(this,e,false,t)};function _(e,t,r,n){if(!n){G(typeof r==="boolean","missing or invalid endian");G(t+7<e.length,"Trying to read beyond buffer length")}return i.read(e,t,r,52,8)}s.prototype.readDoubleLE=function(e,t){return _(this,e,true,t)};s.prototype.readDoubleBE=function(e,t){return _(this,e,false,t)};s.prototype.writeUInt8=function(e,t,r){if(!r){G(e!==undefined&&e!==null,"missing value");G(t!==undefined&&t!==null,"missing offset");G(t<this.length,"trying to write beyond buffer length");z(e,255)}if(t>=this.length)return;this[t]=e};function T(e,t,r,n,i){if(!i){G(t!==undefined&&t!==null,"missing value");G(typeof n==="boolean","missing or invalid endian");G(r!==undefined&&r!==null,"missing offset");G(r+1<e.length,"trying to write beyond buffer length");z(t,65535)}var s=e.length;if(r>=s)return;for(var a=0,o=Math.min(s-r,2);a<o;a++){e[r+a]=(t&255<<8*(n?a:1-a))>>>(n?a:1-a)*8}}s.prototype.writeUInt16LE=function(e,t,r){T(this,e,t,true,r)};s.prototype.writeUInt16BE=function(e,t,r){T(this,e,t,false,r)};function A(e,t,r,n,i){if(!i){G(t!==undefined&&t!==null,"missing value");G(typeof n==="boolean","missing or invalid endian");G(r!==undefined&&r!==null,"missing offset");G(r+3<e.length,"trying to write beyond buffer length");z(t,4294967295)}var s=e.length;if(r>=s)return;for(var a=0,o=Math.min(s-r,4);a<o;a++){e[r+a]=t>>>(n?a:3-a)*8&255}}s.prototype.writeUInt32LE=function(e,t,r){A(this,e,t,true,r)};s.prototype.writeUInt32BE=function(e,t,r){A(this,e,t,false,r)};s.prototype.writeInt8=function(e,t,r){if(!r){G(e!==undefined&&e!==null,"missing value");G(t!==undefined&&t!==null,"missing offset");G(t<this.length,"Trying to write beyond buffer length");X(e,127,-128)}if(t>=this.length)return;if(e>=0)this.writeUInt8(e,t,r);else this.writeUInt8(255+e+1,t,r)};function x(e,t,r,n,i){if(!i){G(t!==undefined&&t!==null,"missing value");G(typeof n==="boolean","missing or invalid endian");G(r!==undefined&&r!==null,"missing offset");G(r+1<e.length,"Trying to write beyond buffer length");X(t,32767,-32768)}var s=e.length;if(r>=s)return;if(t>=0)T(e,t,r,n,i);else T(e,65535+t+1,r,n,i)}s.prototype.writeInt16LE=function(e,t,r){x(this,e,t,true,r)};s.prototype.writeInt16BE=function(e,t,r){x(this,e,t,false,r)};function R(e,t,r,n,i){if(!i){G(t!==undefined&&t!==null,"missing value");G(typeof n==="boolean","missing or invalid endian");G(r!==undefined&&r!==null,"missing offset");G(r+3<e.length,"Trying to write beyond buffer length");X(t,2147483647,-2147483648)}var s=e.length;if(r>=s)return;if(t>=0)A(e,t,r,n,i);else A(e,4294967295+t+1,r,n,i)}s.prototype.writeInt32LE=function(e,t,r){R(this,e,t,true,r)};s.prototype.writeInt32BE=function(e,t,r){R(this,e,t,false,r)};function C(e,t,r,n,s){if(!s){G(t!==undefined&&t!==null,"missing value");G(typeof n==="boolean","missing or invalid endian");G(r!==undefined&&r!==null,"missing offset");G(r+3<e.length,"Trying to write beyond buffer length");W(t,3.4028234663852886e38,-3.4028234663852886e38)}var a=e.length;if(r>=a)return;i.write(e,t,r,n,23,4)}s.prototype.writeFloatLE=function(e,t,r){C(this,e,t,true,r)};s.prototype.writeFloatBE=function(e,t,r){C(this,e,t,false,r)};function I(e,t,r,n,s){if(!s){G(t!==undefined&&t!==null,"missing value");G(typeof n==="boolean","missing or invalid endian");G(r!==undefined&&r!==null,"missing offset");G(r+7<e.length,"Trying to write beyond buffer length");W(t,1.7976931348623157e308,-1.7976931348623157e308)}var a=e.length;if(r>=a)return;i.write(e,t,r,n,52,8)}s.prototype.writeDoubleLE=function(e,t,r){I(this,e,t,true,r)};s.prototype.writeDoubleBE=function(e,t,r){I(this,e,t,false,r)};s.prototype.fill=function(e,t,r){if(!e)e=0;if(!t)t=0;if(!r)r=this.length;if(typeof e==="string"){e=e.charCodeAt(0)}G(typeof e==="number"&&!isNaN(e),"value is not a number");G(r>=t,"end < start");if(r===t)return;if(this.length===0)return;G(t>=0&&t<this.length,"start out of bounds");G(r>=0&&r<=this.length,"end out of bounds");for(var n=t;n<r;n++){this[n]=e}};s.prototype.inspect=function(){var e=[];var t=this.length;for(var n=0;n<t;n++){e[n]=k(this[n]);if(n===r.INSPECT_MAX_BYTES){e[n+1]="...";break}}return"<Buffer "+e.join(" ")+">"};s.prototype.toArrayBuffer=function(){if(typeof Uint8Array==="function"){if(s._useTypedArrays){return new s(this).buffer}else{var e=new Uint8Array(this.length);for(var t=0,r=e.length;t<r;t+=1)e[t]=this[t];return e.buffer}}else{throw new Error("Buffer.toArrayBuffer not supported in this browser")}};function L(e){if(e.trim)return e.trim();return e.replace(/^\s+|\s+$/g,"")}var N=s.prototype;function q(e){e._isBuffer=true;e._get=e.get;e._set=e.set;e.get=N.get;e.set=N.set;e.write=N.write;e.toString=N.toString;e.toLocaleString=N.toString;e.toJSON=N.toJSON;e.copy=N.copy;e.slice=N.slice;e.readUInt8=N.readUInt8;e.readUInt16LE=N.readUInt16LE;e.readUInt16BE=N.readUInt16BE;e.readUInt32LE=N.readUInt32LE;e.readUInt32BE=N.readUInt32BE;e.readInt8=N.readInt8;e.readInt16LE=N.readInt16LE;e.readInt16BE=N.readInt16BE;e.readInt32LE=N.readInt32LE;e.readInt32BE=N.readInt32BE;e.readFloatLE=N.readFloatLE;e.readFloatBE=N.readFloatBE;e.readDoubleLE=N.readDoubleLE;e.readDoubleBE=N.readDoubleBE;e.writeUInt8=N.writeUInt8;e.writeUInt16LE=N.writeUInt16LE;e.writeUInt16BE=N.writeUInt16BE;e.writeUInt32LE=N.writeUInt32LE;e.writeUInt32BE=N.writeUInt32BE;e.writeInt8=N.writeInt8;e.writeInt16LE=N.writeInt16LE;e.writeInt16BE=N.writeInt16BE;e.writeInt32LE=N.writeInt32LE;e.writeInt32BE=N.writeInt32BE;e.writeFloatLE=N.writeFloatLE;e.writeFloatBE=N.writeFloatBE;e.writeDoubleLE=N.writeDoubleLE;e.writeDoubleBE=N.writeDoubleBE;e.fill=N.fill;e.inspect=N.inspect;e.toArrayBuffer=N.toArrayBuffer;return e}function D(e,t,r){if(typeof e!=="number")return r;e=~~e;if(e>=t)return t;if(e>=0)return e;e+=t;if(e>=0)return e;return 0}function O(e){e=~~Math.ceil(+e);return e<0?0:e}function j(e){return(Array.isArray||function(e){return Object.prototype.toString.call(e)==="[object Array]"})(e)}function P(e){return j(e)||s.isBuffer(e)||e&&typeof e==="object"&&typeof e.length==="number"}function k(e){if(e<16)return"0"+e.toString(16);return e.toString(16)}function M(e){var t=[];for(var r=0;r<e.length;r++){var n=e.charCodeAt(r);if(n<=127)t.push(e.charCodeAt(r));else{var i=r;if(n>=55296&&n<=57343)r++;var s=encodeURIComponent(e.slice(i,r+1)).substr(1).split("%");for(var a=0;a<s.length;a++)t.push(parseInt(s[a],16))}}return t}function B(e){var t=[];for(var r=0;r<e.length;r++){t.push(e.charCodeAt(r)&255)}return t}function U(e){var t,r,n;var i=[];for(var s=0;s<e.length;s++){t=e.charCodeAt(s);r=t>>8;n=t%256;i.push(n);i.push(r)}return i}function F(e){return n.toByteArray(e)}function H(e,t,r,n){var i;for(var s=0;s<n;s++){if(s+r>=t.length||s>=e.length)break;t[s+r]=e[s]}return s}function V(e){try{return decodeURIComponent(e)}catch(t){return String.fromCharCode(65533)}}function z(e,t){G(typeof e==="number","cannot write a non-number as a number");G(e>=0,"specified a negative value for writing an unsigned value");G(e<=t,"value is larger than maximum value for type");G(Math.floor(e)===e,"value has a fractional component")}function X(e,t,r){G(typeof e==="number","cannot write a non-number as a number");G(e<=t,"value larger than maximum allowed value");G(e>=r,"value smaller than minimum allowed value");G(Math.floor(e)===e,"value has a fractional component")}function W(e,t,r){G(typeof e==="number","cannot write a non-number as a number");G(e<=t,"value larger than maximum allowed value");G(e>=r,"value smaller than minimum allowed value")}function G(e,t){if(!e)throw new Error(t||"Failed assertion")}},{"base64-js":3,ieee754:4}],3:[function(e,t,r){var n="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";(function(e){"use strict";var r=typeof Uint8Array!=="undefined"?Uint8Array:Array;var i="0".charCodeAt(0);var s="+".charCodeAt(0);var a="/".charCodeAt(0);var o="0".charCodeAt(0);var u="a".charCodeAt(0);var f="A".charCodeAt(0);function c(e){var t=e.charCodeAt(0);if(t===s)return 62;if(t===a)return 63;if(t<o)return-1;if(t<o+10)return t-o+26+26;if(t<f+26)return t-f;if(t<u+26)return t-u+26}function l(e){var t,n,i,s,a,o;if(e.length%4>0){throw new Error("Invalid string. Length must be a multiple of 4")}var u=e.length;a="="===e.charAt(u-2)?2:"="===e.charAt(u-1)?1:0;o=new r(e.length*3/4-a);i=a>0?e.length-4:e.length;var f=0;function l(e){o[f++]=e}for(t=0,n=0;t<i;t+=4,n+=3){s=c(e.charAt(t))<<18|c(e.charAt(t+1))<<12|c(e.charAt(t+2))<<6|c(e.charAt(t+3));l((s&16711680)>>16);l((s&65280)>>8);l(s&255)}if(a===2){s=c(e.charAt(t))<<2|c(e.charAt(t+1))>>4;l(s&255)}else if(a===1){s=c(e.charAt(t))<<10|c(e.charAt(t+1))<<4|c(e.charAt(t+2))>>2;l(s>>8&255);l(s&255)}return o}function h(e){var t,r=e.length%3,i="",s,a;function o(e){return n.charAt(e)}function u(e){return o(e>>18&63)+o(e>>12&63)+o(e>>6&63)+o(e&63)}for(t=0,a=e.length-r;t<a;t+=3){s=(e[t]<<16)+(e[t+1]<<8)+e[t+2];i+=u(s)}switch(r){case 1:s=e[e.length-1];i+=o(s>>2);i+=o(s<<4&63);i+="==";break;case 2:s=(e[e.length-2]<<8)+e[e.length-1];i+=o(s>>10);i+=o(s>>4&63);i+=o(s<<2&63);i+="=";break}return i}t.exports.toByteArray=l;t.exports.fromByteArray=h})()},{}],4:[function(e,t,r){r.read=function(e,t,r,n,i){var s,a,o=i*8-n-1,u=(1<<o)-1,f=u>>1,c=-7,l=r?i-1:0,h=r?-1:1,p=e[t+l];l+=h;s=p&(1<<-c)-1;p>>=-c;c+=o;for(;c>0;s=s*256+e[t+l],l+=h,c-=8);a=s&(1<<-c)-1;s>>=-c;c+=n;for(;c>0;a=a*256+e[t+l],l+=h,c-=8);if(s===0){s=1-f}else if(s===u){return a?NaN:(p?-1:1)*Infinity}else{a=a+Math.pow(2,n);s=s-f}return(p?-1:1)*a*Math.pow(2,s-n)};r.write=function(e,t,r,n,i,s){var a,o,u,f=s*8-i-1,c=(1<<f)-1,l=c>>1,h=i===23?Math.pow(2,-24)-Math.pow(2,-77):0,p=n?0:s-1,d=n?1:-1,m=t<0||t===0&&1/t<0?1:0;t=Math.abs(t);if(isNaN(t)||t===Infinity){o=isNaN(t)?1:0;a=c}else{a=Math.floor(Math.log(t)/Math.LN2);if(t*(u=Math.pow(2,-a))<1){a--;u*=2}if(a+l>=1){t+=h/u}else{t+=h*Math.pow(2,1-l)}if(t*u>=2){a++;u/=2}if(a+l>=c){o=0;a=c}else if(a+l>=1){o=(t*u-1)*Math.pow(2,i);a=a+l}else{o=t*Math.pow(2,l-1)*Math.pow(2,i);a=0}}for(;i>=8;e[r+p]=o&255,p+=d,o/=256,i-=8);a=a<<i|o;f+=i;for(;f>0;e[r+p]=a&255,p+=d,a/=256,f-=8);e[r+p-d]|=m*128}},{}],5:[function(e,t,r){var n=e("buffer").Buffer;var i=4;var s=new n(i);s.fill(0);var a=8;function o(e,t){if(e.length%i!==0){var r=e.length+(i-e.length%i);e=n.concat([e,s],r)}var a=[];var o=t?e.readInt32BE:e.readInt32LE;for(var u=0;u<e.length;u+=i){a.push(o.call(e,u))}return a}function u(e,t,r){var i=new n(t);var s=r?i.writeInt32BE:i.writeInt32LE;for(var a=0;a<e.length;a++){s.call(i,e[a],a*4,true)}return i}function f(e,t,r,i){if(!n.isBuffer(e))e=new n(e);var s=t(o(e,i),e.length*a);return u(s,r,i)}t.exports={hash:f}},{buffer:2}],6:[function(e,t,r){var n=e("buffer").Buffer;var i=e("./sha");var s=e("./sha256");var a=e("./rng");var o=e("./md5");var u={sha1:i,sha256:s,md5:o};var f=64;var c=new n(f);c.fill(0);function l(e,t,r){if(!n.isBuffer(t))t=new n(t);if(!n.isBuffer(r))r=new n(r);if(t.length>f){t=e(t)}else if(t.length<f){t=n.concat([t,c],f)}var i=new n(f),s=new n(f);for(var a=0;a<f;a++){i[a]=t[a]^54;s[a]=t[a]^92}var o=e(n.concat([i,r]));return e(n.concat([s,o]))}function h(e,t){e=e||"sha1";var r=u[e];var i=[];var s=0;if(!r)p("algorithm:",e,"is not yet supported");return{update:function(e){if(!n.isBuffer(e))e=new n(e);i.push(e);s+=e.length;return this},digest:function(e){var s=n.concat(i);var a=t?l(r,t,s):r(s);i=null;return e?a.toString(e):a}}}function p(){var e=[].slice.call(arguments).join(" ");throw new Error([e,"we accept pull requests","http://github.com/dominictarr/crypto-browserify"].join("\n"))}r.createHash=function(e){return h(e)};r.createHmac=function(e,t){return h(e,t)};r.randomBytes=function(e,t){if(t&&t.call){try{t.call(this,undefined,new n(a(e)))}catch(r){t(r)}}else{return new n(a(e))}};function d(e,t){for(var r in e)t(e[r],r)}d(["createCredentials","createCipher","createCipheriv","createDecipher","createDecipheriv","createSign","createVerify","createDiffieHellman","pbkdf2"],function(e){r[e]=function(){p("sorry,",e,"is not implemented yet")}})},{"./md5":7,"./rng":8,"./sha":9,"./sha256":10,buffer:2}],7:[function(e,t,r){var n=e("./helpers");function i(){return hex_md5("abc")=="900150983cd24fb0d6963f7d28e17f72"}function s(e,t){e[t>>5]|=128<<t%32;e[(t+64>>>9<<4)+14]=t;var r=1732584193;var n=-271733879;var i=-1732584194;var s=271733878;for(var a=0;a<e.length;a+=16){var h=r;var p=n;var d=i;var m=s;r=o(r,n,i,s,e[a+0],7,-680876936);s=o(s,r,n,i,e[a+1],12,-389564586);i=o(i,s,r,n,e[a+2],17,606105819);n=o(n,i,s,r,e[a+3],22,-1044525330);r=o(r,n,i,s,e[a+4],7,-176418897);s=o(s,r,n,i,e[a+5],12,1200080426);i=o(i,s,r,n,e[a+6],17,-1473231341);n=o(n,i,s,r,e[a+7],22,-45705983);r=o(r,n,i,s,e[a+8],7,1770035416);s=o(s,r,n,i,e[a+9],12,-1958414417);i=o(i,s,r,n,e[a+10],17,-42063);n=o(n,i,s,r,e[a+11],22,-1990404162);r=o(r,n,i,s,e[a+12],7,1804603682);s=o(s,r,n,i,e[a+13],12,-40341101);i=o(i,s,r,n,e[a+14],17,-1502002290);n=o(n,i,s,r,e[a+15],22,1236535329);r=u(r,n,i,s,e[a+1],5,-165796510);s=u(s,r,n,i,e[a+6],9,-1069501632);i=u(i,s,r,n,e[a+11],14,643717713);n=u(n,i,s,r,e[a+0],20,-373897302);r=u(r,n,i,s,e[a+5],5,-701558691);s=u(s,r,n,i,e[a+10],9,38016083);i=u(i,s,r,n,e[a+15],14,-660478335);n=u(n,i,s,r,e[a+4],20,-405537848);r=u(r,n,i,s,e[a+9],5,568446438);s=u(s,r,n,i,e[a+14],9,-1019803690);i=u(i,s,r,n,e[a+3],14,-187363961);n=u(n,i,s,r,e[a+8],20,1163531501);r=u(r,n,i,s,e[a+13],5,-1444681467);s=u(s,r,n,i,e[a+2],9,-51403784);i=u(i,s,r,n,e[a+7],14,1735328473);n=u(n,i,s,r,e[a+12],20,-1926607734);r=f(r,n,i,s,e[a+5],4,-378558);s=f(s,r,n,i,e[a+8],11,-2022574463);i=f(i,s,r,n,e[a+11],16,1839030562);n=f(n,i,s,r,e[a+14],23,-35309556);r=f(r,n,i,s,e[a+1],4,-1530992060);s=f(s,r,n,i,e[a+4],11,1272893353);i=f(i,s,r,n,e[a+7],16,-155497632);n=f(n,i,s,r,e[a+10],23,-1094730640);r=f(r,n,i,s,e[a+13],4,681279174);s=f(s,r,n,i,e[a+0],11,-358537222);i=f(i,s,r,n,e[a+3],16,-722521979);n=f(n,i,s,r,e[a+6],23,76029189);r=f(r,n,i,s,e[a+9],4,-640364487);s=f(s,r,n,i,e[a+12],11,-421815835);i=f(i,s,r,n,e[a+15],16,530742520);n=f(n,i,s,r,e[a+2],23,-995338651);r=c(r,n,i,s,e[a+0],6,-198630844);s=c(s,r,n,i,e[a+7],10,1126891415);i=c(i,s,r,n,e[a+14],15,-1416354905);n=c(n,i,s,r,e[a+5],21,-57434055);r=c(r,n,i,s,e[a+12],6,1700485571);s=c(s,r,n,i,e[a+3],10,-1894986606);i=c(i,s,r,n,e[a+10],15,-1051523);n=c(n,i,s,r,e[a+1],21,-2054922799);r=c(r,n,i,s,e[a+8],6,1873313359);s=c(s,r,n,i,e[a+15],10,-30611744);i=c(i,s,r,n,e[a+6],15,-1560198380);n=c(n,i,s,r,e[a+13],21,1309151649);r=c(r,n,i,s,e[a+4],6,-145523070);s=c(s,r,n,i,e[a+11],10,-1120210379);i=c(i,s,r,n,e[a+2],15,718787259);n=c(n,i,s,r,e[a+9],21,-343485551);r=l(r,h);n=l(n,p);i=l(i,d);s=l(s,m)}return Array(r,n,i,s)}function a(e,t,r,n,i,s){return l(h(l(l(t,e),l(n,s)),i),r)}function o(e,t,r,n,i,s,o){return a(t&r|~t&n,e,t,i,s,o)}function u(e,t,r,n,i,s,o){return a(t&n|r&~n,e,t,i,s,o)}function f(e,t,r,n,i,s,o){return a(t^r^n,e,t,i,s,o)}function c(e,t,r,n,i,s,o){return a(r^(t|~n),e,t,i,s,o)}function l(e,t){var r=(e&65535)+(t&65535);var n=(e>>16)+(t>>16)+(r>>16);return n<<16|r&65535}function h(e,t){return e<<t|e>>>32-t}t.exports=function p(e){return n.hash(e,s,16)}},{"./helpers":5}],8:[function(e,t,r){(function(){var e=this;var r,n;r=function(e){var t=new Array(e);var r;for(var n=0,r;n<e;n++){if((n&3)==0)r=Math.random()*4294967296;t[n]=r>>>((n&3)<<3)&255}return t};if(e.crypto&&crypto.getRandomValues){n=function(e){var t=new Uint8Array(e);crypto.getRandomValues(t);return t}}t.exports=n||r})()},{}],9:[function(e,t,r){var n=e("./helpers");function i(e,t){e[t>>5]|=128<<24-t%32;e[(t+64>>9<<4)+15]=t;var r=Array(80);var n=1732584193;var i=-271733879;var f=-1732584194;var c=271733878;var l=-1009589776;for(var h=0;h<e.length;h+=16){var p=n;var d=i;var m=f;var v=c;var g=l;for(var y=0;y<80;y++){if(y<16)r[y]=e[h+y];else r[y]=u(r[y-3]^r[y-8]^r[y-14]^r[y-16],1);var b=o(o(u(n,5),s(y,i,f,c)),o(o(l,r[y]),a(y)));l=c;c=f;f=u(i,30);i=n;n=b}n=o(n,p);i=o(i,d);f=o(f,m);c=o(c,v);l=o(l,g)}return Array(n,i,f,c,l)}function s(e,t,r,n){if(e<20)return t&r|~t&n;if(e<40)return t^r^n;if(e<60)return t&r|t&n|r&n;return t^r^n}function a(e){return e<20?1518500249:e<40?1859775393:e<60?-1894007588:-899497514}function o(e,t){var r=(e&65535)+(t&65535);var n=(e>>16)+(t>>16)+(r>>16);return n<<16|r&65535}function u(e,t){return e<<t|e>>>32-t}t.exports=function f(e){return n.hash(e,i,20,true)}},{"./helpers":5}],10:[function(e,t,r){var n=e("./helpers");var i=function(e,t){var r=(e&65535)+(t&65535);var n=(e>>16)+(t>>16)+(r>>16);return n<<16|r&65535};var s=function(e,t){return e>>>t|e<<32-t};var a=function(e,t){return e>>>t};var o=function(e,t,r){return e&t^~e&r};var u=function(e,t,r){return e&t^e&r^t&r};var f=function(e){return s(e,2)^s(e,13)^s(e,22)};var c=function(e){return s(e,6)^s(e,11)^s(e,25)};var l=function(e){return s(e,7)^s(e,18)^a(e,3)};var h=function(e){return s(e,17)^s(e,19)^a(e,10)};var p=function(e,t){var r=new Array(1116352408,1899447441,3049323471,3921009573,961987163,1508970993,2453635748,2870763221,3624381080,310598401,607225278,1426881987,1925078388,2162078206,2614888103,3248222580,3835390401,4022224774,264347078,604807628,770255983,1249150122,1555081692,1996064986,2554220882,2821834349,2952996808,3210313671,3336571891,3584528711,113926993,338241895,666307205,773529912,1294757372,1396182291,1695183700,1986661051,2177026350,2456956037,2730485921,2820302411,3259730800,3345764771,3516065817,3600352804,4094571909,275423344,430227734,506948616,659060556,883997877,958139571,1322822218,1537002063,1747873779,1955562222,2024104815,2227730452,2361852424,2428436474,2756734187,3204031479,3329325298);var n=new Array(1779033703,3144134277,1013904242,2773480762,1359893119,2600822924,528734635,1541459225);var s=new Array(64);var a,p,d,m,v,g,y,b,w,E;var S,_;e[t>>5]|=128<<24-t%32;e[(t+64>>9<<4)+15]=t;for(var w=0;w<e.length;w+=16){a=n[0];p=n[1];d=n[2];m=n[3];v=n[4];g=n[5];y=n[6];b=n[7];for(var E=0;E<64;E++){if(E<16){s[E]=e[E+w]}else{s[E]=i(i(i(h(s[E-2]),s[E-7]),l(s[E-15])),s[E-16])}S=i(i(i(i(b,c(v)),o(v,g,y)),r[E]),s[E]);_=i(f(a),u(a,p,d));b=y;y=g;g=v;v=i(m,S);m=d;d=p;p=a;a=i(S,_)}n[0]=i(a,n[0]);n[1]=i(p,n[1]);n[2]=i(d,n[2]);n[3]=i(m,n[3]);n[4]=i(v,n[4]);n[5]=i(g,n[5]);n[6]=i(y,n[6]);n[7]=i(b,n[7])}return n};t.exports=function d(e){return n.hash(e,p,32,true)}},{"./helpers":5}],11:[function(e,t,r){function n(){this._events=this._events||{};this._maxListeners=this._maxListeners||undefined}t.exports=n;n.EventEmitter=n;n.prototype._events=undefined;n.prototype._maxListeners=undefined;n.defaultMaxListeners=10;n.prototype.setMaxListeners=function(e){if(!s(e)||e<0||isNaN(e))throw TypeError("n must be a positive number");this._maxListeners=e;return this};n.prototype.emit=function(e){var t,r,n,s,u,f;if(!this._events)this._events={};if(e==="error"){if(!this._events.error||a(this._events.error)&&!this._events.error.length){t=arguments[1];if(t instanceof Error){throw t}else{throw TypeError('Uncaught, unspecified "error" event.')}return false}}r=this._events[e];if(o(r))return false;if(i(r)){switch(arguments.length){case 1:r.call(this);break;case 2:r.call(this,arguments[1]);break;case 3:r.call(this,arguments[1],arguments[2]);break;default:n=arguments.length;s=new Array(n-1);for(u=1;u<n;u++)s[u-1]=arguments[u];r.apply(this,s)}}else if(a(r)){n=arguments.length;s=new Array(n-1);for(u=1;u<n;u++)s[u-1]=arguments[u];f=r.slice();n=f.length;for(u=0;u<n;u++)f[u].apply(this,s)}return true};n.prototype.addListener=function(e,t){var r;if(!i(t))throw TypeError("listener must be a function");if(!this._events)this._events={};if(this._events.newListener)this.emit("newListener",e,i(t.listener)?t.listener:t);if(!this._events[e])this._events[e]=t;else if(a(this._events[e]))this._events[e].push(t);else this._events[e]=[this._events[e],t];if(a(this._events[e])&&!this._events[e].warned){var r;if(!o(this._maxListeners)){r=this._maxListeners}else{r=n.defaultMaxListeners}if(r&&r>0&&this._events[e].length>r){this._events[e].warned=true;console.error("(node) warning: possible EventEmitter memory "+"leak detected. %d listeners added. "+"Use emitter.setMaxListeners() to increase limit.",this._events[e].length);console.trace()}}return this};n.prototype.on=n.prototype.addListener;n.prototype.once=function(e,t){if(!i(t))throw TypeError("listener must be a function");var r=false;function n(){this.removeListener(e,n);if(!r){r=true;t.apply(this,arguments)}}n.listener=t;this.on(e,n);return this};n.prototype.removeListener=function(e,t){var r,n,s,o;if(!i(t))throw TypeError("listener must be a function");if(!this._events||!this._events[e])return this;r=this._events[e];s=r.length;n=-1;if(r===t||i(r.listener)&&r.listener===t){delete this._events[e];if(this._events.removeListener)this.emit("removeListener",e,t)}else if(a(r)){for(o=s;o-->0;){if(r[o]===t||r[o].listener&&r[o].listener===t){n=o;break}}if(n<0)return this;if(r.length===1){r.length=0;delete this._events[e]}else{r.splice(n,1)}if(this._events.removeListener)this.emit("removeListener",e,t)}return this};n.prototype.removeAllListeners=function(e){var t,r;if(!this._events)return this;if(!this._events.removeListener){if(arguments.length===0)this._events={};else if(this._events[e])delete this._events[e];return this}if(arguments.length===0){for(t in this._events){if(t==="removeListener")continue;this.removeAllListeners(t)}this.removeAllListeners("removeListener");this._events={};return this}r=this._events[e];if(i(r)){this.removeListener(e,r)}else{while(r.length)this.removeListener(e,r[r.length-1])}delete this._events[e];return this};n.prototype.listeners=function(e){var t;if(!this._events||!this._events[e])t=[];else if(i(this._events[e]))t=[this._events[e]];else t=this._events[e].slice();return t};n.listenerCount=function(e,t){var r;if(!e._events||!e._events[t])r=0;else if(i(e._events[t]))r=1;else r=e._events[t].length;return r};function i(e){return typeof e==="function"}function s(e){return typeof e==="number"}function a(e){return typeof e==="object"&&e!==null}function o(e){return e===void 0}},{}],12:[function(e,t,r){if(typeof Object.create==="function"){t.exports=function n(e,t){e.super_=t;e.prototype=Object.create(t.prototype,{constructor:{value:e,enumerable:false,writable:true,configurable:true}})}}else{t.exports=function i(e,t){e.super_=t;var r=function(){};r.prototype=t.prototype;e.prototype=new r;e.prototype.constructor=e}}},{}],13:[function(e,t,r){var n=t.exports={};n.nextTick=function(){var e=typeof window!=="undefined"&&window.setImmediate;var t=typeof window!=="undefined"&&window.postMessage&&window.addEventListener;if(e){return function(e){return window.setImmediate(e)}}if(t){var r=[];window.addEventListener("message",function(e){var t=e.source;if((t===window||t===null)&&e.data==="process-tick"){e.stopPropagation();if(r.length>0){var n=r.shift();n()}}},true);return function n(e){r.push(e);window.postMessage("process-tick","*")}}return function i(e){setTimeout(e,0)}}();n.title="browser";n.browser=true;n.env={};n.argv=[];n.binding=function(e){throw new Error("process.binding is not supported")};n.cwd=function(){return"/"};n.chdir=function(e){throw new Error("process.chdir is not supported")}},{}],14:[function(e,t,r){(function(e){(function(n){var i=typeof r=="object"&&r;var s=typeof t=="object"&&t&&t.exports==i&&t;var a=typeof e=="object"&&e;if(a.global===a||a.window===a){n=a}var o,u=2147483647,f=36,c=1,l=26,h=38,p=700,d=72,m=128,v="-",g=/^xn--/,y=/[^ -~]/,b=/\x2E|\u3002|\uFF0E|\uFF61/g,w={overflow:"Overflow: input needs wider integers to process","not-basic":"Illegal input >= 0x80 (not a basic code point)","invalid-input":"Invalid input"},E=f-c,S=Math.floor,_=String.fromCharCode,T;function A(e){throw RangeError(w[e])}function x(e,t){var r=e.length;while(r--){e[r]=t(e[r])}return e}function R(e,t){return x(e.split(b),t).join(".")}function C(e){var t=[],r=0,n=e.length,i,s;while(r<n){i=e.charCodeAt(r++);if(i>=55296&&i<=56319&&r<n){s=e.charCodeAt(r++);if((s&64512)==56320){t.push(((i&1023)<<10)+(s&1023)+65536)}else{t.push(i);r--}}else{t.push(i)}}return t}function I(e){return x(e,function(e){var t="";if(e>65535){e-=65536;t+=_(e>>>10&1023|55296);e=56320|e&1023}t+=_(e);return t
}).join("")}function L(e){if(e-48<10){return e-22}if(e-65<26){return e-65}if(e-97<26){return e-97}return f}function N(e,t){return e+22+75*(e<26)-((t!=0)<<5)}function q(e,t,r){var n=0;e=r?S(e/p):e>>1;e+=S(e/t);for(;e>E*l>>1;n+=f){e=S(e/E)}return S(n+(E+1)*e/(e+h))}function D(e){var t=[],r=e.length,n,i=0,s=m,a=d,o,h,p,g,y,b,w,E,_;o=e.lastIndexOf(v);if(o<0){o=0}for(h=0;h<o;++h){if(e.charCodeAt(h)>=128){A("not-basic")}t.push(e.charCodeAt(h))}for(p=o>0?o+1:0;p<r;){for(g=i,y=1,b=f;;b+=f){if(p>=r){A("invalid-input")}w=L(e.charCodeAt(p++));if(w>=f||w>S((u-i)/y)){A("overflow")}i+=w*y;E=b<=a?c:b>=a+l?l:b-a;if(w<E){break}_=f-E;if(y>S(u/_)){A("overflow")}y*=_}n=t.length+1;a=q(i-g,n,g==0);if(S(i/n)>u-s){A("overflow")}s+=S(i/n);i%=n;t.splice(i++,0,s)}return I(t)}function O(e){var t,r,n,i,s,a,o,h,p,g,y,b=[],w,E,T,x;e=C(e);w=e.length;t=m;r=0;s=d;for(a=0;a<w;++a){y=e[a];if(y<128){b.push(_(y))}}n=i=b.length;if(i){b.push(v)}while(n<w){for(o=u,a=0;a<w;++a){y=e[a];if(y>=t&&y<o){o=y}}E=n+1;if(o-t>S((u-r)/E)){A("overflow")}r+=(o-t)*E;t=o;for(a=0;a<w;++a){y=e[a];if(y<t&&++r>u){A("overflow")}if(y==t){for(h=r,p=f;;p+=f){g=p<=s?c:p>=s+l?l:p-s;if(h<g){break}x=h-g;T=f-g;b.push(_(N(g+x%T,0)));h=S(x/T)}b.push(_(N(h,0)));s=q(r,E,n==i);r=0;++n}}++r;++t}return b.join("")}function j(e){return R(e,function(e){return g.test(e)?D(e.slice(4).toLowerCase()):e})}function P(e){return R(e,function(e){return y.test(e)?"xn--"+O(e):e})}o={version:"1.2.4",ucs2:{decode:C,encode:I},decode:D,encode:O,toASCII:P,toUnicode:j};if(typeof define=="function"&&typeof define.amd=="object"&&define.amd){define("punycode",function(){return o})}else if(i&&!i.nodeType){if(s){s.exports=o}else{for(T in o){o.hasOwnProperty(T)&&(i[T]=o[T])}}}else{n.punycode=o}})(this)}).call(this,typeof self!=="undefined"?self:typeof window!=="undefined"?window:{})},{}],15:[function(e,t,r){"use strict";function n(e,t){return Object.prototype.hasOwnProperty.call(e,t)}t.exports=function(e,t,r,s){t=t||"&";r=r||"=";var a={};if(typeof e!=="string"||e.length===0){return a}var o=/\+/g;e=e.split(t);var u=1e3;if(s&&typeof s.maxKeys==="number"){u=s.maxKeys}var f=e.length;if(u>0&&f>u){f=u}for(var c=0;c<f;++c){var l=e[c].replace(o,"%20"),h=l.indexOf(r),p,d,m,v;if(h>=0){p=l.substr(0,h);d=l.substr(h+1)}else{p=l;d=""}m=decodeURIComponent(p);v=decodeURIComponent(d);if(!n(a,m)){a[m]=v}else if(i(a[m])){a[m].push(v)}else{a[m]=[a[m],v]}}return a};var i=Array.isArray||function(e){return Object.prototype.toString.call(e)==="[object Array]"}},{}],16:[function(e,t,r){"use strict";var n=function(e){switch(typeof e){case"string":return e;case"boolean":return e?"true":"false";case"number":return isFinite(e)?e:"";default:return""}};t.exports=function(e,t,r,o){t=t||"&";r=r||"=";if(e===null){e=undefined}if(typeof e==="object"){return s(a(e),function(s){var a=encodeURIComponent(n(s))+r;if(i(e[s])){return e[s].map(function(e){return a+encodeURIComponent(n(e))}).join(t)}else{return a+encodeURIComponent(n(e[s]))}}).join(t)}if(!o)return"";return encodeURIComponent(n(o))+r+encodeURIComponent(n(e))};var i=Array.isArray||function(e){return Object.prototype.toString.call(e)==="[object Array]"};function s(e,t){if(e.map)return e.map(t);var r=[];for(var n=0;n<e.length;n++){r.push(t(e[n],n))}return r}var a=Object.keys||function(e){var t=[];for(var r in e){if(Object.prototype.hasOwnProperty.call(e,r))t.push(r)}return t}},{}],17:[function(e,t,r){"use strict";r.decode=r.parse=e("./decode");r.encode=r.stringify=e("./encode")},{"./decode":15,"./encode":16}],18:[function(e,t,r){t.exports=o;var n=e("inherits");var i=e("process/browser.js").nextTick;var s=e("./readable.js");var a=e("./writable.js");n(o,s);o.prototype.write=a.prototype.write;o.prototype.end=a.prototype.end;o.prototype._write=a.prototype._write;function o(e){if(!(this instanceof o))return new o(e);s.call(this,e);a.call(this,e);if(e&&e.readable===false)this.readable=false;if(e&&e.writable===false)this.writable=false;this.allowHalfOpen=true;if(e&&e.allowHalfOpen===false)this.allowHalfOpen=false;this.once("end",u)}function u(){if(this.allowHalfOpen||this._writableState.ended)return;var e=this;i(function(){e.end()})}},{"./readable.js":22,"./writable.js":24,inherits:12,"process/browser.js":20}],19:[function(e,t,r){t.exports=s;var n=e("events").EventEmitter;var i=e("inherits");i(s,n);s.Readable=e("./readable.js");s.Writable=e("./writable.js");s.Duplex=e("./duplex.js");s.Transform=e("./transform.js");s.PassThrough=e("./passthrough.js");s.Stream=s;function s(){n.call(this)}s.prototype.pipe=function(e,t){var r=this;function i(t){if(e.writable){if(false===e.write(t)&&r.pause){r.pause()}}}r.on("data",i);function s(){if(r.readable&&r.resume){r.resume()}}e.on("drain",s);if(!e._isStdio&&(!t||t.end!==false)){r.on("end",o);r.on("close",u)}var a=false;function o(){if(a)return;a=true;e.end()}function u(){if(a)return;a=true;if(typeof e.destroy==="function")e.destroy()}function f(e){c();if(n.listenerCount(this,"error")===0){throw e}}r.on("error",f);e.on("error",f);function c(){r.removeListener("data",i);e.removeListener("drain",s);r.removeListener("end",o);r.removeListener("close",u);r.removeListener("error",f);e.removeListener("error",f);r.removeListener("end",c);r.removeListener("close",c);e.removeListener("close",c)}r.on("end",c);r.on("close",c);e.on("close",c);e.emit("pipe",r);return e}},{"./duplex.js":18,"./passthrough.js":21,"./readable.js":22,"./transform.js":23,"./writable.js":24,events:11,inherits:12}],20:[function(e,t,r){t.exports=e(13)},{}],21:[function(e,t,r){t.exports=s;var n=e("./transform.js");var i=e("inherits");i(s,n);function s(e){if(!(this instanceof s))return new s(e);n.call(this,e)}s.prototype._transform=function(e,t,r){r(null,e)}},{"./transform.js":23,inherits:12}],22:[function(e,t,r){(function(r){t.exports=c;c.ReadableState=f;var n=e("events").EventEmitter;var i=e("./index.js");var s=e("buffer").Buffer;var a=e("process/browser.js").nextTick;var o;var u=e("inherits");u(c,i);function f(t,r){t=t||{};var n=t.highWaterMark;this.highWaterMark=n||n===0?n:16*1024;this.highWaterMark=~~this.highWaterMark;this.buffer=[];this.length=0;this.pipes=null;this.pipesCount=0;this.flowing=false;this.ended=false;this.endEmitted=false;this.reading=false;this.calledRead=false;this.sync=true;this.needReadable=false;this.emittedReadable=false;this.readableListening=false;this.objectMode=!!t.objectMode;this.defaultEncoding=t.defaultEncoding||"utf8";this.ranOut=false;this.awaitDrain=0;this.readingMore=false;this.decoder=null;this.encoding=null;if(t.encoding){if(!o)o=e("string_decoder").StringDecoder;this.decoder=new o(t.encoding);this.encoding=t.encoding}}function c(e){if(!(this instanceof c))return new c(e);this._readableState=new f(e,this);this.readable=true;i.call(this)}c.prototype.push=function(e,t){var r=this._readableState;if(typeof e==="string"&&!r.objectMode){t=t||r.defaultEncoding;if(t!==r.encoding){e=new s(e,t);t=""}}return l(this,r,e,t,false)};c.prototype.unshift=function(e){var t=this._readableState;return l(this,t,e,"",true)};function l(e,t,r,n,i){var s=v(t,r);if(s){e.emit("error",s)}else if(r===null||r===undefined){t.reading=false;if(!t.ended)g(e,t)}else if(t.objectMode||r&&r.length>0){if(t.ended&&!i){var a=new Error("stream.push() after EOF");e.emit("error",a)}else if(t.endEmitted&&i){var a=new Error("stream.unshift() after end event");e.emit("error",a)}else{if(t.decoder&&!i&&!n)r=t.decoder.write(r);t.length+=t.objectMode?1:r.length;if(i){t.buffer.unshift(r)}else{t.reading=false;t.buffer.push(r)}if(t.needReadable)y(e);w(e,t)}}else if(!i){t.reading=false}return h(t)}function h(e){return!e.ended&&(e.needReadable||e.length<e.highWaterMark||e.length===0)}c.prototype.setEncoding=function(t){if(!o)o=e("string_decoder").StringDecoder;this._readableState.decoder=new o(t);this._readableState.encoding=t};var p=8388608;function d(e){if(e>=p){e=p}else{e--;for(var t=1;t<32;t<<=1)e|=e>>t;e++}return e}function m(e,t){if(t.length===0&&t.ended)return 0;if(t.objectMode)return e===0?0:1;if(isNaN(e)||e===null){if(t.flowing&&t.buffer.length)return t.buffer[0].length;else return t.length}if(e<=0)return 0;if(e>t.highWaterMark)t.highWaterMark=d(e);if(e>t.length){if(!t.ended){t.needReadable=true;return 0}else return t.length}return e}c.prototype.read=function(e){var t=this._readableState;t.calledRead=true;var r=e;if(typeof e!=="number"||e>0)t.emittedReadable=false;if(e===0&&t.needReadable&&(t.length>=t.highWaterMark||t.ended)){y(this);return null}e=m(e,t);if(e===0&&t.ended){if(t.length===0)R(this);return null}var n=t.needReadable;if(t.length-e<=t.highWaterMark)n=true;if(t.ended||t.reading)n=false;if(n){t.reading=true;t.sync=true;if(t.length===0)t.needReadable=true;this._read(t.highWaterMark);t.sync=false}if(n&&!t.reading)e=m(r,t);var i;if(e>0)i=x(e,t);else i=null;if(i===null){t.needReadable=true;e=0}t.length-=e;if(t.length===0&&!t.ended)t.needReadable=true;if(t.ended&&!t.endEmitted&&t.length===0)R(this);return i};function v(e,t){var r=null;if(!s.isBuffer(t)&&"string"!==typeof t&&t!==null&&t!==undefined&&!e.objectMode&&!r){r=new TypeError("Invalid non-string/buffer chunk")}return r}function g(e,t){if(t.decoder&&!t.ended){var r=t.decoder.end();if(r&&r.length){t.buffer.push(r);t.length+=t.objectMode?1:r.length}}t.ended=true;if(t.length>0)y(e);else R(e)}function y(e){var t=e._readableState;t.needReadable=false;if(t.emittedReadable)return;t.emittedReadable=true;if(t.sync)a(function(){b(e)});else b(e)}function b(e){e.emit("readable")}function w(e,t){if(!t.readingMore){t.readingMore=true;a(function(){E(e,t)})}}function E(e,t){var r=t.length;while(!t.reading&&!t.flowing&&!t.ended&&t.length<t.highWaterMark){e.read(0);if(r===t.length)break;else r=t.length}t.readingMore=false}c.prototype._read=function(e){this.emit("error",new Error("not implemented"))};c.prototype.pipe=function(e,t){var i=this;var s=this._readableState;switch(s.pipesCount){case 0:s.pipes=e;break;case 1:s.pipes=[s.pipes,e];break;default:s.pipes.push(e);break}s.pipesCount+=1;var o=(!t||t.end!==false)&&e!==r.stdout&&e!==r.stderr;var u=o?c:h;if(s.endEmitted)a(u);else i.once("end",u);e.on("unpipe",f);function f(e){if(e!==i)return;h()}function c(){e.end()}var l=S(i);e.on("drain",l);function h(){e.removeListener("close",m);e.removeListener("finish",v);e.removeListener("drain",l);e.removeListener("error",d);e.removeListener("unpipe",f);i.removeListener("end",c);i.removeListener("end",h);if(!e._writableState||e._writableState.needDrain)l()}var p=n.listenerCount(e,"error");function d(t){g();if(p===0&&n.listenerCount(e,"error")===0)e.emit("error",t)}e.once("error",d);function m(){e.removeListener("finish",v);g()}e.once("close",m);function v(){e.removeListener("close",m);g()}e.once("finish",v);function g(){i.unpipe(e)}e.emit("pipe",i);if(!s.flowing){this.on("readable",T);s.flowing=true;a(function(){_(i)})}return e};function S(e){return function(){var t=this;var r=e._readableState;r.awaitDrain--;if(r.awaitDrain===0)_(e)}}function _(e){var t=e._readableState;var r;t.awaitDrain=0;function i(e,n,i){var s=e.write(r);if(false===s){t.awaitDrain++}}while(t.pipesCount&&null!==(r=e.read())){if(t.pipesCount===1)i(t.pipes,0,null);else C(t.pipes,i);e.emit("data",r);if(t.awaitDrain>0)return}if(t.pipesCount===0){t.flowing=false;if(n.listenerCount(e,"data")>0)A(e);return}t.ranOut=true}function T(){if(this._readableState.ranOut){this._readableState.ranOut=false;_(this)}}c.prototype.unpipe=function(e){var t=this._readableState;if(t.pipesCount===0)return this;if(t.pipesCount===1){if(e&&e!==t.pipes)return this;if(!e)e=t.pipes;t.pipes=null;t.pipesCount=0;this.removeListener("readable",T);t.flowing=false;if(e)e.emit("unpipe",this);return this}if(!e){var r=t.pipes;var n=t.pipesCount;t.pipes=null;t.pipesCount=0;this.removeListener("readable",T);t.flowing=false;for(var i=0;i<n;i++)r[i].emit("unpipe",this);return this}var i=I(t.pipes,e);if(i===-1)return this;t.pipes.splice(i,1);t.pipesCount-=1;if(t.pipesCount===1)t.pipes=t.pipes[0];e.emit("unpipe",this);return this};c.prototype.on=function(e,t){var r=i.prototype.on.call(this,e,t);if(e==="data"&&!this._readableState.flowing)A(this);if(e==="readable"&&this.readable){var n=this._readableState;if(!n.readableListening){n.readableListening=true;n.emittedReadable=false;n.needReadable=true;if(!n.reading){this.read(0)}else if(n.length){y(this,n)}}}return r};c.prototype.addListener=c.prototype.on;c.prototype.resume=function(){A(this);this.read(0);this.emit("resume")};c.prototype.pause=function(){A(this,true);this.emit("pause")};function A(e,t){var r=e._readableState;if(r.flowing){throw new Error("Cannot switch to old mode now.")}var n=t||false;var s=false;e.readable=true;e.pipe=i.prototype.pipe;e.on=e.addListener=i.prototype.on;e.on("readable",function(){s=true;var t;while(!n&&null!==(t=e.read()))e.emit("data",t);if(t===null){s=false;e._readableState.needReadable=true}});e.pause=function(){n=true;this.emit("pause")};e.resume=function(){n=false;if(s)a(function(){e.emit("readable")});else this.read(0);this.emit("resume")};e.emit("readable")}c.prototype.wrap=function(e){var t=this._readableState;var r=false;var n=this;e.on("end",function(){if(t.decoder&&!t.ended){var e=t.decoder.end();if(e&&e.length)n.push(e)}n.push(null)});e.on("data",function(i){if(t.decoder)i=t.decoder.write(i);if(!i||!t.objectMode&&!i.length)return;var s=n.push(i);if(!s){r=true;e.pause()}});for(var i in e){if(typeof e[i]==="function"&&typeof this[i]==="undefined"){this[i]=function(t){return function(){return e[t].apply(e,arguments)}}(i)}}var s=["error","close","destroy","pause","resume"];C(s,function(t){e.on(t,function(e){return n.emit.apply(n,t,e)})});n._read=function(t){if(r){r=false;e.resume()}};return n};c._fromList=x;function x(e,t){var r=t.buffer;var n=t.length;var i=!!t.decoder;var a=!!t.objectMode;var o;if(r.length===0)return null;if(n===0)o=null;else if(a)o=r.shift();else if(!e||e>=n){if(i)o=r.join("");else o=s.concat(r,n);r.length=0}else{if(e<r[0].length){var u=r[0];o=u.slice(0,e);r[0]=u.slice(e)}else if(e===r[0].length){o=r.shift()}else{if(i)o="";else o=new s(e);var f=0;for(var c=0,l=r.length;c<l&&f<e;c++){var u=r[0];var h=Math.min(e-f,u.length);if(i)o+=u.slice(0,h);else u.copy(o,f,0,h);if(h<u.length)r[0]=u.slice(h);else r.shift();f+=h}}}return o}function R(e){var t=e._readableState;if(t.length>0)throw new Error("endReadable called on non-empty stream");if(!t.endEmitted&&t.calledRead){t.ended=true;a(function(){if(!t.endEmitted&&t.length===0){t.endEmitted=true;e.readable=false;e.emit("end")}})}}function C(e,t){for(var r=0,n=e.length;r<n;r++){t(e[r],r)}}function I(e,t){for(var r=0,n=e.length;r<n;r++){if(e[r]===t)return r}return-1}}).call(this,e("/Users/mauriciochavarriaga/Projects/aws-sdk-js/dist-tools/node_modules/browserify/node_modules/insert-module-globals/node_modules/process/browser.js"))},{"./index.js":19,"/Users/mauriciochavarriaga/Projects/aws-sdk-js/dist-tools/node_modules/browserify/node_modules/insert-module-globals/node_modules/process/browser.js":13,buffer:2,events:11,inherits:12,"process/browser.js":20,string_decoder:25}],23:[function(e,t,r){t.exports=o;var n=e("./duplex.js");var i=e("inherits");i(o,n);function s(e,t){this.afterTransform=function(e,r){return a(t,e,r)};this.needTransform=false;this.transforming=false;this.writecb=null;this.writechunk=null}function a(e,t,r){var n=e._transformState;n.transforming=false;var i=n.writecb;if(!i)return e.emit("error",new Error("no writecb in Transform class"));n.writechunk=null;n.writecb=null;if(r!==null&&r!==undefined)e.push(r);if(i)i(t);var s=e._readableState;s.reading=false;if(s.needReadable||s.length<s.highWaterMark){e._read(s.highWaterMark)}}function o(e){if(!(this instanceof o))return new o(e);n.call(this,e);var t=this._transformState=new s(e,this);var r=this;this._readableState.needReadable=true;this._readableState.sync=false;this.once("finish",function(){if("function"===typeof this._flush)this._flush(function(e){u(r,e)});else u(r)})}o.prototype.push=function(e,t){this._transformState.needTransform=false;return n.prototype.push.call(this,e,t)};o.prototype._transform=function(e,t,r){throw new Error("not implemented")};o.prototype._write=function(e,t,r){var n=this._transformState;n.writecb=r;n.writechunk=e;n.writeencoding=t;if(!n.transforming){var i=this._readableState;if(n.needTransform||i.needReadable||i.length<i.highWaterMark)this._read(i.highWaterMark)}};o.prototype._read=function(e){var t=this._transformState;if(t.writechunk&&t.writecb&&!t.transforming){t.transforming=true;this._transform(t.writechunk,t.writeencoding,t.afterTransform)}else{t.needTransform=true}};function u(e,t){if(t)return e.emit("error",t);var r=e._writableState;var n=e._readableState;var i=e._transformState;if(r.length)throw new Error("calling transform done when ws.length != 0");if(i.transforming)throw new Error("calling transform done when still transforming");return e.push(null)}},{"./duplex.js":18,inherits:12}],24:[function(e,t,r){t.exports=l;l.WritableState=c;var n=typeof Uint8Array!=="undefined"?function(e){return e instanceof Uint8Array}:function(e){return e&&e.constructor&&e.constructor.name==="Uint8Array"};var i=typeof ArrayBuffer!=="undefined"?function(e){return e instanceof ArrayBuffer}:function(e){return e&&e.constructor&&e.constructor.name==="ArrayBuffer"};var s=e("inherits");var a=e("./index.js");var o=e("process/browser.js").nextTick;var u=e("buffer").Buffer;s(l,a);function f(e,t,r){this.chunk=e;this.encoding=t;this.callback=r}function c(e,t){e=e||{};var r=e.highWaterMark;this.highWaterMark=r||r===0?r:16*1024;this.objectMode=!!e.objectMode;this.highWaterMark=~~this.highWaterMark;this.needDrain=false;this.ending=false;this.ended=false;this.finished=false;var n=e.decodeStrings===false;this.decodeStrings=!n;this.defaultEncoding=e.defaultEncoding||"utf8";this.length=0;this.writing=false;this.sync=true;this.bufferProcessing=false;this.onwrite=function(e){b(t,e)};this.writecb=null;this.writelen=0;this.buffer=[]}function l(e){if(!(this instanceof l)&&!(this instanceof a.Duplex))return new l(e);this._writableState=new c(e,this);this.writable=true;a.call(this)}l.prototype.pipe=function(){this.emit("error",new Error("Cannot pipe. Not readable."))};function h(e,t,r){var n=new Error("write after end");e.emit("error",n);o(function(){r(n)})}function p(e,t,r,n){var i=true;if(!u.isBuffer(r)&&"string"!==typeof r&&r!==null&&r!==undefined&&!t.objectMode){var s=new TypeError("Invalid non-string/buffer chunk");e.emit("error",s);o(function(){n(s)});i=false}return i}l.prototype.write=function(e,t,r){var s=this._writableState;var a=false;if(typeof t==="function"){r=t;t=null}if(!u.isBuffer(e)&&n(e))e=new u(e);if(i(e)&&typeof Uint8Array!=="undefined")e=new u(new Uint8Array(e));if(u.isBuffer(e))t="buffer";else if(!t)t=s.defaultEncoding;if(typeof r!=="function")r=function(){};if(s.ended)h(this,s,r);else if(p(this,s,e,r))a=m(this,s,e,t,r);return a};function d(e,t,r){if(!e.objectMode&&e.decodeStrings!==false&&typeof t==="string"){t=new u(t,r)}return t}function m(e,t,r,n,i){r=d(t,r,n);var s=t.objectMode?1:r.length;t.length+=s;var a=t.length<t.highWaterMark;t.needDrain=!a;if(t.writing)t.buffer.push(new f(r,n,i));else v(e,t,s,r,n,i);return a}function v(e,t,r,n,i,s){t.writelen=r;t.writecb=s;t.writing=true;t.sync=true;e._write(n,i,t.onwrite);t.sync=false}function g(e,t,r,n,i){if(r)o(function(){i(n)});else i(n);e.emit("error",n)}function y(e){e.writing=false;e.writecb=null;e.length-=e.writelen;e.writelen=0}function b(e,t){var r=e._writableState;var n=r.sync;var i=r.writecb;y(r);if(t)g(e,r,n,t,i);else{var s=_(e,r);if(!s&&!r.bufferProcessing&&r.buffer.length)S(e,r);if(n){o(function(){w(e,r,s,i)})}else{w(e,r,s,i)}}}function w(e,t,r,n){if(!r)E(e,t);n();if(r)T(e,t)}function E(e,t){if(t.length===0&&t.needDrain){t.needDrain=false;e.emit("drain")}}function S(e,t){t.bufferProcessing=true;for(var r=0;r<t.buffer.length;r++){var n=t.buffer[r];var i=n.chunk;var s=n.encoding;var a=n.callback;var o=t.objectMode?1:i.length;v(e,t,o,i,s,a);if(t.writing){r++;break}}t.bufferProcessing=false;if(r<t.buffer.length)t.buffer=t.buffer.slice(r);else t.buffer.length=0}l.prototype._write=function(e,t,r){r(new Error("not implemented"))};l.prototype.end=function(e,t,r){var n=this._writableState;if(typeof e==="function"){r=e;e=null;t=null}else if(typeof t==="function"){r=t;t=null}if(typeof e!=="undefined"&&e!==null)this.write(e,t);if(!n.ending&&!n.finished)A(this,n,r)};function _(e,t){return t.ending&&t.length===0&&!t.finished&&!t.writing}function T(e,t){var r=_(e,t);if(r){t.finished=true;e.emit("finish")}return r}function A(e,t,r){t.ending=true;T(e,t);if(r){if(t.finished)o(r);else e.once("finish",r)}t.ended=true}},{"./index.js":19,buffer:2,inherits:12,"process/browser.js":20}],25:[function(e,t,r){var n=e("buffer").Buffer;function i(e){if(e&&!n.isEncoding(e)){throw new Error("Unknown encoding: "+e)}}var s=r.StringDecoder=function(e){this.encoding=(e||"utf8").toLowerCase().replace(/[-_]/,"");i(e);switch(this.encoding){case"utf8":this.surrogateSize=3;break;case"ucs2":case"utf16le":this.surrogateSize=2;this.detectIncompleteChar=o;break;case"base64":this.surrogateSize=3;this.detectIncompleteChar=u;break;default:this.write=a;return}this.charBuffer=new n(6);this.charReceived=0;this.charLength=0};s.prototype.write=function(e){var t="";var r=0;while(this.charLength){var n=e.length>=this.charLength-this.charReceived?this.charLength-this.charReceived:e.length;e.copy(this.charBuffer,this.charReceived,r,n);this.charReceived+=n-r;r=n;if(this.charReceived<this.charLength){return""}t=this.charBuffer.slice(0,this.charLength).toString(this.encoding);var i=t.charCodeAt(t.length-1);if(i>=55296&&i<=56319){this.charLength+=this.surrogateSize;t="";continue}this.charReceived=this.charLength=0;if(n==e.length)return t;e=e.slice(n,e.length);break}var s=this.detectIncompleteChar(e);var a=e.length;if(this.charLength){e.copy(this.charBuffer,0,e.length-s,a);this.charReceived=s;a-=s}t+=e.toString(this.encoding,0,a);var a=t.length-1;var i=t.charCodeAt(a);if(i>=55296&&i<=56319){var o=this.surrogateSize;this.charLength+=o;this.charReceived+=o;this.charBuffer.copy(this.charBuffer,o,0,o);this.charBuffer.write(t.charAt(t.length-1),this.encoding);return t.substring(0,a)}return t};s.prototype.detectIncompleteChar=function(e){var t=e.length>=3?3:e.length;for(;t>0;t--){var r=e[e.length-t];if(t==1&&r>>5==6){this.charLength=2;break}if(t<=2&&r>>4==14){this.charLength=3;break}if(t<=3&&r>>3==30){this.charLength=4;break}}return t};s.prototype.end=function(e){var t="";if(e&&e.length)t=this.write(e);if(this.charReceived){var r=this.charReceived;var n=this.charBuffer;var i=this.encoding;t+=n.slice(0,r).toString(i)}return t};function a(e){return e.toString(this.encoding)}function o(e){var t=this.charReceived=e.length%2;this.charLength=t?2:0;return t}function u(e){var t=this.charReceived=e.length%3;this.charLength=t?3:0;return t}},{buffer:2}],26:[function(e,t,r){(function(){"use strict";var t=e("punycode");r.parse=y;r.resolve=w;r.resolveObject=E;r.format=b;var n=/^([a-z0-9.+-]+:)/i,i=/:[0-9]*$/,s=["<",">",'"',"`"," ","\r","\n","	"],a=["{","}","|","\\","^","~","`"].concat(s),o=["'"].concat(s),u=["%","/","?",";","#"].concat(a).concat(o),f=["/","@","?","#"].concat(s),c=255,l=/^[a-zA-Z0-9][a-z0-9A-Z_-]{0,62}$/,h=/^([a-zA-Z0-9][a-z0-9A-Z_-]{0,62})(.*)$/,p={javascript:true,"javascript:":true},d={javascript:true,"javascript:":true},m={http:true,https:true,ftp:true,gopher:true,file:true,"http:":true,"ftp:":true,"gopher:":true,"file:":true},v={http:true,https:true,ftp:true,gopher:true,file:true,"http:":true,"https:":true,"ftp:":true,"gopher:":true,"file:":true},g=e("querystring");function y(e,r,i){if(e&&typeof e==="object"&&e.href)return e;if(typeof e!=="string"){throw new TypeError("Parameter 'url' must be a string, not "+typeof e)}var s={},a=e;a=a.trim();var m=n.exec(a);if(m){m=m[0];var y=m.toLowerCase();s.protocol=y;a=a.substr(m.length)}if(i||m||a.match(/^\/\/[^@\/]+@[^@\/]+/)){var w=a.substr(0,2)==="//";if(w&&!(m&&d[m])){a=a.substr(2);s.slashes=true}}if(!d[m]&&(w||m&&!v[m])){var E=a.indexOf("@");if(E!==-1){var _=a.slice(0,E);var T=true;for(var A=0,x=f.length;A<x;A++){if(_.indexOf(f[A])!==-1){T=false;break}}if(T){s.auth=decodeURIComponent(_);a=a.substr(E+1)}}var R=-1;for(var A=0,x=u.length;A<x;A++){var C=a.indexOf(u[A]);if(C!==-1&&(R<0||C<R))R=C}if(R!==-1){s.host=a.substr(0,R);a=a.substr(R)}else{s.host=a;a=""}var I=S(s.host);var L=Object.keys(I);for(var A=0,x=L.length;A<x;A++){var N=L[A];s[N]=I[N]}s.hostname=s.hostname||"";var q=s.hostname[0]==="["&&s.hostname[s.hostname.length-1]==="]";if(s.hostname.length>c){s.hostname=""}else if(!q){var D=s.hostname.split(/\./);for(var A=0,x=D.length;A<x;A++){var O=D[A];if(!O)continue;if(!O.match(l)){var j="";for(var P=0,k=O.length;P<k;P++){if(O.charCodeAt(P)>127){j+="x"}else{j+=O[P]}}if(!j.match(l)){var M=D.slice(0,A);var B=D.slice(A+1);var U=O.match(h);if(U){M.push(U[1]);B.unshift(U[2])}if(B.length){a="/"+B.join(".")+a}s.hostname=M.join(".");break}}}}s.hostname=s.hostname.toLowerCase();if(!q){var F=s.hostname.split(".");var H=[];for(var A=0;A<F.length;++A){var V=F[A];H.push(V.match(/[^A-Za-z0-9_-]/)?"xn--"+t.encode(V):V)}s.hostname=H.join(".")}s.host=(s.hostname||"")+(s.port?":"+s.port:"");s.href+=s.host;if(q){s.hostname=s.hostname.substr(1,s.hostname.length-2);if(a[0]!=="/"){a="/"+a}}}if(!p[y]){for(var A=0,x=o.length;A<x;A++){var z=o[A];var X=encodeURIComponent(z);if(X===z){X=escape(z)}a=a.split(z).join(X)}}var W=a.indexOf("#");if(W!==-1){s.hash=a.substr(W);a=a.slice(0,W)}var G=a.indexOf("?");if(G!==-1){s.search=a.substr(G);s.query=a.substr(G+1);if(r){s.query=g.parse(s.query)}a=a.slice(0,G)}else if(r){s.search="";s.query={}}if(a)s.pathname=a;if(v[m]&&s.hostname&&!s.pathname){s.pathname="/"}if(s.pathname||s.search){s.path=(s.pathname?s.pathname:"")+(s.search?s.search:"")}s.href=b(s);return s}function b(e){if(typeof e==="string")e=y(e);var t=e.auth||"";if(t){t=encodeURIComponent(t);t=t.replace(/%3A/i,":");t+="@"}var r=e.protocol||"",n=e.pathname||"",i=e.hash||"",s=false,a="";if(e.host!==undefined){s=t+e.host}else if(e.hostname!==undefined){s=t+(e.hostname.indexOf(":")===-1?e.hostname:"["+e.hostname+"]");if(e.port){s+=":"+e.port}}if(e.query&&typeof e.query==="object"&&Object.keys(e.query).length){a=g.stringify(e.query)}var o=e.search||a&&"?"+a||"";if(r&&r.substr(-1)!==":")r+=":";if(e.slashes||(!r||v[r])&&s!==false){s="//"+(s||"");if(n&&n.charAt(0)!=="/")n="/"+n}else if(!s){s=""}if(i&&i.charAt(0)!=="#")i="#"+i;if(o&&o.charAt(0)!=="?")o="?"+o;return r+s+n+o+i}function w(e,t){return b(E(e,t))}function E(e,t){if(!e)return t;e=y(b(e),false,true);t=y(b(t),false,true);e.hash=t.hash;if(t.href===""){e.href=b(e);return e}if(t.slashes&&!t.protocol){t.protocol=e.protocol;if(v[t.protocol]&&t.hostname&&!t.pathname){t.path=t.pathname="/"}t.href=b(t);return t}if(t.protocol&&t.protocol!==e.protocol){if(!v[t.protocol]){t.href=b(t);return t}e.protocol=t.protocol;if(!t.host&&!d[t.protocol]){var r=(t.pathname||"").split("/");while(r.length&&!(t.host=r.shift()));if(!t.host)t.host="";if(!t.hostname)t.hostname="";if(r[0]!=="")r.unshift("");if(r.length<2)r.unshift("");t.pathname=r.join("/")}e.pathname=t.pathname;e.search=t.search;e.query=t.query;e.host=t.host||"";e.auth=t.auth;e.hostname=t.hostname||t.host;e.port=t.port;if(e.pathname!==undefined||e.search!==undefined){e.path=(e.pathname?e.pathname:"")+(e.search?e.search:"")}e.slashes=e.slashes||t.slashes;e.href=b(e);return e}var n=e.pathname&&e.pathname.charAt(0)==="/",i=t.host!==undefined||t.pathname&&t.pathname.charAt(0)==="/",s=i||n||e.host&&t.pathname,a=s,o=e.pathname&&e.pathname.split("/")||[],r=t.pathname&&t.pathname.split("/")||[],u=e.protocol&&!v[e.protocol];if(u){delete e.hostname;delete e.port;if(e.host){if(o[0]==="")o[0]=e.host;else o.unshift(e.host)}delete e.host;if(t.protocol){delete t.hostname;delete t.port;if(t.host){if(r[0]==="")r[0]=t.host;else r.unshift(t.host)}delete t.host}s=s&&(r[0]===""||o[0]==="")}if(i){e.host=t.host||t.host===""?t.host:e.host;e.hostname=t.hostname||t.hostname===""?t.hostname:e.hostname;e.search=t.search;e.query=t.query;o=r}else if(r.length){if(!o)o=[];o.pop();o=o.concat(r);e.search=t.search;e.query=t.query}else if("search"in t){if(u){e.hostname=e.host=o.shift();var f=e.host&&e.host.indexOf("@")>0?e.host.split("@"):false;if(f){e.auth=f.shift();e.host=e.hostname=f.shift()}}e.search=t.search;e.query=t.query;if(e.pathname!==undefined||e.search!==undefined){e.path=(e.pathname?e.pathname:"")+(e.search?e.search:"")}e.href=b(e);return e}if(!o.length){delete e.pathname;if(!e.search){e.path="/"+e.search}else{delete e.path}e.href=b(e);return e}var c=o.slice(-1)[0];var l=(e.host||t.host)&&(c==="."||c==="..")||c==="";var h=0;for(var p=o.length;p>=0;p--){c=o[p];if(c=="."){o.splice(p,1)}else if(c===".."){o.splice(p,1);h++}else if(h){o.splice(p,1);h--}}if(!s&&!a){for(;h--;h){o.unshift("..")}}if(s&&o[0]!==""&&(!o[0]||o[0].charAt(0)!=="/")){o.unshift("")}if(l&&o.join("/").substr(-1)!=="/"){o.push("")}var m=o[0]===""||o[0]&&o[0].charAt(0)==="/";if(u){e.hostname=e.host=m?"":o.length?o.shift():"";var f=e.host&&e.host.indexOf("@")>0?e.host.split("@"):false;if(f){e.auth=f.shift();e.host=e.hostname=f.shift()}}s=s||e.host&&o.length;if(s&&!m){o.unshift("")}e.pathname=o.join("/");if(e.pathname!==undefined||e.search!==undefined){e.path=(e.pathname?e.pathname:"")+(e.search?e.search:"")}e.auth=t.auth||e.auth;e.slashes=e.slashes||t.slashes;e.href=b(e);return e}function S(e){var t={};var r=i.exec(e);if(r){r=r[0];if(r!==":"){t.port=r.substr(1)}e=e.substr(0,e.length-r.length)}if(e)t.hostname=e;return t}})()},{punycode:14,querystring:17}],27:[function(e,t,r){t.exports=function n(e){return e&&typeof e==="object"&&typeof e.copy==="function"&&typeof e.fill==="function"&&typeof e.readUInt8==="function"}},{}],28:[function(e,t,r){(function(t,n){var i=/%[sdj%]/g;r.format=function(e){if(!S(e)){var t=[];for(var r=0;r<arguments.length;r++){t.push(o(arguments[r]))}return t.join(" ")}var r=1;var n=arguments;var s=n.length;var a=String(e).replace(i,function(e){if(e==="%%")return"%";if(r>=s)return e;switch(e){case"%s":return String(n[r++]);case"%d":return Number(n[r++]);case"%j":try{return JSON.stringify(n[r++])}catch(t){return"[Circular]"}default:return e}});for(var u=n[r];r<s;u=n[++r]){if(b(u)||!x(u)){a+=" "+u}else{a+=" "+o(u)}}return a};r.deprecate=function(e,i){if(T(n.process)){return function(){return r.deprecate(e,i).apply(this,arguments)}}if(t.noDeprecation===true){return e}var s=false;function a(){if(!s){if(t.throwDeprecation){throw new Error(i)}else if(t.traceDeprecation){console.trace(i)}else{console.error(i)}s=true}return e.apply(this,arguments)}return a};var s={};var a;r.debuglog=function(e){if(T(a))a=t.env.NODE_DEBUG||"";e=e.toUpperCase();if(!s[e]){if(new RegExp("\\b"+e+"\\b","i").test(a)){var n=t.pid;s[e]=function(){var t=r.format.apply(r,arguments);console.error("%s %d: %s",e,n,t)}}else{s[e]=function(){}}}return s[e]};function o(e,t){var n={seen:[],stylize:f};if(arguments.length>=3)n.depth=arguments[2];if(arguments.length>=4)n.colors=arguments[3];if(y(t)){n.showHidden=t}else if(t){r._extend(n,t)}if(T(n.showHidden))n.showHidden=false;if(T(n.depth))n.depth=2;if(T(n.colors))n.colors=false;if(T(n.customInspect))n.customInspect=true;if(n.colors)n.stylize=u;return l(n,e,n.depth)}r.inspect=o;o.colors={bold:[1,22],italic:[3,23],underline:[4,24],inverse:[7,27],white:[37,39],grey:[90,39],black:[30,39],blue:[34,39],cyan:[36,39],green:[32,39],magenta:[35,39],red:[31,39],yellow:[33,39]};o.styles={special:"cyan",number:"yellow","boolean":"yellow",undefined:"grey","null":"bold",string:"green",date:"magenta",regexp:"red"};function u(e,t){var r=o.styles[t];if(r){return"["+o.colors[r][0]+"m"+e+"["+o.colors[r][1]+"m"}else{return e}}function f(e,t){return e}function c(e){var t={};e.forEach(function(e,r){t[e]=true});return t}function l(e,t,n){if(e.customInspect&&t&&I(t.inspect)&&t.inspect!==r.inspect&&!(t.constructor&&t.constructor.prototype===t)){var i=t.inspect(n,e);if(!S(i)){i=l(e,i,n)}return i}var s=h(e,t);if(s){return s}var a=Object.keys(t);var o=c(a);if(e.showHidden){a=Object.getOwnPropertyNames(t)}if(C(t)&&(a.indexOf("message")>=0||a.indexOf("description")>=0)){return p(t)
}if(a.length===0){if(I(t)){var u=t.name?": "+t.name:"";return e.stylize("[Function"+u+"]","special")}if(A(t)){return e.stylize(RegExp.prototype.toString.call(t),"regexp")}if(R(t)){return e.stylize(Date.prototype.toString.call(t),"date")}if(C(t)){return p(t)}}var f="",y=false,b=["{","}"];if(g(t)){y=true;b=["[","]"]}if(I(t)){var w=t.name?": "+t.name:"";f=" [Function"+w+"]"}if(A(t)){f=" "+RegExp.prototype.toString.call(t)}if(R(t)){f=" "+Date.prototype.toUTCString.call(t)}if(C(t)){f=" "+p(t)}if(a.length===0&&(!y||t.length==0)){return b[0]+f+b[1]}if(n<0){if(A(t)){return e.stylize(RegExp.prototype.toString.call(t),"regexp")}else{return e.stylize("[Object]","special")}}e.seen.push(t);var E;if(y){E=d(e,t,n,o,a)}else{E=a.map(function(r){return m(e,t,n,o,r,y)})}e.seen.pop();return v(E,f,b)}function h(e,t){if(T(t))return e.stylize("undefined","undefined");if(S(t)){var r="'"+JSON.stringify(t).replace(/^"|"$/g,"").replace(/'/g,"\\'").replace(/\\"/g,'"')+"'";return e.stylize(r,"string")}if(E(t))return e.stylize(""+t,"number");if(y(t))return e.stylize(""+t,"boolean");if(b(t))return e.stylize("null","null")}function p(e){return"["+Error.prototype.toString.call(e)+"]"}function d(e,t,r,n,i){var s=[];for(var a=0,o=t.length;a<o;++a){if(j(t,String(a))){s.push(m(e,t,r,n,String(a),true))}else{s.push("")}}i.forEach(function(i){if(!i.match(/^\d+$/)){s.push(m(e,t,r,n,i,true))}});return s}function m(e,t,r,n,i,s){var a,o,u;u=Object.getOwnPropertyDescriptor(t,i)||{value:t[i]};if(u.get){if(u.set){o=e.stylize("[Getter/Setter]","special")}else{o=e.stylize("[Getter]","special")}}else{if(u.set){o=e.stylize("[Setter]","special")}}if(!j(n,i)){a="["+i+"]"}if(!o){if(e.seen.indexOf(u.value)<0){if(b(r)){o=l(e,u.value,null)}else{o=l(e,u.value,r-1)}if(o.indexOf("\n")>-1){if(s){o=o.split("\n").map(function(e){return"  "+e}).join("\n").substr(2)}else{o="\n"+o.split("\n").map(function(e){return"   "+e}).join("\n")}}}else{o=e.stylize("[Circular]","special")}}if(T(a)){if(s&&i.match(/^\d+$/)){return o}a=JSON.stringify(""+i);if(a.match(/^"([a-zA-Z_][a-zA-Z_0-9]*)"$/)){a=a.substr(1,a.length-2);a=e.stylize(a,"name")}else{a=a.replace(/'/g,"\\'").replace(/\\"/g,'"').replace(/(^"|"$)/g,"'");a=e.stylize(a,"string")}}return a+": "+o}function v(e,t,r){var n=0;var i=e.reduce(function(e,t){n++;if(t.indexOf("\n")>=0)n++;return e+t.replace(/\u001b\[\d\d?m/g,"").length+1},0);if(i>60){return r[0]+(t===""?"":t+"\n ")+" "+e.join(",\n  ")+" "+r[1]}return r[0]+t+" "+e.join(", ")+" "+r[1]}function g(e){return Array.isArray(e)}r.isArray=g;function y(e){return typeof e==="boolean"}r.isBoolean=y;function b(e){return e===null}r.isNull=b;function w(e){return e==null}r.isNullOrUndefined=w;function E(e){return typeof e==="number"}r.isNumber=E;function S(e){return typeof e==="string"}r.isString=S;function _(e){return typeof e==="symbol"}r.isSymbol=_;function T(e){return e===void 0}r.isUndefined=T;function A(e){return x(e)&&N(e)==="[object RegExp]"}r.isRegExp=A;function x(e){return typeof e==="object"&&e!==null}r.isObject=x;function R(e){return x(e)&&N(e)==="[object Date]"}r.isDate=R;function C(e){return x(e)&&(N(e)==="[object Error]"||e instanceof Error)}r.isError=C;function I(e){return typeof e==="function"}r.isFunction=I;function L(e){return e===null||typeof e==="boolean"||typeof e==="number"||typeof e==="string"||typeof e==="symbol"||typeof e==="undefined"}r.isPrimitive=L;r.isBuffer=e("./support/isBuffer");function N(e){return Object.prototype.toString.call(e)}function q(e){return e<10?"0"+e.toString(10):e.toString(10)}var D=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];function O(){var e=new Date;var t=[q(e.getHours()),q(e.getMinutes()),q(e.getSeconds())].join(":");return[e.getDate(),D[e.getMonth()],t].join(" ")}r.log=function(){console.log("%s - %s",O(),r.format.apply(r,arguments))};r.inherits=e("inherits");r._extend=function(e,t){if(!t||!x(t))return e;var r=Object.keys(t);var n=r.length;while(n--){e[r[n]]=t[r[n]]}return e};function j(e,t){return Object.prototype.hasOwnProperty.call(e,t)}}).call(this,e("/Users/mauriciochavarriaga/Projects/aws-sdk-js/dist-tools/node_modules/browserify/node_modules/insert-module-globals/node_modules/process/browser.js"),typeof self!=="undefined"?self:typeof window!=="undefined"?window:{})},{"./support/isBuffer":27,"/Users/mauriciochavarriaga/Projects/aws-sdk-js/dist-tools/node_modules/browserify/node_modules/insert-module-globals/node_modules/process/browser.js":13,inherits:12}],29:[function(e,t,r){var n=e("../core");function i(e,t){if(!e){this.rules={type:"structure",members:{}};return}this.options=t;this.rules={};this.set_type(e.type);n.util.each.call(this,e,function(e,t){if(e!=="type")this["set_"+e](t)});if(this.rules.type==="blob"){if(this.rules.payload||this.rules.streaming){this.rules.type="binary"}else{this.rules.type="base64"}}}function s(e,t){i.call(this,e,t)}function a(e,t){i.call(this,e,t)}i.prototype={shapeClass:function(){if(this instanceof s)return s;if(this instanceof a)return a},xmlname:function(){if(this.rules.flattened){return this._xmlname||(this.rules.members||{}).name}else{return this._xmlname}},set_type:function(e){var t={structure:"structure",list:"list",map:"map","boolean":"boolean",timestamp:"timestamp",character:"string","double":"float","float":"float",integer:"integer","long":"integer","short":"integer",string:"string",blob:"blob",biginteger:"integer",bigdecimal:"float"};if(e==="string"){}else if(t[e]){this.rules.type=t[e]}else{throw new Error("unhandled shape type "+e)}},set_members:function(e){var t=this.rules.type;var r=this.shapeClass();if(t==="structure"){this.rules.members={};n.util.each.call(this,e,function(e,t){var n=new r(t,this.options);if(this.swapNames(n)){n.rules.name=e;e=n.xmlname()}this.rules.members[e]=n.rules})}else if(t==="list"){this.rules.members=new r(e,this.options).rules}else if(t==="map"){this.rules.members=new r(e,this.options).rules}else if(t==="blob"){this.rules.members={}}else{throw new Error("unhandled complex shape `"+t+"'")}},set_keys:function(e){var t=this.shapeClass();this.rules.keys=new t(e,this.options).rules},set_timestamp_format:function(e){this.rules.format=e},set_xmlname:function(e){this._xmlname=e;this.rules.name=e},set_location:function(e){this.rules.location=e==="http_status"?"status":e},set_location_name:function(e){this.rules.name=e},set_payload:function(e){if(e)this.rules.payload=true},set_flattened:function(e){if(e)this.rules.flattened=true},set_streaming:function(e){if(e)this.rules.streaming=true},set_xmlattribute:function(e){if(e)this.rules.attribute=true},set_xmlnamespace:function(e){this.rules.xmlns=e},set_documentation:function(e){if(this.options.documentation)this.rules.documentation=e},set_enum:function(e){if(this.options.documentation)this.rules["enum"]=e},set_wrapper:function(){},set_shape_name:function(){},set_box:function(){},set_sensitive:function(){}};s.prototype=n.util.merge(i.prototype,{swapNames:function(){return false},set_required:function(){this.rules.required=true},set_member_order:function(e){this.rules.order=e},set_min_length:function(e){if(this.options.documentation)this.rules.min_length=e},set_max_length:function(e){if(this.options.documentation)this.rules.max_length=e},set_pattern:function(e){if(this.options.documentation)this.rules.pattern=e}});a.prototype=n.util.merge(i.prototype,{swapNames:function(e){if(this.options.documentation)return false;return e.xmlname()&&["query","rest-xml"].indexOf(this.options.type)>=0},set_required:function(){},set_member_order:function(){},set_min_length:function(){},set_max_length:function(){},set_pattern:function(){}});function o(e,t){var r=e;function i(){if(t.type.indexOf("rest")<0)return;var i=t.type.indexOf("xml")>=0;var s=false;var a=false;var o=false;n.util.each(e.input.members,function(e,t){if(t.payload){o=true;s=e;delete t.payload;return n.util.abort}});if(!o){var u=[];n.util.each(e.input.members,function(e,t){if(!t.location){u.push(e)}});if(u.length>0){s=u;if(i)a=r.input.shape_name}}if(a)e.input=n.util.merge({wrapper:a},e.input);if(s)e.input=n.util.merge({payload:s},e.input)}function o(){var t=null;n.util.each(e.output.members,function(r,n){if(n.payload&&n.type==="structure"){delete n.payload;t=r}else if(n.payload||n.streaming){delete n.payload;e.output.payload=r}});if(t){var r=e.output.members[t];delete e.output.members[t];n.util.update(e.output.members,r.members)}}e=n.util.copy(e);e.input=new s(e.input,t).rules;e.output=new a(e.output,t).rules;e.input.members=e.input.members||{};e.output.members=e.output.members||{};i();o();if(e.http)delete e.http.response_code;if(t.documentation){e.errors=e.errors.map(function(e){return e.shape_name})}else{delete e.errors;delete e.documentation;delete e.documentation_url;delete e.response_code}return e}function u(e,t){function r(e){return e.replace(/_(\w)/g,function(e,t){return t.toUpperCase()})}function i(){var n=Object.keys(e);n.push("timestamp_format");n.sort().forEach(function(t){f[r(t)]=e[t]});f.timestampFormat=f.timestampFormat||"iso8601";if(f.jsonVersion)f.jsonVersion=f.jsonVersion.toString();if(f.jsonVersion==="1")f.jsonVersion="1.0";if(!t.documentation)delete f.documentation;if(!f.resultWrapped)delete f.resultWrapped;if(!e.type.match(/xml/))delete f.xmlnamespace;delete f.operations;delete f.pagination;delete f.waiters;delete f.type}function s(){f.operations={};n.util.each(e.operations,function(e,r){var n=e[0].toLowerCase()+e.substr(1);n=n.replace(/\d{4}_\d{2}_\d{2}$/,"");var i=new o(r,t);f.operations[n]=i})}function a(){if(e.pagination){f.pagination={};n.util.each(e.pagination,function(e,t){var i={};n.util.each(t,function(e,t){i[r(e)]=t});f.pagination[e[0].toLowerCase()+e.substr(1)]=i})}}function u(){if(e.waiters){f.waiters={};n.util.each(e.waiters,function(e,t){var i={};n.util.each(t,function(e,t){i[r(e)]=t});f.waiters[e[0].toLowerCase()+e.substr(1)]=i})}}if(typeof e==="string"||n.util.Buffer.isBuffer(e)){e=JSON.parse(e)}t=t||{};t.type=e.type;var f={};f.format=e.type;i();s();a();u();return f}n.API={Translator:u};t.exports=u},{"../core":32}],30:[function(e,t,r){window.AWS=t.exports=e("./core");e("./http/xhr");e("./services")},{"./core":32,"./http/xhr":40,"./services":53}],31:[function(e,t,r){var n=e("./core");e("./credentials");e("./credentials/credential_provider_chain");n.Config=n.util.inherit({constructor:function i(e){if(e===undefined)e={};e=this.extractCredentials(e);n.util.each.call(this,this.keys,function(t,r){this.set(t,e[t],r)})},update:function s(e,t){t=t||false;e=this.extractCredentials(e);n.util.each.call(this,e,function(e,r){if(t||this.keys.hasOwnProperty(e))this[e]=r})},getCredentials:function a(e){var t=this;function r(r){e(r,r?null:t.credentials)}function i(e,t){return new n.util.error(t||new Error,{code:"CredentialsError",message:e})}function s(){t.credentials.get(function(e){if(e){var n="Could not load credentials from "+t.credentials.constructor.name;e=i(n,e)}r(e)})}function a(){var e=null;if(!t.credentials.accessKeyId||!t.credentials.secretAccessKey){e=i("Missing credentials")}r(e)}if(t.credentials){if(typeof t.credentials.get==="function"){s()}else{a()}}else if(t.credentialProvider){t.credentialProvider.resolve(function(e,n){if(e){e=i("Could not load credentials from any providers",e)}t.credentials=n;r(e)})}else{r(i("No credentials to load"))}},loadFromPath:function o(e){this.clear();var t=JSON.parse(n.util.readFileSync(e));var r=new n.FileSystemCredentials(e);var i=new n.CredentialProviderChain;i.providers.unshift(r);i.resolve(function(e,r){if(e)throw e;else t.credentials=r});this.constructor(t);return this},clear:function u(){n.util.each.call(this,this.keys,function(e){delete this[e]});this.set("credentials",undefined);this.set("credentialProvider",undefined)},set:function f(e,t,r){if(t===undefined){if(r===undefined){r=this.keys[e]}if(typeof r==="function"){this[e]=r.call(this)}else{this[e]=r}}else{this[e]=t}},keys:{credentials:null,credentialProvider:null,region:null,logger:null,apiVersions:{},apiVersion:null,endpoint:undefined,httpOptions:{},maxRetries:undefined,maxRedirects:10,paramValidation:true,sslEnabled:true,s3ForcePathStyle:false,computeChecksums:true,dynamoDbCrc32:true},extractCredentials:function c(e){if(e.accessKeyId&&e.secretAccessKey){e=n.util.copy(e);e.credentials=new n.Credentials(e)}return e}});n.config=new n.Config},{"./core":32,"./credentials":33,"./credentials/credential_provider_chain":34}],32:[function(e,t,r){var n={};var i={};i={};t.exports=n;e("./util");n.util.update(n,{VERSION:"2.0.0-rc11",ServiceInterface:{},Signers:{},XML:{}});e("./service");e("./credentials");e("./credentials/credential_provider_chain");e("./credentials/temporary_credentials");e("./credentials/web_identity_credentials");e("./credentials/saml_credentials");e("./config");e("./http");e("./sequential_executor");e("./event_listeners");e("./request");e("./response");e("./resource_waiter");e("./signers/request_signer");e("./param_validator");n.events=new n.SequentialExecutor;if(typeof window!=="undefined")window.AWS=n},{"./config":31,"./credentials":33,"./credentials/credential_provider_chain":34,"./credentials/saml_credentials":35,"./credentials/temporary_credentials":36,"./credentials/web_identity_credentials":37,"./event_listeners":38,"./http":39,"./param_validator":42,"./request":43,"./resource_waiter":44,"./response":45,"./sequential_executor":46,"./service":47,"./signers/request_signer":56,"./util":63}],33:[function(e,t,r){var n=e("./core");n.Credentials=n.util.inherit({constructor:function i(){n.util.hideProperties(this,["secretAccessKey"]);this.expired=false;this.expireTime=null;if(arguments.length==1&&typeof arguments[0]==="object"){var e=arguments[0].credentials||arguments[0];this.accessKeyId=e.accessKeyId;this.secretAccessKey=e.secretAccessKey;this.sessionToken=e.sessionToken}else{this.accessKeyId=arguments[0];this.secretAccessKey=arguments[1];this.sessionToken=arguments[2]}},expiryWindow:15,needsRefresh:function s(){var e=n.util.date.getDate().getTime();var t=new Date(e+this.expiryWindow*1e3);if(this.expireTime&&t>this.expireTime){return true}else{return this.expired||!this.accessKeyId||!this.secretAccessKey}},get:function a(e){var t=this;if(this.needsRefresh()){this.refresh(function(r){if(!r)t.expired=false;if(e)e(r)})}else if(e){e()}},refresh:function o(e){this.expired=false;e()}})},{"./core":32}],34:[function(e,t,r){var n=e("../core");n.CredentialProviderChain=n.util.inherit(n.Credentials,{constructor:function i(e){if(e){this.providers=e}else{this.providers=n.CredentialProviderChain.defaultProviders.slice(0)}},resolve:function s(e){if(this.providers.length===0){e(new Error("No providers"));return}var t=0;var r=this.providers.slice(0);function n(i,s){if(!i&&s||t===r.length){e(i,s);return}var a=r[t++];if(typeof a==="function"){s=a.call()}else{s=a}if(s.get){s.get(function(e){n(e,e?null:s)})}else{n(null,s)}}n();return this}});n.CredentialProviderChain.defaultProviders=[]},{"../core":32}],35:[function(e,t,r){var n=e("../core");n.SAMLCredentials=n.util.inherit(n.Credentials,{constructor:function i(e){n.Credentials.call(this);this.expired=true;this.service=new n.STS;this.params=e},refresh:function s(e){var t=this;if(!e)e=function(e){if(e)throw e};t.service.assumeRoleWithSAML(t.params,function(r,n){if(!r){t.service.credentialsFrom(n,t)}e(r)})}})},{"../core":32}],36:[function(e,t,r){var n=e("../core");n.TemporaryCredentials=n.util.inherit(n.Credentials,{constructor:function i(e){n.Credentials.call(this);this.loadMasterCredentials();this.service=new n.STS;this.expired=true;this.params=e||{};if(this.params.RoleArn){this.params.RoleSessionName=this.params.RoleSessionName||"temporary-credentials"}},refresh:function s(e){var t=this;if(!e)e=function(e){if(e)throw e};t.service.config.credentials=t.masterCredentials;var r=t.params.RoleArn?t.service.assumeRole:t.service.getSessionToken;r.call(t.service,t.params,function(r,n){if(!r){t.service.credentialsFrom(n,t)}e(r)})},loadMasterCredentials:function a(){this.masterCredentials=n.config.credentials;while(this.masterCredentials.masterCredentials){this.masterCredentials=this.masterCredentials.masterCredentials}}})},{"../core":32}],37:[function(e,t,r){var n=e("../core");n.WebIdentityCredentials=n.util.inherit(n.Credentials,{constructor:function i(e){n.Credentials.call(this);this.expired=true;this.service=new n.STS;this.params=e;this.params.RoleSessionName=this.params.RoleSessionName||"web-identity"},refresh:function s(e){var t=this;if(!e)e=function(e){if(e)throw e};t.service.assumeRoleWithWebIdentity(t.params,function(r,n){if(!r){t.service.credentialsFrom(n,t)}e(r)})}})},{"../core":32}],38:[function(e,t,r){var n=e("./core");e("./sequential_executor");e("./service_interface/json");e("./service_interface/query");e("./service_interface/rest");e("./service_interface/rest_json");e("./service_interface/rest_xml");n.EventListeners={Core:{}};n.EventListeners={Core:(new n.SequentialExecutor).addNamedListeners(function(e,t){t("VALIDATE_CREDENTIALS","validate",function r(e,t){e.service.config.getCredentials(function(r){if(r){e.response.err=n.util.error(r,{code:"SigningError",message:"Missing credentials in config"})}t()})});e("VALIDATE_REGION","validate",function i(e){if(!e.service.config.region&&!e.service.hasGlobalEndpoint()){e.response.error=n.util.error(new Error,{code:"SigningError",message:"Missing region in config"})}});e("VALIDATE_PARAMETERS","validate",function s(e){var t=e.service.api.operations[e.operation].input;(new n.ParamValidator).validate(t,e.params)});e("SET_CONTENT_LENGTH","afterBuild",function a(e){if(e.httpRequest.headers["Content-Length"]===undefined){var t=n.util.string.byteLength(e.httpRequest.body);e.httpRequest.headers["Content-Length"]=t}});e("SET_HTTP_HOST","afterBuild",function o(e){e.httpRequest.headers["Host"]=e.httpRequest.endpoint.host});t("SIGN","sign",function u(e,t){if(!e.service.api.signatureVersion)return t();e.service.config.getCredentials(function(r,i){if(r){e.response.error=r;return t()}try{var s=n.util.date.getDate();var a=e.service.getSignerClass(e);var o=new a(e.httpRequest,e.service.api.signingName||e.service.api.endpointPrefix);delete e.httpRequest.headers["Authorization"];delete e.httpRequest.headers["Date"];delete e.httpRequest.headers["X-Amz-Date"];o.addAuthorization(i,s)}catch(u){e.response.error=u}t()})});e("VALIDATE_RESPONSE","validateResponse",function f(e){if(this.service.successfulResponse(e,this)){e.data={};e.error=null}else{e.data=null;e.error=n.util.error(new Error,{code:"UnknownError",message:"An unknown error occurred."})}});t("SEND","send",function c(e,t){function r(r){e.httpResponse.stream=r;e.httpResponse._abortCallback=t;r.on("headers",function i(t,s){e.request.emit("httpHeaders",[t,s,e]);if(!e.request.httpRequest._streaming){if(n.HttpClient.streamsApiVersion===2){r.on("readable",function a(){var t=r.read();if(t!==null){e.request.emit("httpData",[t,e])}})}else{r.on("data",function o(t){e.request.emit("httpData",[t,e])})}}});r.on("end",function s(){e.request.emit("httpDone");t()})}function i(t){t.on("sendProgress",function r(t){e.request.emit("httpUploadProgress",[t,e])});t.on("receiveProgress",function n(t){e.request.emit("httpDownloadProgress",[t,e])})}function s(r){e.error=n.util.error(r,{code:"NetworkingError",region:e.request.httpRequest.region,hostname:e.request.httpRequest.endpoint.hostname,retryable:true});e.request.emit("httpError",[e.error,e],function(){t()})}e.error=null;e.data=null;var a=n.HttpClient.getInstance();var o=e.request.service.config.httpOptions||{};var u=a.handleRequest(this.httpRequest,o,r,s);i(u)});e("HTTP_HEADERS","httpHeaders",function l(e,t,r){r.httpResponse.statusCode=e;r.httpResponse.headers=t;r.httpResponse.body=new n.util.Buffer("");r.httpResponse.buffers=[];r.httpResponse.numBytes=0});e("HTTP_DATA","httpData",function h(e,t){if(e){if(n.util.isNode()){t.httpResponse.numBytes+=e.length;var r=t.httpResponse.headers["content-length"];var i={loaded:t.httpResponse.numBytes,total:r};t.request.emit("httpDownloadProgress",[i,t])}t.httpResponse.buffers.push(new n.util.Buffer(e))}});e("HTTP_DONE","httpDone",function p(e){if(e.httpResponse.buffers&&e.httpResponse.buffers.length>0){var t=n.util.buffer.concat(e.httpResponse.buffers);e.httpResponse.body=t}delete e.httpResponse.numBytes;delete e.httpResponse.buffers});e("FINALIZE_ERROR","retry",function d(e){if(e.httpResponse.statusCode){e.error.statusCode=e.httpResponse.statusCode;if(e.error.retryable===undefined){e.error.retryable=this.service.retryableError(e.error,this)}}});e("INVALIDATE_CREDENTIALS","retry",function m(e){switch(e.error.code){case"RequestExpired":case"ExpiredTokenException":case"ExpiredToken":e.error.retryable=true;e.request.service.config.credentials.expired=true}});e("REDIRECT","retry",function v(e){if(e.error&&e.error.statusCode>=300&&e.error.statusCode<400&&e.httpResponse.headers["location"]){this.httpRequest.endpoint=new n.Endpoint(e.httpResponse.headers["location"]);e.error.redirect=true;e.error.retryable=true}});e("RETRY_CHECK","retry",function g(e){if(e.error){if(e.error.redirect&&e.redirectCount<e.maxRedirects){e.error.retryDelay=0;e.redirectCount++;e.error._willRetry=true}else if(e.error.retryable&&e.retryCount<e.maxRetries){var t=this.service.retryDelays();e.error.retryDelay=t[e.retryCount]||0;e.retryCount++;e.error._willRetry=true}else{e.error._willRetry=false}}});t("RESET_RETRY_STATE","afterRetry",function y(e,t){if(e.error&&e.error._willRetry){var r=e.error.retryDelay||0;e.error=null;setTimeout(t,r)}else{t()}})}),CorePost:(new n.SequentialExecutor).addNamedListeners(function(e){e("EXTRACT_REQUEST_ID","extractData",function t(e){e.requestId=e.httpResponse.headers["x-amz-request-id"]||e.httpResponse.headers["x-amzn-requestid"]})}),Logger:(new n.SequentialExecutor).addNamedListeners(function(t){t("LOG_REQUEST","complete",function r(t){var r=t.request;var i=r.service.config.logger;if(!i)return;function s(){var s=n.util.date.getDate().getTime();var a=(s-r.startTime.getTime())/1e3;var o=i.isTTY?true:false;var u=t.httpResponse.statusCode;var f=e("util").inspect(r.params,true,true);var c="";if(o)c+="[33m";c+="[AWS "+r.service.serviceIdentifier+" "+u;c+=" "+a.toString()+"s "+t.retryCount+" retries]";if(o)c+="[0;1m";c+=" "+r.operation+"("+f+")";if(o)c+="[0m";return c}var a=s();if(typeof i.log==="function"){i.log(a)}else if(typeof i.write==="function"){i.write(a+"\n")}})}),Json:(new n.SequentialExecutor).addNamedListeners(function(e){var t=n.ServiceInterface.Json;e("BUILD","build",t.buildRequest);e("EXTRACT_DATA","extractData",t.extractData);e("EXTRACT_ERROR","extractError",t.extractError)}),Rest:(new n.SequentialExecutor).addNamedListeners(function(e){var t=n.ServiceInterface.Rest;e("BUILD","build",t.buildRequest);e("EXTRACT_DATA","extractData",t.extractData);e("EXTRACT_ERROR","extractError",t.extractError)}),RestJson:(new n.SequentialExecutor).addNamedListeners(function(e){var t=n.ServiceInterface.RestJson;e("BUILD","build",t.buildRequest);e("EXTRACT_DATA","extractData",t.extractData);e("EXTRACT_ERROR","extractError",t.extractError)}),RestXml:(new n.SequentialExecutor).addNamedListeners(function(e){var t=n.ServiceInterface.RestXml;e("BUILD","build",t.buildRequest);e("EXTRACT_DATA","extractData",t.extractData);e("EXTRACT_ERROR","extractError",t.extractError)}),Query:(new n.SequentialExecutor).addNamedListeners(function(e){var t=n.ServiceInterface.Query;e("BUILD","build",t.buildRequest);e("EXTRACT_DATA","extractData",t.extractData);e("EXTRACT_ERROR","extractError",t.extractError)})}},{"./core":32,"./sequential_executor":46,"./service_interface/json":48,"./service_interface/query":49,"./service_interface/rest":50,"./service_interface/rest_json":51,"./service_interface/rest_xml":52,util:28}],39:[function(e,t,r){var n=e("./core");var i=n.util.inherit;n.Endpoint=i({constructor:function s(e,t){n.util.hideProperties(this,["slashes","auth","hash","search","query"]);if(typeof e==="undefined"||e===null){throw new Error("Invalid endpoint: "+e)}else if(typeof e!=="string"){return n.util.copy(e)}if(!e.match(/^http/)){var r=t&&t.sslEnabled!==undefined?t.sslEnabled:n.config.sslEnabled;e=(r?"https":"http")+"://"+e}n.util.update(this,n.util.urlParse(e));if(this.port){this.port=parseInt(this.port,10)}else{this.port=this.protocol==="https:"?443:80}}});n.HttpRequest=i({constructor:function a(e,t){e=new n.Endpoint(e);this.method="POST";this.path=e.path||"/";this.headers={};this.body="";this.endpoint=e;this.region=t;this.setUserAgent()},setUserAgent:function o(){var e=n.util.isBrowser()?"X-Amz-":"";this.headers[e+"User-Agent"]=n.util.userAgent()},pathname:function u(){return this.path.split("?",1)[0]},search:function f(){return this.path.split("?",2)[1]||""}});n.HttpResponse=i({constructor:function c(){this.statusCode=undefined;this.headers={};this.body=undefined}});n.HttpClient=i({});n.HttpClient.getInstance=function l(){if(this.singleton===undefined){this.singleton=new this}return this.singleton}},{"./core":32}],40:[function(e,t,r){var n=e("../core");var i=e("events").EventEmitter;e("../http");n.XHRClient=n.util.inherit({handleRequest:function s(e,t,r,a){var o=this;var u=e.endpoint;var f=new i;var c=u.protocol+"//"+u.hostname;if(u.port!=80&&u.port!=443){c+=":"+u.port}c+=e.path;var l=new XMLHttpRequest;e.stream=l;if(t.timeout){l.timeout=t.timeout}l.addEventListener("readystatechange",function(){if(l.status===0)return;if(this.readyState===this.HEADERS_RECEIVED){try{l.responseType="arraybuffer"}catch(e){}f.statusCode=l.status;f.headers=o.parseHeaders(l.getAllResponseHeaders());f.emit("headers",f.statusCode,f.headers)}else if(this.readyState===this.DONE){o.finishRequest(l,f)}},false);l.upload.addEventListener("progress",function(e){f.emit("sendProgress",e)});l.addEventListener("progress",function(e){f.emit("receiveProgress",e)},false);l.addEventListener("timeout",function(){a(n.util.error(new Error("Timeout"),{code:"TimeoutError"}))},false);l.addEventListener("error",function(){a(n.util.error(new Error("Network Failure"),{code:"NetworkingError"}))},false);r(f);l.open(e.method,c,true);n.util.each(e.headers,function(e,t){if(e!=="Content-Length"&&e!=="User-Agent"&&e!=="Host"){l.setRequestHeader(e,t)}});if(e.body&&typeof e.body.buffer==="object"){l.send(e.body.buffer)}else{l.send(e.body)}return f},parseHeaders:function a(e){var t={};n.util.arrayEach(e.split(/\r?\n/),function(e){var r=e.split(":",1)[0];var n=e.substring(r.length+2);if(r.length>0)t[r]=n});return t},finishRequest:function o(e,t){var r;if(e.responseType==="arraybuffer"&&e.response){var i=e.response;r=new n.util.Buffer(i.byteLength);var s=new Uint8Array(i);for(var a=0;a<r.length;++a){r[a]=s[a]}}try{if(!r&&typeof e.responseText==="string"){r=new n.util.Buffer(e.responseText)}}catch(o){}if(r)t.emit("data",r);t.emit("end")}});n.HttpClient.prototype=n.XHRClient.prototype;n.HttpClient.streamsApiVersion=1},{"../core":32,"../http":39,events:11}],41:[function(e,t,r){var n=e("../core");var i=n.util.inherit;n.JSON={};n.JSON.Builder=i({constructor:function s(e,t){this.rules=e;this.timestampFormat=t.timestampFormat},build:function a(e){return JSON.stringify(this.translate(this.rules,e))},translate:function o(e,t){if(t===null||t===undefined)return undefined;if(e.type=="structure"){var r={};n.util.each.call(this,t,function(t,n){var i=e.members[t]||{};var s=this.translate(i,n);if(s!==undefined)r[t]=s});return r}else if(e.type=="list"){var i=[];n.util.arrayEach.call(this,t,function(t){var r=e.members||{};var n=this.translate(r,t);if(n!==undefined)i.push(n)});return i}else if(e.type=="map"){var s={};n.util.each.call(this,t,function(t,r){var n=e.members||{};var i=this.translate(n,r);if(i!==undefined)s[t]=i});return s}else if(e.type=="timestamp"){var a=e.format||this.timestampFormat;return n.util.date.format(t,a)}else if(e.type=="integer"){return parseInt(t,10)}else if(e.type=="float"){return parseFloat(t)}else{return t}}})},{"../core":32}],42:[function(e,t,r){var n=e("./core");n.ParamValidator=n.util.inherit({validate:function i(e,t,r){var i=(e||{}).members||{};var s=e?e.xml:null;if(s){i=n.util.merge(i,(i[s]||{}).members||{});delete i[s]}return this.validateStructure(i,t||{},r||"params")},validateStructure:function s(e,t,r){this.validateType(r,t,["object"],"structure");for(var n in e){if(!e.hasOwnProperty(n))continue;var i=t[n];var s=i===undefined||i===null;if(e[n].required&&s){this.fail("MissingRequiredParameter","Missing required key '"+n+"' in "+r)}}for(n in t){if(!t.hasOwnProperty(n))continue;var a=t[n],o=e[n];if(o!==undefined){var u=[r,n].join(".");this.validateMember(o,a,u)}else{this.fail("UnexpectedParameter","Unexpected key '"+n+"' found in "+r)}}return true},validateMember:function a(e,t,r){var n=e.members||{};switch(e.type){case"structure":return this.validateStructure(n,t,r);case"list":return this.validateList(n,t,r);case"map":return this.validateMap(n,t,r);default:return this.validateScalar(e,t,r)}},validateList:function o(e,t,r){this.validateType(r,t,[Array]);for(var n=0;n<t.length;n++){this.validateMember(e,t[n],r+"["+n+"]")}},validateMap:function u(e,t,r){this.validateType(r,t,["object"],"map");for(var n in t){if(!t.hasOwnProperty(n))continue;this.validateMember(e,t[n],r+"['"+n+"']")}},validateScalar:function f(e,t,r){switch(e.type){case null:case undefined:case"string":return this.validateType(r,t,["string"]);case"base64":case"binary":return this.validatePayload(r,t);case"integer":case"float":return this.validateNumber(r,t);case"boolean":return this.validateType(r,t,["boolean"]);case"timestamp":return this.validateType(r,t,[Date,/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/,"number"],"Date object, ISO-8601 string, or a UNIX timestamp");default:return this.fail("UnkownType","Unhandled type "+e.type+" for "+r)}},fail:function c(e,t){throw n.util.error(new Error(t),{code:e})},validateType:function l(e,t,r,i){if(t===null||t===undefined)return;var s=false;for(var a=0;a<r.length;a++){if(typeof r[a]==="string"){if(typeof t===r[a])return}else if(r[a]instanceof RegExp){if((t||"").toString().match(r[a]))return}else{if(t instanceof r[a])return;if(n.util.isType(t,r[a]))return;if(!i&&!s)r=r.slice();r[a]=n.util.typeName(r[a])}s=true}var o=i;if(!o){o=r.join(", ").replace(/,([^,]+)$/,", or$1")}var u=o.match(/^[aeiou]/i)?"n":"";this.fail("InvalidParameterType","Expected "+e+" to be a"+u+" "+o)},validateNumber:function h(e,t){if(t===null||t===undefined)return;if(typeof t==="string"){var r=parseFloat(t);if(r.toString()===t)t=r}return this.validateType(e,t,["number"])},validatePayload:function p(t,r){if(r===null||r===undefined)return;if(typeof r==="string")return;if(r&&typeof r.byteLength==="number")return;if(n.util.isNode()){var i=e("stream").Stream;if(n.util.Buffer.isBuffer(r)||r instanceof i)return}var s=["Buffer","Stream","File","Blob","ArrayBuffer","DataView"];if(r){for(var a=0;a<s.length;a++){if(n.util.isType(r,s[a]))return;if(n.util.typeName(r.constructor)===s[a])return}}this.fail("InvalidParameterType","Expected "+t+" to be a "+"string, Buffer, Stream, Blob, or typed array object")}})},{"./core":32,stream:19}],43:[function(e,t,r){(function(t){var r=e("./core");var n=e("./state_machine");var i=r.util.inherit;var s=new n;s.setupStates=function(){var e=["success","error","complete"];var t=function n(t,r){try{var n=this;var i=n.response.error;n.emit(n._asm.currentState,function(){if(n.response.error&&i!=n.response.error){if(e.indexOf(this._asm.currentState)>=0){this._hardError=true}}r(n.response.error)})}catch(s){this.response.error=s;if(e.indexOf(this._asm.currentState)>=0){this._hardError=true}r(s)}};this.addState("validate","build","error",t);this.addState("restart","build","error",function(e,t){e=this.response.error;if(!e)return t();if(!e.retryable)return t(e);if(this.response.retryCount<this.service.config.maxRetries){this.response.retryCount++;t()}else{t(e)}});this.addState("build","afterBuild","restart",t);this.addState("afterBuild","sign","restart",t);this.addState("sign","send","retry",t);this.addState("retry","afterRetry","afterRetry",t);this.addState("afterRetry","sign","error",t);this.addState("send","validateResponse","retry",t);this.addState("validateResponse","extractData","extractError",t);
this.addState("extractError","extractData","retry",t);this.addState("extractData","success","retry",t);this.addState("success","complete","complete",t);this.addState("error","complete","complete",t);this.addState("complete",null,"uncaughtException",t);this.addState("uncaughtException",function(e,t){try{r.SequentialExecutor.prototype.unhandledErrorCallback.call(this,e)}catch(n){if(this._hardError)throw e}t(e)})};s.setupStates();r.Request=i({constructor:function a(e,t,i){var a=e.endpoint;var o=e.config.region;if(e.hasGlobalEndpoint())o="us-east-1";this.service=e;this.operation=t;this.params=i||{};this.httpRequest=new r.HttpRequest(a,o);this.startTime=r.util.date.getDate();this.response=new r.Response(this);this.restartCount=0;this._asm=new n(s.states,"validate");r.SequentialExecutor.call(this);this.emit=this.emitEvent},send:function o(e){if(e){this.on("complete",function(t){try{e.call(t,t.error,t.data)}catch(r){t.request._hardError=true;throw r}})}this.runTo();return this.response},build:function u(e){this._hardError=e?false:true;return this.runTo("send",e)},runTo:function f(e,t){this._asm.runTo(e,t,this);return this},abort:function c(){this.removeAllListeners("validateResponse");this.removeAllListeners("extractError");this.on("validateResponse",function e(t){t.error=r.util.error(new Error("Request aborted by user"),{code:"RequestAbortedError",retryable:false})});if(this.httpRequest.stream){this.httpRequest.stream.abort();this.httpRequest._abortCallback()}return this},eachPage:function l(e){function t(r){var n=e.call(r,r.error,r.data);if(n===false)return;if(r.hasNextPage()){r.nextPage().on("complete",t).send()}else{e.call(r,null,null)}}this.on("complete",t).send()},eachItem:function h(e){function t(t,n){if(t)return e(t,null);if(n===null)return e(null,null);var i=this.request.service.paginationConfig(this.request.operation);var s=i.resultKey;if(Array.isArray(s))s=s[0];var a=r.util.jamespath.query(s,n);r.util.arrayEach(a,function(t){r.util.arrayEach(t,function(t){e(null,t)})})}this.eachPage(t)},isPageable:function p(){return this.service.paginationConfig(this.operation)?true:false},createReadStream:function d(){var n=e("stream");var i=this;var s=null;var a=false;if(r.HttpClient.streamsApiVersion===2){s=new n.Readable;s._read=function(){s.push("")}}else{s=new n.Stream;s.readable=true}s.sent=false;s.on("newListener",function(e){if(!s.sent&&(e==="data"||e==="readable")){if(e==="data")a=true;s.sent=true;t.nextTick(function(){i.send(function(){})})}});this.on("httpHeaders",function o(e,t,n){if(e<300){this.httpRequest._streaming=true;i.removeListener("httpData",r.EventListeners.Core.HTTP_DATA);i.removeListener("httpError",r.EventListeners.Core.HTTP_ERROR);i.on("httpError",function f(e,t){t.error=e;t.error.retryable=false});var o=n.httpResponse.stream;s.response=n;s._read=function(){var e;while(e=o.read()){s.push(e)}s.push("")};var u=["end","error",a?"data":"readable"];r.util.arrayEach(u,function(e){o.on(e,function(t){s.emit(e,t)})})}});this.on("error",function(e){s.emit("error",e)});return s},emitEvent:function m(e,t,n){if(typeof t==="function"){n=t;t=null}if(!n)n=this.unhandledErrorCallback;if(!t)t=this.eventParameters(e,this.response);var i=r.SequentialExecutor.prototype.emit;i.call(this,e,t,function(e){if(e)this.response.error=e;n.call(this,e)})},eventParameters:function v(e){switch(e){case"validate":case"sign":case"build":case"afterBuild":return[this];case"error":return[this.response.error,this.response];default:return[this.response]}}});r.util.mixin(r.Request,r.SequentialExecutor)}).call(this,e("/Users/mauriciochavarriaga/Projects/aws-sdk-js/dist-tools/node_modules/browserify/node_modules/insert-module-globals/node_modules/process/browser.js"))},{"./core":32,"./state_machine":62,"/Users/mauriciochavarriaga/Projects/aws-sdk-js/dist-tools/node_modules/browserify/node_modules/insert-module-globals/node_modules/process/browser.js":13,stream:19}],44:[function(e,t,r){var n=e("./core");var i=n.util.inherit;n.ResourceWaiter=i({constructor:function s(e,t){this.service=e;this.state=t;this.config={};if(typeof this.state==="object"){n.util.each.call(this,this.state,function(e,t){this.state=e;this.expectedValue=t})}this.loadWaiterConfig(this.state);if(!this.expectedValue){this.expectedValue=this.config.successValue}this.config.operation=n.util.string.lowerFirst(this.config.operation)},service:null,state:null,expectedValue:null,config:null,waitDone:false,Listeners:{retry:(new n.SequentialExecutor).addNamedListeners(function(e){e("RETRY_CHECK","retry",function(e){var t=e.request._waiter;if(e.error&&e.error.code==="ResourceNotReady"){e.error.retryDelay=t.config.interval*1e3}})}),output:(new n.SequentialExecutor).addNamedListeners(function(e){e("CHECK_OUT_ERROR","extractError",function t(e){if(e.error){e.request._waiter.setError(e,true)}});e("CHECK_OUTPUT","extractData",function r(e){var t=e.request._waiter;var r=t.checkSuccess(e);if(!r){t.setError(e,r===null?false:true)}else{e.error=null}})}),error:(new n.SequentialExecutor).addNamedListeners(function(e){e("CHECK_ERROR","extractError",function t(e){var t=e.request._waiter;var r=t.checkError(e);if(!r){t.setError(e,r===null?false:true)}else{e.error=null;e.request.removeAllListeners("extractData")}});e("CHECK_ERR_OUTPUT","extractData",function r(e){e.request._waiter.setError(e,true)})})},wait:function a(e,t){if(typeof e==="function"){t=e;e=undefined}var r=this.service.makeRequest(this.config.operation,e);var n=this.Listeners[this.config.successType];r._waiter=this;r.response.maxRetries=this.config.maxAttempts;r.addListeners(this.Listeners.retry);if(n)r.addListeners(n);if(t)r.send(t);return r},setError:function o(e,t){e.data=null;e.error=n.util.error(e.error||new Error,{code:"ResourceNotReady",message:"Resource is not in the state "+this.state,retryable:t})},checkSuccess:function u(e){if(!this.config.successPath){return e.httpResponse.statusCode<300}var t=n.util.jamespath.find(this.config.successPath,e.data);if(this.config.failureValue&&this.config.failureValue.indexOf(t)>=0){return null}if(this.expectedValue){return t===this.expectedValue}else{return t?true:false}},checkError:function f(e){return e.httpResponse.statusCode===this.config.successValue},loadWaiterConfig:function c(e,t){if(!this.service.api.waiters[e]){if(t)return;throw new n.util.error(new Error,{code:"StateNotFoundError",message:"State "+e+" not found."})}if(e!=="__default__"){var r=this.service.api.waiters[e]["extends"];r=r||"__default__";this.loadWaiterConfig(r,true)}var i=this.config;n.util.update(i,this.service.api.waiters[e]);(function(){i.successType=i.successType||i.acceptorType;i.successPath=i.successPath||i.acceptorPath;i.successValue=i.successValue||i.acceptorValue;i.failureType=i.failureType||i.acceptorType;i.failurePath=i.failurePath||i.acceptorPath;i.failureValue=i.failureValue||i.acceptorValue})()}})},{"./core":32}],45:[function(e,t,r){var n=e("./core");var i=n.util.inherit;n.Response=i({constructor:function s(e){this.request=e;this.data=null;this.error=null;this.retryCount=0;this.redirectCount=0;this.httpResponse=new n.HttpResponse;if(e){this.maxRetries=e.service.numRetries();this.maxRedirects=e.service.config.maxRedirects}},nextPage:function a(e){var t;var r=this.request.service;var i=this.request.operation;try{t=r.paginationConfig(i,true)}catch(s){this.error=s}if(!this.hasNextPage()){if(e)e(this.error,null);else if(this.error)throw this.error;return null}var a=n.util.copy(this.request.params);if(!this.nextPageTokens){return e?e(null,null):null}else{var o=t.inputToken;if(typeof o==="string")o=[o];for(var u=0;u<o.length;u++){a[o[u]]=this.nextPageTokens[u]}return r.makeRequest(this.request.operation,a,e)}},hasNextPage:function o(){this.cacheNextPageTokens();if(this.nextPageTokens)return true;if(this.nextPageTokens===undefined)return undefined;else return false},cacheNextPageTokens:function u(){if(this.hasOwnProperty("nextPageTokens"))return this.nextPageTokens;this.nextPageTokens=undefined;var e=this.request.service.paginationConfig(this.request.operation);if(!e)return this.nextPageTokens;this.nextPageTokens=null;if(e.moreResults){if(!n.util.jamespath.find(e.moreResults,this.data)){return this.nextPageTokens}}var t=e.outputToken;if(typeof t==="string")t=[t];n.util.arrayEach.call(this,t,function(e){var t=n.util.jamespath.find(e,this.data);if(t){this.nextPageTokens=this.nextPageTokens||[];this.nextPageTokens.push(t)}});return this.nextPageTokens}})},{"./core":32}],46:[function(e,t,r){var n=e("./core");var i=n.util.nodeRequire("domain");n.SequentialExecutor=n.util.inherit({constructor:function s(){this.domain=i&&i.active;this._events={}},listeners:function a(e){return this._events[e]?this._events[e].slice(0):[]},on:function o(e,t){if(this._events[e]){this._events[e].push(t)}else{this._events[e]=[t]}return this},onAsync:function u(e,t){t._isAsync=true;return this.on(e,t)},removeListener:function f(e,t){var r=this._events[e];if(r){var n=r.length;var i=-1;for(var s=0;s<n;++s){if(r[s]===t){i=s}}if(i>-1){r.splice(i,1)}}return this},removeAllListeners:function c(e){if(e){delete this._events[e]}else{this._events={}}return this},emit:function l(e,t,r){if(!r)r=this.unhandledErrorCallback;if(i&&this.domain instanceof i.Domain)this.domain.enter();var n=this.listeners(e);var s=n.length;this.callListeners(n,t,r);return s>0},callListeners:function h(e,t,r){if(e.length===0){r.call(this);if(i&&this.domain instanceof i.Domain)this.domain.exit()}else{var n=e.shift();if(n._isAsync){var s=function(n){if(n){r.call(this,n);if(i&&this.domain instanceof i.Domain)this.domain.exit()}else{this.callListeners(e,t,r)}}.bind(this);n.apply(this,t.concat([s]))}else{try{n.apply(this,t);this.callListeners(e,t,r)}catch(a){r.call(this,a);if(i&&this.domain instanceof i.Domain)this.domain.exit()}}}},addListeners:function p(e){var t=this;if(e._events)e=e._events;n.util.each(e,function(e,r){if(typeof r==="function")r=[r];n.util.arrayEach(r,function(r){t.on(e,r)})});return t},addNamedListener:function d(e,t,r){this[e]=r;this.addListener(t,r);return this},addNamedAsyncListener:function m(e,t,r){r._isAsync=true;return this.addNamedListener(e,t,r)},addNamedListeners:function v(e){var t=this;e(function(){t.addNamedListener.apply(t,arguments)},function(){t.addNamedAsyncListener.apply(t,arguments)});return this},unhandledErrorCallback:function g(e){if(e){if(i&&this.domain instanceof i.Domain){e.domainEmitter=this;e.domain=this.domain;e.domainThrown=false;this.domain.emit("error",e)}else{throw e}}}});n.SequentialExecutor.prototype.addListener=n.SequentialExecutor.prototype.on},{"./core":32}],47:[function(e,t,r){(function(t){var r=e("./core");var n=e("./api/translator");var i=r.util.inherit;r.Service=i({constructor:function s(e){if(!this.loadServiceClass){throw r.util.error(new Error,"Service must be constructed with `new' operator")}var t=this.loadServiceClass(e||{});if(t)return new t(e);this.initialize(e)},initialize:function a(e){r.util.hideProperties(this,["client"]);this.client=this;this.config=new r.Config(r.config);if(e)this.config.update(e,true);this.setEndpoint(this.config.endpoint)},loadServiceClass:function o(e){var t=e;if(!r.util.isEmpty(this.api)){return}else if(t.apiConfig){return r.Service.defineServiceApi(this.constructor,t.apiConfig)}else if(!this.constructor.services){return}else{t=new r.Config(r.config);t.update(e,true);var n=t.apiVersions[this.constructor.serviceIdentifier];n=n||t.apiVersion;return this.getLatestServiceClass(n)}},getLatestServiceClass:function u(e){e=this.getLatestServiceVersion(e);if(this.constructor.services[e]===null){r.Service.defineServiceApi(this.constructor,e)}return this.constructor.services[e]},getLatestServiceVersion:function f(e){if(!this.constructor.services||this.constructor.services.length===0){throw new Error("No services defined on "+this.constructor.serviceIdentifier)}if(!e){e="latest"}else if(r.util.isType(e,Date)){e=r.util.date.iso8601(e).split("T")[0]}if(Object.hasOwnProperty(this.constructor.services,e)){return e}var t=Object.keys(this.constructor.services).sort();var n=null;for(var i=t.length-1;i>=0;i--){if(t[i][t[i].length-1]!=="*"){n=t[i]}if(t[i].substr(0,10)<=e){return n}}throw new Error("Could not find "+this.constructor.serviceIdentifier+" API to satisfy version constraint `"+e+"'")},api:{},defaultRetryCount:3,makeRequest:function c(e,t,n){if(typeof t==="function"){n=t;t=null}t=t||{};if(this.config.params){var i=this.api.operations[e];if(i){t=r.util.copy(t);r.util.each(this.config.params,function(e,r){if(i.input.members[e]){if(t[e]===undefined||t[e]===null){t[e]=r}}})}}var s=new r.Request(this,e,t);this.addAllRequestListeners(s);if(n)s.send(n);return s},makeUnauthenticatedRequest:function l(e,t,n){if(typeof t==="function"){n=t;t={}}var i=this.makeRequest(e,t);i.removeListener("validate",r.EventListeners.Core.VALIDATE_CREDENTIALS);i.removeListener("sign",r.EventListeners.Core.SIGN);if(this.api.format==="query"){i.addListener("build",function s(e){e.httpRequest.method="GET";e.httpRequest.path="/?"+e.httpRequest.body;e.httpRequest.body="";delete e.httpRequest.headers["Content-Length"];delete e.httpRequest.headers["Content-Type"]})}return n?i.send(n):i},waitFor:function h(e,t,n){var i=new r.ResourceWaiter(this,e);return i.wait(t,n)},addAllRequestListeners:function p(e){var t=[r.events,r.EventListeners.Core,this.serviceInterface(),r.EventListeners.CorePost];for(var n=0;n<t.length;n++){if(t[n])e.addListeners(t[n])}if(!this.config.paramValidation){e.removeListener("validate",r.EventListeners.Core.VALIDATE_PARAMETERS)}if(this.config.logger){e.addListeners(r.EventListeners.Logger)}this.setupRequestListeners(e)},setupRequestListeners:function d(){},getSignerClass:function m(){var e=this.api.signatureVersion;if(this.config.signatureVersion)e=this.config.signatureVersion;else if(this.isRegionV4())e="v4";return r.Signers.RequestSigner.getVersion(e)},serviceInterface:function v(){switch(this.api.format){case"query":return r.EventListeners.Query;case"json":return r.EventListeners.Json;case"rest-json":return r.EventListeners.RestJson;case"rest-xml":return r.EventListeners.RestXml}if(this.api.format){throw new Error("Invalid service `format' "+this.api.format+" in API config")}},successfulResponse:function g(e){return e.httpResponse.statusCode<300},numRetries:function y(){if(this.config.maxRetries!==undefined){return this.config.maxRetries}else{return this.defaultRetryCount}},retryDelays:function b(){var e=this.numRetries();var t=[];for(var r=0;r<e;++r){t[r]=Math.pow(2,r)*30}return t},retryableError:function w(e){if(this.networkingError(e))return true;if(this.expiredCredentialsError(e))return true;if(this.throttledError(e))return true;if(e.statusCode>=500)return true;return false},networkingError:function E(e){return e.code=="NetworkingError"},expiredCredentialsError:function S(e){return e.code==="ExpiredTokenException"},throttledError:function _(e){return e.code=="ProvisionedThroughputExceededException"},setEndpoint:function T(e){if(e){this.endpoint=new r.Endpoint(e,this.config)}else if(this.hasGlobalEndpoint()){this.endpoint=new r.Endpoint(this.api.globalEndpoint,this.config)}else{var t=this.api.endpointPrefix+"."+this.config.region+this.endpointSuffix();this.endpoint=new r.Endpoint(t,this.config)}},hasGlobalEndpoint:function A(){if(this.isRegionV4())return false;return this.api.globalEndpoint},endpointSuffix:function x(){var e=".amazonaws.com";if(this.isRegionCN())return e+".cn";else return e},isRegionCN:function R(){if(!this.config.region)return false;return this.config.region.match(/^cn-/)?true:false},isRegionV4:function C(){return this.isRegionCN()},paginationConfig:function I(e,t){function n(e){if(t){var n=new Error;throw r.util.error(n,"No pagination configuration for "+e)}return null}if(!this.api.pagination)return n("service");if(!this.api.pagination[e])return n(e);return this.api.pagination[e]}});r.util.update(r.Service,{defineMethods:function L(e){r.util.each(e.prototype.api.operations,function t(r){if(e.prototype[r])return;e.prototype[r]=function(e,t){return this.makeRequest(r,e,t)}})},defineService:function N(e,t,n){if(!Array.isArray(t)){n=t;t=[]}var s=i(r.Service,n||{});if(typeof e==="string"){var a={};for(var o=0;o<t.length;o++){a[t[o]]=null}s.services=s.services||a;s.apiVersions=Object.keys(s.services).sort();s.serviceIdentifier=s.serviceIdentifier||e}else{s.prototype.api=e;r.Service.defineMethods(s)}return s},defineServiceApi:function q(s,a,o){var u=i(s,{serviceIdentifier:s.serviceIdentifier});function f(e){if(e.type&&e.api_version){u.prototype.api=new n(e,{documentation:false})}else{u.prototype.api=e}}if(typeof a==="string"){if(o){f(o)}else{var c=s.serviceIdentifier+"-"+a;var l=t+"/../apis/"+c+".json";try{var h=e("fs");f(JSON.parse(h.readFileSync(l)))}catch(p){throw r.util.error(p,{message:"Could not find API configuration "+c})}}if(!s.services.hasOwnProperty(a)){s.apiVersions.push(a)}s.services[a]=u}else{f(a)}r.Service.defineMethods(u);return u}})}).call(this,"/")},{"./api/translator":29,"./core":32,fs:1}],48:[function(e,t,r){var n=e("../core");e("../json/builder");n.ServiceInterface.Json={buildRequest:function i(e){var t=e.httpRequest;var r=e.service.api;var i=r.targetPrefix+"."+r.operations[e.operation].name;var s=r.jsonVersion||"1.0";var a=r.operations[e.operation].input;var o=new n.JSON.Builder(a,r);t.body=o.build(e.params||{});t.headers["Content-Type"]="application/x-amz-json-"+s;t.headers["X-Amz-Target"]=i},extractError:function s(e){var t={};var r=e.httpResponse;if(r.body.length>0){var i=JSON.parse(r.body.toString());if(i.__type||i.code){t.code=(i.__type||i.code).split("#").pop()}else{t.code="UnknownError"}if(t.code==="RequestEntityTooLarge"){t.message="Request body must be less than 1 MB"}else{t.message=i.message||i.Message||null}}else{t.code=r.statusCode;t.message=null}e.error=n.util.error(new Error,t)},extractData:function a(e){e.data=JSON.parse(e.httpResponse.body.toString()||"{}")}}},{"../core":32,"../json/builder":41}],49:[function(e,t,r){var n=e("../core");var i=n.util.inherit;e("../xml/parser");n.ServiceInterface.Query={buildRequest:function s(e){var t=e.service.api.operations[e.operation];var r=e.httpRequest;r.headers["Content-Type"]="application/x-www-form-urlencoded; charset=utf-8";r.params={Version:e.service.api.apiVersion,Action:t.name};var i=t.input;if(i)i=i.members;var s=new n.QueryParamSerializer(i,e.service.api);s.serialize(e.params,function(e,t){r.params[e]=t});r.body=n.util.queryParamsToString(r.params)},extractError:function a(e){var t,r=e.httpResponse.body.toString();if(r.match("<UnknownOperationException")){t={Code:"UnknownOperation",Message:"Unknown operation "+e.request.operation}}else{t=new n.XML.Parser({}).parse(r)}if(t.Errors)t=t.Errors;if(t.Error)t=t.Error;if(t.Code){e.error=n.util.error(new Error,{code:t.Code,message:t.Message})}else{e.error=n.util.error(new Error,{code:e.httpResponse.statusCode,message:null})}},extractData:function o(e){var t=e.request;var r=t.service.api.operations[t.operation];var i=r.name+"Result";var s=r.output||{};if(t.service.api.resultWrapped){var a={type:"structure",members:{}};a.members[i]=s;s=a}var o=new n.XML.Parser(s);var u=o.parse(e.httpResponse.body.toString());if(t.service.api.resultWrapped){if(u[i]){n.util.update(u,u[i]);delete u[i]}}e.data=u}};n.QueryParamSerializer=i({constructor:function u(e,t){this.rules=e;this.timestampFormat=t?t.timestampFormat:"iso8601"},serialize:function f(e,t){this.serializeStructure("",e,this.rules,t)},serializeStructure:function c(e,t,r,i){var s=this;n.util.each(t,function(t,n){var a=r[t].name||t;var o=e?e+"."+a:a;s.serializeMember(o,n,r[t],i)})},serializeMap:function l(e,t,r,i){var s=1;var a=this;n.util.each(t,function(t,n){var o=r.flattened?".":".entry.";var u=o+s++ +".";var f=u+(r.keys.name||"key");var c=u+(r.members.name||"value");a.serializeMember(e+f,t,r.keys,i);a.serializeMember(e+c,n,r.members,i)})},serializeList:function h(e,t,r,i){var s=this;var a=r.members||{};n.util.arrayEach(t,function(t,n){var o="."+(n+1);if(r.flattened){if(a.name){var u=e.split(".");u.pop();u.push(a.name);e=u.join(".")}}else{o=".member"+o}s.serializeMember(e+o,t,a,i)})},serializeMember:function p(e,t,r,i){if(t===null||t===undefined)return;if(r.type==="structure"){this.serializeStructure(e,t,r.members,i)}else if(r.type==="list"){this.serializeList(e,t,r,i)}else if(r.type==="map"){this.serializeMap(e,t,r,i)}else if(r.type==="timestamp"){var s=r.format||this.timestampFormat;i.call(this,e,n.util.date.format(t,s))}else{i.call(this,e,String(t))}}})},{"../core":32,"../xml/parser":65}],50:[function(e,t,r){var n=e("../core");n.ServiceInterface.Rest={buildRequest:function i(e){n.ServiceInterface.Rest.populateMethod(e);n.ServiceInterface.Rest.populateURI(e);n.ServiceInterface.Rest.populateHeaders(e)},extractError:function s(){},extractData:function a(e){var t=e.request;var r={};var i=e.httpResponse;var s=t.service.api.operations[t.operation];var a=(s.output||{}).members||{};var o={};n.util.each(i.headers,function(e,t){o[e.toLowerCase()]=t});n.util.each(a,function(e,t){if(t.location==="header"){var s=(t.name||e).toLowerCase();if(t.type=="map"){r[e]={};n.util.each(i.headers,function(n,i){var s=n.match(new RegExp("^"+t.name+"(.+)","i"));if(s!==null){r[e][s[1]]=i}})}if(o[s]!==undefined){r[e]=o[s]}}if(t.location==="status"){r[e]=parseInt(i.statusCode,10)}});e.data=r},populateMethod:function o(e){e.httpRequest.method=e.service.api.operations[e.operation].http.method},populateURI:function u(e){var t=e.service.api.operations[e.operation];var r=[e.httpRequest.endpoint.path,t.http.uri].join("/");r=r.replace(/\/+/g,"/");var i=r.split(/\?/)[0];var s=(t.input||{}).members||{};var a=e.service.escapePathParam||n.ServiceInterface.Rest.escapePathParam;var o=e.service.escapeQuerystringParam||n.ServiceInterface.Rest.escapeQuerystringParam;n.util.each.call(this,s,function(t,n){if(n.location=="uri"&&e.params[t]){var s=i.match("{"+t+"}")?a(e.params[t]):o(e.params[t]);r=r.replace("{"+t+"}",s)}});var u=r.split("?")[0];var f=r.split("?")[1];if(f){var c=[];n.util.arrayEach(f.split("&"),function(e){if(!e.match("{\\w+}"))c.push(e)});r=c.length>0?u+"?"+c.join("&"):u}else{r=u}e.httpRequest.path=r},escapePathParam:function f(e){return n.util.uriEscape(String(e))},escapeQuerystringParam:function c(e){return n.util.uriEscape(String(e))},populateHeaders:function l(e){var t=e.service.api.operations[e.operation];var r=(t.input||{}).members||{};n.util.each.call(this,r,function(t,r){if(r.location==="header"&&e.params[t]){if(r.type==="map"){n.util.each(e.params[t],function(t,n){e.httpRequest.headers[r.name+t]=n})}else{var i=e.params[t];if(r.type==="timestamp"){var s=r.format||e.service.api.timestampFormat;i=n.util.date.format(i,s)}e.httpRequest.headers[r.name||t]=i}}})}}},{"../core":32}],51:[function(e,t,r){var n=e("../core");e("./rest");e("./json");n.ServiceInterface.RestJson={buildRequest:function i(e){n.ServiceInterface.Rest.buildRequest(e);n.ServiceInterface.RestJson.populateBody(e)},extractError:function s(e){n.ServiceInterface.Json.extractError(e)},extractData:function a(e){n.ServiceInterface.Rest.extractData(e);var t=e.request;var r=t.service.api.operations[t.operation].output||{};if(r.payload&&r.members[r.payload]){if(r.members[r.payload].streaming){e.data[r.payload]=e.httpResponse.body}else{e.data[r.payload]=e.httpResponse.body.toString()}}else{var i=e.data;n.ServiceInterface.Json.extractData(e);e.data=n.util.merge(i,e.data)}},populateBody:function o(e){var t=e.service.api.operations[e.operation].input;var r=t.payload;var i={};if(typeof r==="string"){var s=t.members[r];i=e.params[r];if(i===undefined)return;if(s.type==="structure"){e.httpRequest.body=this.buildJSON(i,t,e.service.api)}else{e.httpRequest.body=i}}else if(r){n.util.arrayEach(r,function(t){if(e.params[t]!==undefined){i[t]=e.params[t]}});e.httpRequest.body=this.buildJSON(i,t,e.service.api)}},buildJSON:function u(e,t,r){var i=new n.JSON.Builder(t,r);return i.build(e)}}},{"../core":32,"./json":48,"./rest":50}],52:[function(e,t,r){var n=e("../core");e("../xml/builder");e("./rest");n.ServiceInterface.RestXml={buildRequest:function i(e){n.ServiceInterface.Rest.buildRequest(e);n.ServiceInterface.RestXml.populateBody(e)},extractError:function s(e){n.ServiceInterface.Rest.extractError(e);var t=new n.XML.Parser({}).parse(e.httpResponse.body.toString());if(t.Errors)t=t.Errors;if(t.Error)t=t.Error;if(t.Code){e.error=n.util.error(new Error,{code:t.Code,message:t.Message})}else{e.error=n.util.error(new Error,{code:e.httpResponse.statusCode,message:null})}},extractData:function a(e){n.ServiceInterface.Rest.extractData(e);var t=e.request;var r=e.httpResponse;var i=t.service.api.operations[t.operation];var s=i.output.members;var a=i.output;var o=a.payload;if(o){if(s[o].streaming){e.data[o]=r.body}else{e.data[o]=r.body.toString()}}else if(r.body.length>0){var u=new n.XML.Parser(i.output||{});n.util.update(e.data,u.parse(r.body.toString()))}},populateBody:function o(e){var t=e.service.api.operations[e.operation].input;var r=t.payload;var i={};var s=null;var a=e.params;if(typeof r==="string"){i=t.members[r];a=a[r];if(a===undefined)return;if(i.type==="structure"){s=new n.XML.Builder(r,i.members,e.service.api);e.httpRequest.body=s.toXML(a)}else{e.httpRequest.body=a}}else if(r){n.util.arrayEach(r,function(e){i[e]=t.members[e]});s=new n.XML.Builder(t.wrapper,i,e.service.api);e.httpRequest.body=s.toXML(a)}}}},{"../core":32,"../xml/builder":64,"./rest":50}],53:[function(e,t,r){var n=e("./core");t.exports=n;n.Service.defineServiceApi(e("./services/kinesis"),"2013-12-02",{format:"json",apiVersion:"2013-12-02",endpointPrefix:"kinesis",jsonVersion:"1.1",serviceAbbreviation:"Kinesis",serviceFullName:"Amazon Kinesis",signatureVersion:"v4",targetPrefix:"Kinesis_20131202",timestampFormat:"iso8601",operations:{createStream:{name:"CreateStream",input:{type:"structure",members:{StreamName:{required:true},ShardCount:{type:"integer",required:true}}},output:{type:"structure",members:{}}},deleteStream:{name:"DeleteStream",input:{type:"structure",members:{StreamName:{required:true}}},output:{type:"structure",members:{}}},describeStream:{name:"DescribeStream",input:{type:"structure",members:{StreamName:{required:true},Limit:{type:"integer"},ExclusiveStartShardId:{}}},output:{type:"structure",members:{StreamDescription:{type:"structure",members:{StreamName:{},StreamARN:{},StreamStatus:{},Shards:{type:"list",members:{type:"structure",members:{ShardId:{},ParentShardId:{},AdjacentParentShardId:{},HashKeyRange:{type:"structure",members:{StartingHashKey:{},EndingHashKey:{}}},SequenceNumberRange:{type:"structure",members:{StartingSequenceNumber:{},EndingSequenceNumber:{}}}}}},HasMoreShards:{type:"boolean"}}}}}},getRecords:{name:"GetRecords",input:{type:"structure",members:{ShardIterator:{required:true},Limit:{type:"integer"}}},output:{type:"structure",members:{Records:{type:"list",members:{type:"structure",members:{SequenceNumber:{},Data:{type:"base64"},PartitionKey:{}}}},NextShardIterator:{}}}},getShardIterator:{name:"GetShardIterator",input:{type:"structure",members:{StreamName:{required:true},ShardId:{required:true},ShardIteratorType:{required:true},StartingSequenceNumber:{}}},output:{type:"structure",members:{ShardIterator:{}}}},listStreams:{name:"ListStreams",input:{type:"structure",members:{Limit:{type:"integer"},ExclusiveStartStreamName:{}}},output:{type:"structure",members:{StreamNames:{type:"list",members:{}},HasMoreStreams:{type:"boolean"}}}},mergeShards:{name:"MergeShards",input:{type:"structure",members:{StreamName:{required:true},ShardToMerge:{required:true},AdjacentShardToMerge:{required:true}}},output:{type:"structure",members:{}}},putRecord:{name:"PutRecord",input:{type:"structure",members:{StreamName:{required:true},Data:{type:"base64",required:true},PartitionKey:{required:true},ExplicitHashKey:{},SequenceNumberForOrdering:{}}},output:{type:"structure",members:{ShardId:{},SequenceNumber:{}}}},splitShard:{name:"SplitShard",input:{type:"structure",members:{StreamName:{required:true},ShardToSplit:{required:true},NewStartingHashKey:{required:true}}},output:{type:"structure",members:{}}}}})},{"./core":32,"./services/kinesis":54}],54:[function(e,t,r){var n=e("../core");n.Kinesis=n.Service.defineService("kinesis",["2013-12-02"]);t.exports=n.Kinesis},{"../core":32}],55:[function(e,t,r){var n=e("../core");e("./v3");var i=n.util.inherit;n.Signers.CloudFront=i(n.Signers.S3,{stringToSign:function s(){return this.request.headers["X-Amz-Date"]}});t.exports=n.Signers.CloudFront},{"../core":32,"./v3":59}],56:[function(e,t,r){var n=e("../core");var i=n.util.inherit;n.Signers.RequestSigner=i({constructor:function s(e){this.request=e}});n.Signers.RequestSigner.getVersion=function a(e){switch(e){case"v2":return n.Signers.V2;case"v3":return n.Signers.V3;case"v4":return n.Signers.V4;case"s3":return n.Signers.S3;case"v3https":return n.Signers.V3Https;case"cloudfront":return n.Signers.CloudFront}throw new Error("Unknown signing version "+e)};e("./v2");e("./v3");e("./v3https");e("./v4");e("./s3");e("./cloudfront")},{"../core":32,"./cloudfront":55,"./s3":57,"./v2":58,"./v3":59,"./v3https":60,"./v4":61}],57:[function(e,t,r){var n=e("../core");var i=n.util.inherit;n.Signers.S3=i(n.Signers.RequestSigner,{subResources:{acl:1,cors:1,lifecycle:1,"delete":1,location:1,logging:1,notification:1,partNumber:1,policy:1,requestPayment:1,restore:1,tagging:1,torrent:1,uploadId:1,uploads:1,versionId:1,versioning:1,versions:1,website:1},responseHeaders:{"response-content-type":1,"response-content-language":1,"response-expires":1,"response-cache-control":1,"response-content-disposition":1,"response-content-encoding":1},addAuthorization:function s(e,t){if(!this.request.headers["presigned-expires"]){this.request.headers["X-Amz-Date"]=n.util.date.rfc822(t)}if(e.sessionToken){this.request.headers["x-amz-security-token"]=e.sessionToken}var r=this.sign(e.secretAccessKey,this.stringToSign());var i="AWS "+e.accessKeyId+":"+r;this.request.headers["Authorization"]=i},stringToSign:function a(){var e=this.request;var t=[];t.push(e.method);t.push(e.headers["Content-MD5"]||"");t.push(e.headers["Content-Type"]||"");t.push(e.headers["presigned-expires"]||"");var r=this.canonicalizedAmzHeaders();if(r)t.push(r);t.push(this.canonicalizedResource());return t.join("\n")},canonicalizedAmzHeaders:function o(){var e=[];n.util.each(this.request.headers,function(t){if(t.match(/^x-amz-/i))e.push(t)});e.sort(function(e,t){return e.toLowerCase()<t.toLowerCase()?-1:1});var t=[];n.util.arrayEach.call(this,e,function(e){t.push(e.toLowerCase()+":"+String(this.request.headers[e]))});return t.join("\n")},canonicalizedResource:function u(){var e=this.request;var t=e.path.split("?");var r=t[0];var i=t[1];var s="";if(e.virtualHostedBucket)s+="/"+e.virtualHostedBucket;s+=r;if(i){var a=[];n.util.arrayEach.call(this,i.split("&"),function(e){var t=e.split("=")[0];var r=e.split("=")[1];if(this.subResources[t]||this.responseHeaders[t]){var n={name:t};if(r!==undefined){if(this.subResources[t]){n.value=r}else{n.value=decodeURIComponent(r)}}a.push(n)}});a.sort(function(e,t){return e.name<t.name?-1:1});if(a.length){i=[];n.util.arrayEach(a,function(e){if(e.value===undefined)i.push(e.name);else i.push(e.name+"="+e.value)});s+="?"+i.join("&")}}return s},sign:function f(e,t){return n.util.crypto.hmac(e,t,"base64","sha1")}});t.exports=n.Signers.S3},{"../core":32}],58:[function(e,t,r){var n=e("../core");var i=n.util.inherit;n.Signers.V2=i(n.Signers.RequestSigner,{addAuthorization:function s(e,t){if(!t)t=n.util.date.getDate();var r=this.request;r.params.Timestamp=n.util.date.iso8601(t);r.params.SignatureVersion="2";r.params.SignatureMethod="HmacSHA256";r.params.AWSAccessKeyId=e.accessKeyId;if(e.sessionToken){r.params.SecurityToken=e.sessionToken}delete r.params.Signature;r.params.Signature=this.signature(e);r.body=n.util.queryParamsToString(r.params);r.headers["Content-Length"]=r.body.length},signature:function a(e){return n.util.crypto.hmac(e.secretAccessKey,this.stringToSign(),"base64")},stringToSign:function o(){var e=[];e.push(this.request.method);e.push(this.request.endpoint.host.toLowerCase());
e.push(this.request.pathname());e.push(n.util.queryParamsToString(this.request.params));return e.join("\n")}});t.exports=n.Signers.V2},{"../core":32}],59:[function(e,t,r){var n=e("../core");var i=n.util.inherit;n.Signers.V3=i(n.Signers.RequestSigner,{addAuthorization:function s(e,t){var r=n.util.date.rfc822(t);this.request.headers["X-Amz-Date"]=r;if(e.sessionToken){this.request.headers["x-amz-security-token"]=e.sessionToken}this.request.headers["X-Amzn-Authorization"]=this.authorization(e,r)},authorization:function a(e){return"AWS3 "+"AWSAccessKeyId="+e.accessKeyId+","+"Algorithm=HmacSHA256,"+"SignedHeaders="+this.signedHeaders()+","+"Signature="+this.signature(e)},signedHeaders:function o(){var e=[];n.util.arrayEach(this.headersToSign(),function t(r){e.push(r.toLowerCase())});return e.sort().join(";")},canonicalHeaders:function u(){var e=this.request.headers;var t=[];n.util.arrayEach(this.headersToSign(),function r(n){t.push(n.toLowerCase().trim()+":"+String(e[n]).trim())});return t.sort().join("\n")+"\n"},headersToSign:function f(){var e=[];n.util.each(this.request.headers,function t(r){if(r==="Host"||r==="Content-Encoding"||r.match(/^X-Amz/i)){e.push(r)}});return e},signature:function c(e){return n.util.crypto.hmac(e.secretAccessKey,this.stringToSign(),"base64")},stringToSign:function l(){var e=[];e.push(this.request.method);e.push("/");e.push("");e.push(this.canonicalHeaders());e.push(this.request.body);return n.util.crypto.sha256(e.join("\n"))}});t.exports=n.Signers.V3},{"../core":32}],60:[function(e,t,r){var n=e("../core");var i=n.util.inherit;e("./v3");n.Signers.V3Https=i(n.Signers.V3,{authorization:function s(e){return"AWS3-HTTPS "+"AWSAccessKeyId="+e.accessKeyId+","+"Algorithm=HmacSHA256,"+"Signature="+this.signature(e)},stringToSign:function a(){return this.request.headers["X-Amz-Date"]}});t.exports=n.Signers.V3Https},{"../core":32,"./v3":59}],61:[function(e,t,r){var n=e("../core");var i=n.util.inherit;var s={};n.Signers.V4=i(n.Signers.RequestSigner,{constructor:function a(e,t){n.Signers.RequestSigner.call(this,e);this.serviceName=t},addAuthorization:function o(e,t){var r=n.util.date.iso8601(t).replace(/[:\-]|\.\d{3}/g,"");this.addHeaders(e,r);this.updateBody(e);this.request.headers["Authorization"]=this.authorization(e,r)},addHeaders:function u(e,t){this.request.headers["X-Amz-Date"]=t;if(e.sessionToken){this.request.headers["x-amz-security-token"]=e.sessionToken}},updateBody:function f(e){if(this.request.params){this.request.params.AWSAccessKeyId=e.accessKeyId;if(e.sessionToken){this.request.params.SecurityToken=e.sessionToken}this.request.body=n.util.queryParamsToString(this.request.params);this.request.headers["Content-Length"]=this.request.body.length}},authorization:function c(e,t){var r=[];var n=this.credentialString(t);r.push("AWS4-HMAC-SHA256 Credential="+e.accessKeyId+"/"+n);r.push("SignedHeaders="+this.signedHeaders());r.push("Signature="+this.signature(e,t));return r.join(", ")},signature:function l(e,t){var r=s[this.serviceName];var i=t.substr(0,8);if(!r||r.akid!==e.accessKeyId||r.region!==this.request.region||r.date!==i){var a=e.secretAccessKey;var o=n.util.crypto.hmac("AWS4"+a,i,"buffer");var u=n.util.crypto.hmac(o,this.request.region,"buffer");var f=n.util.crypto.hmac(u,this.serviceName,"buffer");var c=n.util.crypto.hmac(f,"aws4_request","buffer");s[this.serviceName]={region:this.request.region,date:i,key:c,akid:e.accessKeyId}}var l=s[this.serviceName].key;return n.util.crypto.hmac(l,this.stringToSign(t),"hex")},stringToSign:function h(e){var t=[];t.push("AWS4-HMAC-SHA256");t.push(e);t.push(this.credentialString(e));t.push(this.hexEncodedHash(this.canonicalString()));return t.join("\n")},canonicalString:function p(){var e=[];e.push(this.request.method);e.push(this.request.pathname());e.push(this.request.search());e.push(this.canonicalHeaders()+"\n");e.push(this.signedHeaders());e.push(this.hexEncodedBodyHash());return e.join("\n")},canonicalHeaders:function d(){var e=[];n.util.each.call(this,this.request.headers,function(t,r){e.push([t,r])});e.sort(function(e,t){return e[0].toLowerCase()<t[0].toLowerCase()?-1:1});var t=[];n.util.arrayEach.call(this,e,function(e){var r=e[0].toLowerCase();if(this.isSignableHeader(r)){t.push(r+":"+this.canonicalHeaderValues(e[1].toString()))}});return t.join("\n")},canonicalHeaderValues:function m(e){return e.replace(/\s+/g," ").replace(/^\s+|\s+$/g,"")},signedHeaders:function v(){var e=[];n.util.each.call(this,this.request.headers,function(t){t=t.toLowerCase();if(this.isSignableHeader(t))e.push(t)});return e.sort().join(";")},credentialString:function g(e){var t=[];t.push(e.substr(0,8));t.push(this.request.region);t.push(this.serviceName);t.push("aws4_request");return t.join("/")},hexEncodedHash:function y(e){return n.util.crypto.sha256(e,"hex")},hexEncodedBodyHash:function b(){if(this.request.headers["X-Amz-Content-Sha256"]){return this.request.headers["X-Amz-Content-Sha256"]}else{return this.hexEncodedHash(this.request.body||"")}},unsignableHeaders:["authorization","content-type","user-agent","x-amz-user-agent","x-amz-content-sha256"],isSignableHeader:function w(e){return this.unsignableHeaders.indexOf(e)<0}});t.exports=n.Signers.V4},{"../core":32}],62:[function(e,t,r){function n(e,t){this.currentState=t||null;this.states=e||{}}n.prototype.runTo=function i(e,t,r,n){if(typeof e==="function"){n=r;r=t;t=e;e=null}var i=this;var s=i.states[i.currentState];s.fn.call(r||i,n,function(n){if(n){if(r.logger)r.logger.log(i.currentState,"->",s.fail,n);if(s.fail)i.currentState=s.fail;else return t?t(n):null}else{if(r.logger)r.logger.log(i.currentState,"->",s.accept);if(s.accept)i.currentState=s.accept;else return t?t():null}if(i.currentState===e)return t?t(n):null;i.runTo(e,t,r,n)})};n.prototype.addState=function s(e,t,r,n){if(typeof t==="function"){n=t;t=null;r=null}else if(typeof r==="function"){n=r;r=null}if(!this.currentState)this.currentState=e;this.states[e]={accept:t,fail:r,fn:n};return this};t.exports=n},{}],63:[function(e,t,r){(function(r){var n=e("./core");var i=e("crypto");var s=e("buffer").Buffer;n.util={engine:function a(){if(n.util.isBrowser()&&typeof navigator!=="undefined"){return navigator.userAgent}else{return r.platform+"/"+r.version}},userAgent:function o(){var e=n.util.isBrowser()?"js":"nodejs";var t="aws-sdk-"+e+"/"+n.VERSION;if(e==="nodejs")t+=" "+n.util.engine();return t},isBrowser:function u(){return typeof window!=="undefined"},isNode:function f(){return!n.util.isBrowser()},nodeRequire:function c(t){if(n.util.isNode())return e(t)},uriEscape:function l(e){var t=encodeURIComponent(e);t=t.replace(/[^A-Za-z0-9_.~\-%]+/g,escape);t=t.replace(/[*]/g,function(e){return"%"+e.charCodeAt(0).toString(16).toUpperCase()});return t},uriEscapePath:function h(e){var t=[];n.util.arrayEach(e.split("/"),function(e){t.push(n.util.uriEscape(e))});return t.join("/")},urlParse:function p(t){return e("url").parse(t)},urlFormat:function d(t){return e("url").format(t)},queryParamsToString:function m(e){var t=[];var r=n.util.uriEscape;var i=Object.keys(e).sort();n.util.arrayEach(i,function(i){var s=e[i];var a=r(i);var o=a;if(Array.isArray(s)){var u=[];n.util.arrayEach(s,function(e){u.push(r(e))});o=a+"="+u.sort().join("&"+a+"=")}else if(s!==undefined&&s!==null){o=a+"="+r(s)}t.push(o)});return t.join("&")},readFileSync:function v(t){if(typeof window!=="undefined")return null;return e("fs").readFileSync(t,"utf-8")},base64:{encode:function g(e){return new s(e).toString("base64")},decode:function y(e){return new s(e,"base64").toString()}},Buffer:s,buffer:{concat:function(e){var t=0,r=0,n=null,i;for(i=0;i<e.length;i++){t+=e[i].length}n=new s(t);for(i=0;i<e.length;i++){e[i].copy(n,r);r+=e[i].length}return n}},string:{byteLength:function b(t){if(t===null||t===undefined)return 0;if(typeof t==="string")t=new s(t);if(typeof t.byteLength==="number"){return t.byteLength}else if(typeof t.length==="number"){return t.length}else if(typeof t.size==="number"){return t.size}else if(typeof t.path==="string"){return e("fs").lstatSync(t.path).size}else{throw n.util.error(new Error("Cannot determine length of "+t),{object:t})}},upperFirst:function w(e){return e[0].toUpperCase()+e.substr(1)},lowerFirst:function E(e){return e[0].toLowerCase()+e.substr(1)}},jamespath:{query:function S(e,t){if(!t)return[];var r=[];var i=e.split(/\s+or\s+/);n.util.arrayEach.call(this,i,function(e){var i=[t];var s=e.split(".");n.util.arrayEach.call(this,s,function(e){var t=e.match("^(.+?)(?:\\[(-?\\d+|\\*|)\\])?$");var r=[];n.util.arrayEach.call(this,i,function(e){if(t[1]==="*"){n.util.arrayEach.call(this,e,function(e){r.push(e)})}else if(e.hasOwnProperty(t[1])){r.push(e[t[1]])}});i=r;if(t[2]!==undefined){r=[];n.util.arrayEach.call(this,i,function(e){if(Array.isArray(e)){if(t[2]==="*"||t[2]===""){r=r.concat(e)}else{var n=parseInt(t[2],10);if(n<0)n=e.length+n;r.push(e[n])}}});i=r}if(i.length===0)return n.util.abort});if(i.length>0){r=i;return n.util.abort}});return r},find:function _(e,t){return n.util.jamespath.query(e,t)[0]}},date:{getDate:function T(){return new Date},iso8601:function A(e){if(e===undefined){e=n.util.date.getDate()}return e.toISOString()},rfc822:function x(e){if(e===undefined){e=n.util.date.getDate()}return e.toUTCString()},unixTimestamp:function R(e){if(e===undefined){e=n.util.date.getDate()}return e.getTime()/1e3},from:function C(e){if(typeof e==="number"){return new Date(e*1e3)}else{return new Date(e)}},format:function I(e,t){if(!t)t="iso8601";return n.util.date[t](n.util.date.from(e))}},crypto:{crc32Table:[0,1996959894,3993919788,2567524794,124634137,1886057615,3915621685,2657392035,249268274,2044508324,3772115230,2547177864,162941995,2125561021,3887607047,2428444049,498536548,1789927666,4089016648,2227061214,450548861,1843258603,4107580753,2211677639,325883990,1684777152,4251122042,2321926636,335633487,1661365465,4195302755,2366115317,997073096,1281953886,3579855332,2724688242,1006888145,1258607687,3524101629,2768942443,901097722,1119000684,3686517206,2898065728,853044451,1172266101,3705015759,2882616665,651767980,1373503546,3369554304,3218104598,565507253,1454621731,3485111705,3099436303,671266974,1594198024,3322730930,2970347812,795835527,1483230225,3244367275,3060149565,1994146192,31158534,2563907772,4023717930,1907459465,112637215,2680153253,3904427059,2013776290,251722036,2517215374,3775830040,2137656763,141376813,2439277719,3865271297,1802195444,476864866,2238001368,4066508878,1812370925,453092731,2181625025,4111451223,1706088902,314042704,2344532202,4240017532,1658658271,366619977,2362670323,4224994405,1303535960,984961486,2747007092,3569037538,1256170817,1037604311,2765210733,3554079995,1131014506,879679996,2909243462,3663771856,1141124467,855842277,2852801631,3708648649,1342533948,654459306,3188396048,3373015174,1466479909,544179635,3110523913,3462522015,1591671054,702138776,2966460450,3352799412,1504918807,783551873,3082640443,3233442989,3988292384,2596254646,62317068,1957810842,3939845945,2647816111,81470997,1943803523,3814918930,2489596804,225274430,2053790376,3826175755,2466906013,167816743,2097651377,4027552580,2265490386,503444072,1762050814,4150417245,2154129355,426522225,1852507879,4275313526,2312317920,282753626,1742555852,4189708143,2394877945,397917763,1622183637,3604390888,2714866558,953729732,1340076626,3518719985,2797360999,1068828381,1219638859,3624741850,2936675148,906185462,1090812512,3747672003,2825379669,829329135,1181335161,3412177804,3160834842,628085408,1382605366,3423369109,3138078467,570562233,1426400815,3317316542,2998733608,733239954,1555261956,3268935591,3050360625,752459403,1541320221,2607071920,3965973030,1969922972,40735498,2617837225,3943577151,1913087877,83908371,2512341634,3803740692,2075208622,213261112,2463272603,3855990285,2094854071,198958881,2262029012,4057260610,1759359992,534414190,2176718541,4139329115,1873836001,414664567,2282248934,4279200368,1711684554,285281116,2405801727,4167216745,1634467795,376229701,2685067896,3608007406,1308918612,956543938,2808555105,3495958263,1231636301,1047427035,2932959818,3654703836,1088359270,936918e3,2847714899,3736837829,1202900863,817233897,3183342108,3401237130,1404277552,615818150,3134207493,3453421203,1423857449,601450431,3009837614,3294710456,1567103746,711928724,3020668471,3272380065,1510334235,755167117],crc32:function L(e){var t=n.util.crypto.crc32Table;var r=0^-1;if(typeof e==="string"){e=new s(e)}for(var i=0;i<e.length;i++){var a=e.readUInt8(i);r=r>>>8^t[(r^a)&255]}return(r^-1)>>>0},hmac:function N(e,t,r,n){if(!r)r="binary";if(r==="buffer"){r=undefined}if(!n)n="sha256";if(typeof t==="string")t=new s(t);return i.createHmac(n,e).update(t).digest(r)},md5:function q(e,t){if(!t){t="binary"}if(t==="buffer"){t=undefined}if(typeof e==="string")e=new s(e);return n.util.crypto.createHash("md5").update(e).digest(t)},sha256:function D(e,t){if(!t){t="binary"}if(t==="buffer"){t=undefined}if(typeof e==="string")e=new s(e);return n.util.crypto.createHash("sha256").update(e).digest(t)},toHex:function O(e){var t=[];for(var r=0;r<e.length;r++){t.push(("0"+e.charCodeAt(r).toString(16)).substr(-2,2))}return t.join("")},createHash:function j(e){return i.createHash(e)}},abort:{},each:function P(e,t){for(var r in e){if(e.hasOwnProperty(r)){var i=t.call(this,r,e[r]);if(i===n.util.abort)break}}},arrayEach:function k(e,t){for(var r in e){if(e.hasOwnProperty(r)){var i=t.call(this,e[r],parseInt(r,10));if(i===n.util.abort)break}}},update:function M(e,t){n.util.each(t,function r(t,n){e[t]=n});return e},merge:function B(e,t){return n.util.update(n.util.copy(e),t)},copy:function U(e){if(e===null||e===undefined)return e;var t={};for(var r in e){t[r]=e[r]}return t},isEmpty:function F(e){for(var t in e){if(e.hasOwnProperty(t)){return false}}return true},isType:function H(e,t){if(typeof t==="function")t=n.util.typeName(t);return Object.prototype.toString.call(e)==="[object "+t+"]"},typeName:function V(e){if(e.hasOwnProperty("name"))return e.name;var t=e.toString();var r=t.match(/^\s*function (.+)\(/);return r?r[1]:t},error:function z(e,t){var r=null;if(typeof e.message==="string"&&e.message!==""){if(typeof t==="string"||t&&t.message){r=n.util.copy(e);r.message=e.message}}e.message=e.message||null;if(typeof t==="string"){e.message=t}else{n.util.update(e,t)}if(typeof Object.defineProperty==="function"){Object.defineProperty(e,"name",{writable:true,enumerable:false});Object.defineProperty(e,"message",{enumerable:true})}e.name=e.name||e.code||"Error";e.time=new Date;if(r)e.originalError=r;return e},inherit:function X(e,t){var r=null;if(t===undefined){t=e;e=Object;r={}}else{var i=function s(){};i.prototype=e.prototype;r=new i}if(t.constructor===Object){t.constructor=function(){if(e!==Object){return e.apply(this,arguments)}}}t.constructor.prototype=r;n.util.update(t.constructor.prototype,t);t.constructor.__super__=e;return t.constructor},mixin:function W(){var e=arguments[0];for(var t=1;t<arguments.length;t++){for(var r in arguments[t].prototype){var n=arguments[t].prototype[r];if(r!="constructor"){e.prototype[r]=n}}}return e},hideProperties:function G(e,t){if(typeof Object.defineProperty!=="function")return;n.util.arrayEach(t,function(t){Object.defineProperty(e,t,{enumerable:false,writable:true,configurable:true})})}};t.exports=n.util}).call(this,e("/Users/mauriciochavarriaga/Projects/aws-sdk-js/dist-tools/node_modules/browserify/node_modules/insert-module-globals/node_modules/process/browser.js"))},{"./core":32,"/Users/mauriciochavarriaga/Projects/aws-sdk-js/dist-tools/node_modules/browserify/node_modules/insert-module-globals/node_modules/process/browser.js":13,buffer:2,crypto:6,fs:1,url:26}],64:[function(e,t,r){var n=e("../core");var i=e("xmlbuilder");var s=n.util.inherit;n.XML.Builder=s({constructor:function a(e,t,r){this.root=e;this.rules=t;this.xmlns=r.xmlnamespace;this.timestampFormat=r.timestampFormat},toXML:function o(e){var t=i.create(this.root);if(this.xmlns)t.att("xmlns",this.xmlns);this.serializeStructure(this.rules,e,t);return t.root().toString()},serializeStructure:function u(e,t,r){n.util.each.call(this,e||{},function(e,n){var i=t[e];if(i!==undefined){if(n.attribute){r.att(n.name,i)}else{this.serializeMember(e,n,i,r)}}})},serializeList:function f(e,t,r,i){if(t.flattened){n.util.arrayEach.call(this,r,function(r){this.serializeMember(t.name||e,t.members,r,i)})}else{i=i.ele(t.name||e);n.util.arrayEach.call(this,r,function(e){var r=t.members.name||"member";this.serializeMember(r,t.members,e,i)})}},serializeMember:function c(e,t,r,i){if(r===null||r===undefined)return;var s=e;if(t.type==="structure"){i=i.ele(s);this.serializeStructure(t.members,r,i)}else if(t.type==="list"){this.serializeList(s,t,r,i)}else if(t.type==="timestamp"){var a=t.format||this.timestampFormat;var o=n.util.date.format(r,a);i=i.ele(s,String(o))}else{i=i.ele(s,String(r))}this.applyNamespaces(i,t)},applyNamespaces:function l(e,t){if(t.xmlns){var r="xmlns";if(t.xmlns.prefix)r+=":"+t.xmlns.prefix;e.att(r,t.xmlns.uri)}}})},{"../core":32,xmlbuilder:70}],65:[function(e,t,r){var n=e("../core");var i=n.util.inherit;var s=e("xml2js");n.XML.Parser=i({constructor:function a(e){this.rules=(e||{}).members||{}},options:{explicitCharkey:false,trim:false,normalize:false,explicitRoot:false,emptyTag:null,explicitArray:true,ignoreAttrs:false,mergeAttrs:false,validator:null},parse:function o(e){var t=null;var r=null;var i=new s.Parser(this.options);i.parseString(e,function(e,n){r=e;t=n});if(t){delete t.xmlns;return this.parseStructure(t,this.rules)}else if(r){throw n.util.error(r,{code:"XMLParserError"})}else{return this.parseStructure({},this.rules)}},parseStructure:function u(e,t){var r={};n.util.each.call(this,t,function(e,t){if(t.type=="list"){r[t.name||e]=[]}});n.util.each.call(this,e,function(e,i){if(e=="$"){n.util.each.call(this,i,function(n,i){if(t[n]){var s=t[n];r[s.name||e]=this.parseMember([i],s)}})}else{var s=t[e]||{};r[s.name||e]=this.parseMember(i,s)}});return r},parseMap:function f(e,t){var r={};var i=t.keys||{};var s=t.members||{};var a=i.name||"key";var o=s.name||"value";if(!t.flattened){e=e[0].entry}n.util.arrayEach.call(this,e,function(e){var t=this.parseMember(e[o],s);r[e[a][0]]=t});return r},parseList:function c(e,t){var r=[];var i=t.members||{};var s=i.name||"member";if(t.flattened){n.util.arrayEach.call(this,e,function(e){r.push(this.parseMember([e],i))})}else{n.util.arrayEach.call(this,e,function(e){n.util.arrayEach.call(this,e[s],function(e){r.push(this.parseMember([e],i))})})}return r},parseMember:function l(e,t){if(e[0]===null){if(t.type==="structure")return{};if(t.type==="list")return[];if(t.type==="map")return{};return null}if(e[0]["$"]&&e[0]["$"].encoding=="base64"){return n.util.base64.decode(e[0]["_"])}if(!t.type){if(typeof e[0]==="string"){t.type="string"}else if(e[0]["_"]){t.type="string";e=[e[0]["_"]]}else{t.type="structure"}}if(t.type==="string"){return e[0]}else if(t.type==="structure"){return this.parseStructure(e[0],t.members||{})}else if(t.type==="list"){return this.parseList(e,t)}else if(t.type==="map"){return this.parseMap(e,t)}else if(t.type==="integer"){return parseInt(e[0],10)}else if(t.type==="float"){return parseFloat(e[0])}else if(t.type==="timestamp"){return this.parseTimestamp(e[0])}else if(t.type==="boolean"){return e[0]==="true"}else{var r="unhandled type: "+t.type;throw n.util.error(new Error(r),{code:"XMLParserError"})}},parseTimestamp:function h(e){if(e.match(/^\d+$/)){return new Date(e*1e3)}else if(e.match(/^\d{4}/)){return new Date(e)}else if(e.match(/^\w{3},/)){return new Date(e)}else{throw n.util.error(new Error("unhandled timestamp format: "+e),{code:"TimestampParserError"})}}})},{"../core":32,xml2js:66}],66:[function(e,t,r){(function(){var t,n,i,s={}.hasOwnProperty,a=function(e,t){for(var r in t){if(s.call(t,r))e[r]=t[r]}function n(){this.constructor=e}n.prototype=t.prototype;e.prototype=new n;e.__super__=t.prototype;return e},o=function(e,t){return function(){return e.apply(t,arguments)}};i=e("sax");t=e("events");n=function(e){return typeof e==="object"&&e!=null&&Object.keys(e).length===0};r.defaults={.1:{explicitCharkey:false,trim:true,normalize:true,normalizeTags:false,attrkey:"@",charkey:"#",explicitArray:false,ignoreAttrs:false,mergeAttrs:false,explicitRoot:false,validator:null,xmlns:false},.2:{explicitCharkey:false,trim:false,normalize:false,normalizeTags:false,attrkey:"$",charkey:"_",explicitArray:true,ignoreAttrs:false,mergeAttrs:false,explicitRoot:true,validator:null,xmlns:false}};r.ValidationError=function(e){a(t,e);function t(e){this.message=e}return t}(Error);r.Parser=function(e){a(t,e);function t(e){this.parseString=o(this.parseString,this);this.reset=o(this.reset,this);var t,n,i;this.options={};i=r.defaults["0.2"];for(t in i){if(!s.call(i,t))continue;n=i[t];this.options[t]=n}for(t in e){if(!s.call(e,t))continue;n=e[t];this.options[t]=n}if(this.options.xmlns){this.options.xmlnskey=this.options.attrkey+"ns"}this.reset()}t.prototype.reset=function(){var e,t,r,a,o=this;this.removeAllListeners();this.saxParser=i.parser(true,{trim:false,normalize:false,xmlns:this.options.xmlns});r=false;this.saxParser.onerror=function(e){if(!r){r=true;return o.emit("error",e)}};this.EXPLICIT_CHARKEY=this.options.explicitCharkey;this.resultObject=null;a=[];e=this.options.attrkey;t=this.options.charkey;this.saxParser.onopentag=function(r){var n,i,u;i={};i[t]="";if(!o.options.ignoreAttrs){u=r.attributes;for(n in u){if(!s.call(u,n))continue;if(!(e in i)&&!o.options.mergeAttrs){i[e]={}}if(o.options.mergeAttrs){i[n]=r.attributes[n]}else{i[e][n]=r.attributes[n]}}}i["#name"]=o.options.normalizeTags?r.name.toLowerCase():r.name;if(o.options.xmlns){i[o.options.xmlnskey]={uri:r.uri,local:r.local}}return a.push(i)};this.saxParser.onclosetag=function(){var e,r,i,s,u,f;i=a.pop();r=i["#name"];delete i["#name"];u=a[a.length-1];if(i[t].match(/^\s*$/)){delete i[t]}else{if(o.options.trim){i[t]=i[t].trim()}if(o.options.normalize){i[t]=i[t].replace(/\s{2,}/g," ").trim()}if(Object.keys(i).length===1&&t in i&&!o.EXPLICIT_CHARKEY){i=i[t]}}if(o.options.emptyTag!==void 0&&n(i)){i=o.options.emptyTag}if(o.options.validator!=null){f="/"+function(){var t,r,n;n=[];for(t=0,r=a.length;t<r;t++){e=a[t];n.push(e["#name"])}return n}().concat(r).join("/");i=o.options.validator(f,u&&u[r],i)}if(a.length>0){if(!o.options.explicitArray){if(!(r in u)){return u[r]=i}else if(u[r]instanceof Array){return u[r].push(i)}else{s=u[r];u[r]=[s];return u[r].push(i)}}else{if(!(u[r]instanceof Array)){u[r]=[]}return u[r].push(i)}}else{if(o.options.explicitRoot){s=i;i={};i[r]=s}o.resultObject=i;return o.emit("end",o.resultObject)}};return this.saxParser.ontext=this.saxParser.oncdata=function(e){var r;r=a[a.length-1];if(r){return r[t]+=e}}};t.prototype.parseString=function(e,t){if(t!=null&&typeof t==="function"){this.on("end",function(e){this.reset();return t(null,e)});this.on("error",function(e){this.reset();return t(e)})}if(e.toString().trim()===""){this.emit("end",null);return true}try{return this.saxParser.write(e.toString())}catch(r){return this.emit("error",r.message)}};return t}(t.EventEmitter);r.parseString=function(e,t,n){var i,s,a;if(n!=null){if(typeof n==="function"){i=n}if(typeof t==="object"){s=t}}else{if(typeof t==="function"){i=t}s={}}a=new r.Parser(s);return a.parseString(e,i)}}).call(this)},{events:11,sax:67}],67:[function(e,t,r){(function(t){(function(r){r.parser=function(e,t){return new i(e,t)};r.SAXParser=i;r.SAXStream=h;r.createStream=l;r.MAX_BUFFER_LENGTH=64*1024;var n=["comment","sgmlDecl","textNode","tagName","doctype","procInstName","procInstBody","entity","attribName","attribValue","cdata","script"];r.EVENTS=["text","processinginstruction","sgmldeclaration","doctype","comment","attribute","opentag","closetag","opencdata","cdata","closecdata","error","end","ready","script","opennamespace","closenamespace"];function i(e,t){if(!(this instanceof i))return new i(e,t);var n=this;a(n);n.q=n.c="";n.bufferCheckPosition=r.MAX_BUFFER_LENGTH;n.opt=t||{};n.opt.lowercase=n.opt.lowercase||n.opt.lowercasetags;n.looseCase=n.opt.lowercase?"toLowerCase":"toUpperCase";n.tags=[];n.closed=n.closedRoot=n.sawRoot=false;n.tag=n.error=null;n.strict=!!e;n.noscript=!!(e||n.opt.noscript);n.state=L.BEGIN;n.ENTITIES=Object.create(r.ENTITIES);n.attribList=[];if(n.opt.xmlns)n.ns=Object.create(_);n.trackPosition=n.opt.position!==false;if(n.trackPosition){n.position=n.line=n.column=0}N(n,"onready")}if(!Object.create)Object.create=function(e){function t(){this.__proto__=e}t.prototype=e;return new t};if(!Object.getPrototypeOf)Object.getPrototypeOf=function(e){return e.__proto__};if(!Object.keys)Object.keys=function(e){var t=[];for(var r in e)if(e.hasOwnProperty(r))t.push(r);return t};function s(e){var t=Math.max(r.MAX_BUFFER_LENGTH,10),i=0;for(var s=0,a=n.length;s<a;s++){var o=e[n[s]].length;if(o>t){switch(n[s]){case"textNode":D(e);break;case"cdata":q(e,"oncdata",e.cdata);e.cdata="";break;case"script":q(e,"onscript",e.script);e.script="";break;default:j(e,"Max buffer length exceeded: "+n[s])}}i=Math.max(i,o)}e.bufferCheckPosition=r.MAX_BUFFER_LENGTH-i+e.position}function a(e){for(var t=0,r=n.length;t<r;t++){e[n[t]]=""}}function o(e){D(e);if(e.cdata!==""){q(e,"oncdata",e.cdata);e.cdata=""}if(e.script!==""){q(e,"onscript",e.script);e.script=""}}i.prototype={end:function(){P(this)},write:z,resume:function(){this.error=null;return this},close:function(){return this.write(null)},flush:function(){o(this)}};try{var u=e("stream").Stream}catch(f){var u=function(){}}var c=r.EVENTS.filter(function(e){return e!=="error"&&e!=="end"});function l(e,t){return new h(e,t)}function h(e,t){if(!(this instanceof h))return new h(e,t);u.apply(this);this._parser=new i(e,t);this.writable=true;this.readable=true;var r=this;this._parser.onend=function(){r.emit("end")};this._parser.onerror=function(e){r.emit("error",e);r._parser.error=null};this._decoder=null;c.forEach(function(e){Object.defineProperty(r,"on"+e,{get:function(){return r._parser["on"+e]},set:function(t){if(!t){r.removeAllListeners(e);return r._parser["on"+e]=t}r.on(e,t)},enumerable:true,configurable:false})})}h.prototype=Object.create(u.prototype,{constructor:{value:h}});h.prototype.write=function(r){if(typeof t==="function"&&typeof t.isBuffer==="function"&&t.isBuffer(r)){if(!this._decoder){var n=e("string_decoder").StringDecoder;this._decoder=new n("utf8")}r=this._decoder.write(r)}this._parser.write(r.toString());this.emit("data",r);return true};h.prototype.end=function(e){if(e&&e.length)this.write(e);this._parser.end();return true};h.prototype.on=function(e,t){var r=this;if(!r._parser["on"+e]&&c.indexOf(e)!==-1){r._parser["on"+e]=function(){var t=arguments.length===1?[arguments[0]]:Array.apply(null,arguments);t.splice(0,0,e);r.emit.apply(r,t)}}return u.prototype.on.call(r,e,t)};var p="\r\n	 ",d="0124356789",m="abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ",v="'\"",g=d+m+"#",y=p+">",b="[CDATA[",w="DOCTYPE",E="http://www.w3.org/XML/1998/namespace",S="http://www.w3.org/2000/xmlns/",_={xml:E,xmlns:S};p=x(p);d=x(d);m=x(m);var T=/[:_A-Za-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD]/;var A=/[:_A-Za-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD\u00B7\u0300-\u036F\u203F-\u2040\.\d-]/;v=x(v);g=x(g);y=x(y);function x(e){return e.split("").reduce(function(e,t){e[t]=true;return e},{})}function R(e){return Object.prototype.toString.call(e)==="[object RegExp]"}function C(e,t){return R(e)?!!t.match(e):e[t]}function I(e,t){return!C(e,t)}var L=0;r.STATE={BEGIN:L++,TEXT:L++,TEXT_ENTITY:L++,OPEN_WAKA:L++,SGML_DECL:L++,SGML_DECL_QUOTED:L++,DOCTYPE:L++,DOCTYPE_QUOTED:L++,DOCTYPE_DTD:L++,DOCTYPE_DTD_QUOTED:L++,COMMENT_STARTING:L++,COMMENT:L++,COMMENT_ENDING:L++,COMMENT_ENDED:L++,CDATA:L++,CDATA_ENDING:L++,CDATA_ENDING_2:L++,PROC_INST:L++,PROC_INST_BODY:L++,PROC_INST_ENDING:L++,OPEN_TAG:L++,OPEN_TAG_SLASH:L++,ATTRIB:L++,ATTRIB_NAME:L++,ATTRIB_NAME_SAW_WHITE:L++,ATTRIB_VALUE:L++,ATTRIB_VALUE_QUOTED:L++,ATTRIB_VALUE_CLOSED:L++,ATTRIB_VALUE_UNQUOTED:L++,ATTRIB_VALUE_ENTITY_Q:L++,ATTRIB_VALUE_ENTITY_U:L++,CLOSE_TAG:L++,CLOSE_TAG_SAW_WHITE:L++,SCRIPT:L++,SCRIPT_ENDING:L++};r.ENTITIES={amp:"&",gt:">",lt:"<",quot:'"',apos:"'",AElig:198,Aacute:193,Acirc:194,Agrave:192,Aring:197,Atilde:195,Auml:196,Ccedil:199,ETH:208,Eacute:201,Ecirc:202,Egrave:200,Euml:203,Iacute:205,Icirc:206,Igrave:204,Iuml:207,Ntilde:209,Oacute:211,Ocirc:212,Ograve:210,Oslash:216,Otilde:213,Ouml:214,THORN:222,Uacute:218,Ucirc:219,Ugrave:217,Uuml:220,Yacute:221,aacute:225,acirc:226,aelig:230,agrave:224,aring:229,atilde:227,auml:228,ccedil:231,eacute:233,ecirc:234,egrave:232,eth:240,euml:235,iacute:237,icirc:238,igrave:236,iuml:239,ntilde:241,oacute:243,ocirc:244,ograve:242,oslash:248,otilde:245,ouml:246,szlig:223,thorn:254,uacute:250,ucirc:251,ugrave:249,uuml:252,yacute:253,yuml:255,copy:169,reg:174,nbsp:160,iexcl:161,cent:162,pound:163,curren:164,yen:165,brvbar:166,sect:167,uml:168,ordf:170,laquo:171,not:172,shy:173,macr:175,deg:176,plusmn:177,sup1:185,sup2:178,sup3:179,acute:180,micro:181,para:182,middot:183,cedil:184,ordm:186,raquo:187,frac14:188,frac12:189,frac34:190,iquest:191,times:215,divide:247,OElig:338,oelig:339,Scaron:352,scaron:353,Yuml:376,fnof:402,circ:710,tilde:732,Alpha:913,Beta:914,Gamma:915,Delta:916,Epsilon:917,Zeta:918,Eta:919,Theta:920,Iota:921,Kappa:922,Lambda:923,Mu:924,Nu:925,Xi:926,Omicron:927,Pi:928,Rho:929,Sigma:931,Tau:932,Upsilon:933,Phi:934,Chi:935,Psi:936,Omega:937,alpha:945,beta:946,gamma:947,delta:948,epsilon:949,zeta:950,eta:951,theta:952,iota:953,kappa:954,lambda:955,mu:956,nu:957,xi:958,omicron:959,pi:960,rho:961,sigmaf:962,sigma:963,tau:964,upsilon:965,phi:966,chi:967,psi:968,omega:969,thetasym:977,upsih:978,piv:982,ensp:8194,emsp:8195,thinsp:8201,zwnj:8204,zwj:8205,lrm:8206,rlm:8207,ndash:8211,mdash:8212,lsquo:8216,rsquo:8217,sbquo:8218,ldquo:8220,rdquo:8221,bdquo:8222,dagger:8224,Dagger:8225,bull:8226,hellip:8230,permil:8240,prime:8242,Prime:8243,lsaquo:8249,rsaquo:8250,oline:8254,frasl:8260,euro:8364,image:8465,weierp:8472,real:8476,trade:8482,alefsym:8501,larr:8592,uarr:8593,rarr:8594,darr:8595,harr:8596,crarr:8629,lArr:8656,uArr:8657,rArr:8658,dArr:8659,hArr:8660,forall:8704,part:8706,exist:8707,empty:8709,nabla:8711,isin:8712,notin:8713,ni:8715,prod:8719,sum:8721,minus:8722,lowast:8727,radic:8730,prop:8733,infin:8734,ang:8736,and:8743,or:8744,cap:8745,cup:8746,"int":8747,there4:8756,sim:8764,cong:8773,asymp:8776,ne:8800,equiv:8801,le:8804,ge:8805,sub:8834,sup:8835,nsub:8836,sube:8838,supe:8839,oplus:8853,otimes:8855,perp:8869,sdot:8901,lceil:8968,rceil:8969,lfloor:8970,rfloor:8971,lang:9001,rang:9002,loz:9674,spades:9824,clubs:9827,hearts:9829,diams:9830};Object.keys(r.ENTITIES).forEach(function(e){var t=r.ENTITIES[e];var n=typeof t==="number"?String.fromCharCode(t):t;r.ENTITIES[e]=n});for(var L in r.STATE)r.STATE[r.STATE[L]]=L;L=r.STATE;function N(e,t,r){e[t]&&e[t](r)}function q(e,t,r){if(e.textNode)D(e);N(e,t,r)}function D(e){e.textNode=O(e.opt,e.textNode);if(e.textNode)N(e,"ontext",e.textNode);e.textNode=""}function O(e,t){if(e.trim)t=t.trim();if(e.normalize)t=t.replace(/\s+/g," ");return t}function j(e,t){D(e);if(e.trackPosition){t+="\nLine: "+e.line+"\nColumn: "+e.column+"\nChar: "+e.c}t=new Error(t);e.error=t;N(e,"onerror",t);return e}function P(e){if(!e.closedRoot)k(e,"Unclosed root tag");if(e.state!==L.BEGIN&&e.state!==L.TEXT)j(e,"Unexpected end");D(e);e.c="";e.closed=true;N(e,"onend");i.call(e,e.strict,e.opt);return e}function k(e,t){if(typeof e!=="object"||!(e instanceof i))throw new Error("bad call to strictFail");if(e.strict)j(e,t)}function M(e){if(!e.strict)e.tagName=e.tagName[e.looseCase]();var t=e.tags[e.tags.length-1]||e,r=e.tag={name:e.tagName,attributes:{}};if(e.opt.xmlns)r.ns=t.ns;e.attribList.length=0}function B(e,t){var r=e.indexOf(":"),n=r<0?["",e]:e.split(":"),i=n[0],s=n[1];if(t&&e==="xmlns"){i="xmlns";s=""}return{prefix:i,local:s}}function U(e){if(!e.strict)e.attribName=e.attribName[e.looseCase]();if(e.attribList.indexOf(e.attribName)!==-1||e.tag.attributes.hasOwnProperty(e.attribName)){return e.attribName=e.attribValue=""
}if(e.opt.xmlns){var t=B(e.attribName,true),r=t.prefix,n=t.local;if(r==="xmlns"){if(n==="xml"&&e.attribValue!==E){k(e,"xml: prefix must be bound to "+E+"\n"+"Actual: "+e.attribValue)}else if(n==="xmlns"&&e.attribValue!==S){k(e,"xmlns: prefix must be bound to "+S+"\n"+"Actual: "+e.attribValue)}else{var i=e.tag,s=e.tags[e.tags.length-1]||e;if(i.ns===s.ns){i.ns=Object.create(s.ns)}i.ns[n]=e.attribValue}}e.attribList.push([e.attribName,e.attribValue])}else{e.tag.attributes[e.attribName]=e.attribValue;q(e,"onattribute",{name:e.attribName,value:e.attribValue})}e.attribName=e.attribValue=""}function F(e,t){if(e.opt.xmlns){var r=e.tag;var n=B(e.tagName);r.prefix=n.prefix;r.local=n.local;r.uri=r.ns[n.prefix]||"";if(r.prefix&&!r.uri){k(e,"Unbound namespace prefix: "+JSON.stringify(e.tagName));r.uri=n.prefix}var i=e.tags[e.tags.length-1]||e;if(r.ns&&i.ns!==r.ns){Object.keys(r.ns).forEach(function(t){q(e,"onopennamespace",{prefix:t,uri:r.ns[t]})})}for(var s=0,a=e.attribList.length;s<a;s++){var o=e.attribList[s];var u=o[0],f=o[1],c=B(u,true),l=c.prefix,h=c.local,p=l==""?"":r.ns[l]||"",d={name:u,value:f,prefix:l,local:h,uri:p};if(l&&l!="xmlns"&&!p){k(e,"Unbound namespace prefix: "+JSON.stringify(l));d.uri=l}e.tag.attributes[u]=d;q(e,"onattribute",d)}e.attribList.length=0}e.tag.isSelfClosing=!!t;e.sawRoot=true;e.tags.push(e.tag);q(e,"onopentag",e.tag);if(!t){if(!e.noscript&&e.tagName.toLowerCase()==="script"){e.state=L.SCRIPT}else{e.state=L.TEXT}e.tag=null;e.tagName=""}e.attribName=e.attribValue="";e.attribList.length=0}function H(e){if(!e.tagName){k(e,"Weird empty close tag.");e.textNode+="</>";e.state=L.TEXT;return}if(e.script){if(e.tagName!=="script"){e.script+="</"+e.tagName+">";e.tagName="";e.state=L.SCRIPT;return}q(e,"onscript",e.script);e.script=""}var t=e.tags.length;var r=e.tagName;if(!e.strict)r=r[e.looseCase]();var n=r;while(t--){var i=e.tags[t];if(i.name!==n){k(e,"Unexpected close tag")}else break}if(t<0){k(e,"Unmatched closing tag: "+e.tagName);e.textNode+="</"+e.tagName+">";e.state=L.TEXT;return}e.tagName=r;var s=e.tags.length;while(s-->t){var a=e.tag=e.tags.pop();e.tagName=e.tag.name;q(e,"onclosetag",e.tagName);var o={};for(var u in a.ns)o[u]=a.ns[u];var f=e.tags[e.tags.length-1]||e;if(e.opt.xmlns&&a.ns!==f.ns){Object.keys(a.ns).forEach(function(t){var r=a.ns[t];q(e,"onclosenamespace",{prefix:t,uri:r})})}}if(t===0)e.closedRoot=true;e.tagName=e.attribValue=e.attribName="";e.attribList.length=0;e.state=L.TEXT}function V(e){var t=e.entity,r=t.toLowerCase(),n,i="";if(e.ENTITIES[t])return e.ENTITIES[t];if(e.ENTITIES[r])return e.ENTITIES[r];t=r;if(t.charAt(0)==="#"){if(t.charAt(1)==="x"){t=t.slice(2);n=parseInt(t,16);i=n.toString(16)}else{t=t.slice(1);n=parseInt(t,10);i=n.toString(10)}}t=t.replace(/^0+/,"");if(i.toLowerCase()!==t){k(e,"Invalid character entity");return"&"+e.entity+";"}return String.fromCodePoint(n)}function z(e){var t=this;if(this.error)throw this.error;if(t.closed)return j(t,"Cannot write after close. Assign an onready handler.");if(e===null)return P(t);var r=0,n="";while(t.c=n=e.charAt(r++)){if(t.trackPosition){t.position++;if(n==="\n"){t.line++;t.column=0}else t.column++}switch(t.state){case L.BEGIN:if(n==="<"){t.state=L.OPEN_WAKA;t.startTagPosition=t.position}else if(I(p,n)){k(t,"Non-whitespace before first tag.");t.textNode=n;t.state=L.TEXT}continue;case L.TEXT:if(t.sawRoot&&!t.closedRoot){var i=r-1;while(n&&n!=="<"&&n!=="&"){n=e.charAt(r++);if(n&&t.trackPosition){t.position++;if(n==="\n"){t.line++;t.column=0}else t.column++}}t.textNode+=e.substring(i,r-1)}if(n==="<"){t.state=L.OPEN_WAKA;t.startTagPosition=t.position}else{if(I(p,n)&&(!t.sawRoot||t.closedRoot))k(t,"Text data outside of root node.");if(n==="&")t.state=L.TEXT_ENTITY;else t.textNode+=n}continue;case L.SCRIPT:if(n==="<"){t.state=L.SCRIPT_ENDING}else t.script+=n;continue;case L.SCRIPT_ENDING:if(n==="/"){t.state=L.CLOSE_TAG}else{t.script+="<"+n;t.state=L.SCRIPT}continue;case L.OPEN_WAKA:if(n==="!"){t.state=L.SGML_DECL;t.sgmlDecl=""}else if(C(p,n)){}else if(C(T,n)){t.state=L.OPEN_TAG;t.tagName=n}else if(n==="/"){t.state=L.CLOSE_TAG;t.tagName=""}else if(n==="?"){t.state=L.PROC_INST;t.procInstName=t.procInstBody=""}else{k(t,"Unencoded <");if(t.startTagPosition+1<t.position){var a=t.position-t.startTagPosition;n=new Array(a).join(" ")+n}t.textNode+="<"+n;t.state=L.TEXT}continue;case L.SGML_DECL:if((t.sgmlDecl+n).toUpperCase()===b){q(t,"onopencdata");t.state=L.CDATA;t.sgmlDecl="";t.cdata=""}else if(t.sgmlDecl+n==="--"){t.state=L.COMMENT;t.comment="";t.sgmlDecl=""}else if((t.sgmlDecl+n).toUpperCase()===w){t.state=L.DOCTYPE;if(t.doctype||t.sawRoot)k(t,"Inappropriately located doctype declaration");t.doctype="";t.sgmlDecl=""}else if(n===">"){q(t,"onsgmldeclaration",t.sgmlDecl);t.sgmlDecl="";t.state=L.TEXT}else if(C(v,n)){t.state=L.SGML_DECL_QUOTED;t.sgmlDecl+=n}else t.sgmlDecl+=n;continue;case L.SGML_DECL_QUOTED:if(n===t.q){t.state=L.SGML_DECL;t.q=""}t.sgmlDecl+=n;continue;case L.DOCTYPE:if(n===">"){t.state=L.TEXT;q(t,"ondoctype",t.doctype);t.doctype=true}else{t.doctype+=n;if(n==="[")t.state=L.DOCTYPE_DTD;else if(C(v,n)){t.state=L.DOCTYPE_QUOTED;t.q=n}}continue;case L.DOCTYPE_QUOTED:t.doctype+=n;if(n===t.q){t.q="";t.state=L.DOCTYPE}continue;case L.DOCTYPE_DTD:t.doctype+=n;if(n==="]")t.state=L.DOCTYPE;else if(C(v,n)){t.state=L.DOCTYPE_DTD_QUOTED;t.q=n}continue;case L.DOCTYPE_DTD_QUOTED:t.doctype+=n;if(n===t.q){t.state=L.DOCTYPE_DTD;t.q=""}continue;case L.COMMENT:if(n==="-")t.state=L.COMMENT_ENDING;else t.comment+=n;continue;case L.COMMENT_ENDING:if(n==="-"){t.state=L.COMMENT_ENDED;t.comment=O(t.opt,t.comment);if(t.comment)q(t,"oncomment",t.comment);t.comment=""}else{t.comment+="-"+n;t.state=L.COMMENT}continue;case L.COMMENT_ENDED:if(n!==">"){k(t,"Malformed comment");t.comment+="--"+n;t.state=L.COMMENT}else t.state=L.TEXT;continue;case L.CDATA:if(n==="]")t.state=L.CDATA_ENDING;else t.cdata+=n;continue;case L.CDATA_ENDING:if(n==="]")t.state=L.CDATA_ENDING_2;else{t.cdata+="]"+n;t.state=L.CDATA}continue;case L.CDATA_ENDING_2:if(n===">"){if(t.cdata)q(t,"oncdata",t.cdata);q(t,"onclosecdata");t.cdata="";t.state=L.TEXT}else if(n==="]"){t.cdata+="]"}else{t.cdata+="]]"+n;t.state=L.CDATA}continue;case L.PROC_INST:if(n==="?")t.state=L.PROC_INST_ENDING;else if(C(p,n))t.state=L.PROC_INST_BODY;else t.procInstName+=n;continue;case L.PROC_INST_BODY:if(!t.procInstBody&&C(p,n))continue;else if(n==="?")t.state=L.PROC_INST_ENDING;else t.procInstBody+=n;continue;case L.PROC_INST_ENDING:if(n===">"){q(t,"onprocessinginstruction",{name:t.procInstName,body:t.procInstBody});t.procInstName=t.procInstBody="";t.state=L.TEXT}else{t.procInstBody+="?"+n;t.state=L.PROC_INST_BODY}continue;case L.OPEN_TAG:if(C(A,n))t.tagName+=n;else{M(t);if(n===">")F(t);else if(n==="/")t.state=L.OPEN_TAG_SLASH;else{if(I(p,n))k(t,"Invalid character in tag name");t.state=L.ATTRIB}}continue;case L.OPEN_TAG_SLASH:if(n===">"){F(t,true);H(t)}else{k(t,"Forward-slash in opening tag not followed by >");t.state=L.ATTRIB}continue;case L.ATTRIB:if(C(p,n))continue;else if(n===">")F(t);else if(n==="/")t.state=L.OPEN_TAG_SLASH;else if(C(T,n)){t.attribName=n;t.attribValue="";t.state=L.ATTRIB_NAME}else k(t,"Invalid attribute name");continue;case L.ATTRIB_NAME:if(n==="=")t.state=L.ATTRIB_VALUE;else if(n===">"){k(t,"Attribute without value");t.attribValue=t.attribName;U(t);F(t)}else if(C(p,n))t.state=L.ATTRIB_NAME_SAW_WHITE;else if(C(A,n))t.attribName+=n;else k(t,"Invalid attribute name");continue;case L.ATTRIB_NAME_SAW_WHITE:if(n==="=")t.state=L.ATTRIB_VALUE;else if(C(p,n))continue;else{k(t,"Attribute without value");t.tag.attributes[t.attribName]="";t.attribValue="";q(t,"onattribute",{name:t.attribName,value:""});t.attribName="";if(n===">")F(t);else if(C(T,n)){t.attribName=n;t.state=L.ATTRIB_NAME}else{k(t,"Invalid attribute name");t.state=L.ATTRIB}}continue;case L.ATTRIB_VALUE:if(C(p,n))continue;else if(C(v,n)){t.q=n;t.state=L.ATTRIB_VALUE_QUOTED}else{k(t,"Unquoted attribute value");t.state=L.ATTRIB_VALUE_UNQUOTED;t.attribValue=n}continue;case L.ATTRIB_VALUE_QUOTED:if(n!==t.q){if(n==="&")t.state=L.ATTRIB_VALUE_ENTITY_Q;else t.attribValue+=n;continue}U(t);t.q="";t.state=L.ATTRIB_VALUE_CLOSED;continue;case L.ATTRIB_VALUE_CLOSED:if(C(p,n)){t.state=L.ATTRIB}else if(n===">")F(t);else if(n==="/")t.state=L.OPEN_TAG_SLASH;else if(C(T,n)){k(t,"No whitespace between attributes");t.attribName=n;t.attribValue="";t.state=L.ATTRIB_NAME}else k(t,"Invalid attribute name");continue;case L.ATTRIB_VALUE_UNQUOTED:if(I(y,n)){if(n==="&")t.state=L.ATTRIB_VALUE_ENTITY_U;else t.attribValue+=n;continue}U(t);if(n===">")F(t);else t.state=L.ATTRIB;continue;case L.CLOSE_TAG:if(!t.tagName){if(C(p,n))continue;else if(I(T,n)){if(t.script){t.script+="</"+n;t.state=L.SCRIPT}else{k(t,"Invalid tagname in closing tag.")}}else t.tagName=n}else if(n===">")H(t);else if(C(A,n))t.tagName+=n;else if(t.script){t.script+="</"+t.tagName;t.tagName="";t.state=L.SCRIPT}else{if(I(p,n))k(t,"Invalid tagname in closing tag");t.state=L.CLOSE_TAG_SAW_WHITE}continue;case L.CLOSE_TAG_SAW_WHITE:if(C(p,n))continue;if(n===">")H(t);else k(t,"Invalid characters in closing tag");continue;case L.TEXT_ENTITY:case L.ATTRIB_VALUE_ENTITY_Q:case L.ATTRIB_VALUE_ENTITY_U:switch(t.state){case L.TEXT_ENTITY:var o=L.TEXT,u="textNode";break;case L.ATTRIB_VALUE_ENTITY_Q:var o=L.ATTRIB_VALUE_QUOTED,u="attribValue";break;case L.ATTRIB_VALUE_ENTITY_U:var o=L.ATTRIB_VALUE_UNQUOTED,u="attribValue";break}if(n===";"){t[u]+=V(t);t.entity="";t.state=o}else if(C(g,n))t.entity+=n;else{k(t,"Invalid character entity");t[u]+="&"+t.entity+n;t.entity="";t.state=o}continue;default:throw new Error(t,"Unknown state: "+t.state)}}if(t.position>=t.bufferCheckPosition)s(t);return t}if(!String.fromCodePoint){(function(){var e=String.fromCharCode;var t=Math.floor;var r=function(){var r=16384;var n=[];var i;var s;var a=-1;var o=arguments.length;if(!o){return""}var u="";while(++a<o){var f=Number(arguments[a]);if(!isFinite(f)||f<0||f>1114111||t(f)!=f){throw RangeError("Invalid code point: "+f)}if(f<=65535){n.push(f)}else{f-=65536;i=(f>>10)+55296;s=f%1024+56320;n.push(i,s)}if(a+1==o||n.length>r){u+=e.apply(null,n);n.length=0}}return u};if(Object.defineProperty){Object.defineProperty(String,"fromCodePoint",{value:r,configurable:true,writable:true})}else{String.fromCodePoint=r}})()}})(typeof r==="undefined"?sax={}:r)}).call(this,e("buffer").Buffer)},{buffer:2,stream:19,string_decoder:25}],68:[function(e,t,r){(function(){var r,n;n=e("./XMLFragment");r=function(){function e(e,t,r){var i,s,a;this.children=[];this.rootObject=null;if(this.is(e,"Object")){a=[e,t],t=a[0],r=a[1];e=null}if(e!=null){e=""+e||"";if(t==null){t={version:"1.0"}}}if(t!=null&&!(t.version!=null)){throw new Error("Version number is required")}if(t!=null){t.version=""+t.version||"";if(!t.version.match(/1\.[0-9]+/)){throw new Error("Invalid version number: "+t.version)}i={version:t.version};if(t.encoding!=null){t.encoding=""+t.encoding||"";if(!t.encoding.match(/[A-Za-z](?:[A-Za-z0-9._-]|-)*/)){throw new Error("Invalid encoding: "+t.encoding)}i.encoding=t.encoding}if(t.standalone!=null){i.standalone=t.standalone?"yes":"no"}s=new n(this,"?xml",i);this.children.push(s)}if(r!=null){i={};if(e!=null){i.name=e}if(r.ext!=null){r.ext=""+r.ext||"";i.ext=r.ext}s=new n(this,"!DOCTYPE",i);this.children.push(s)}if(e!=null){this.begin(e)}}e.prototype.begin=function(t,r,i){var s,a;if(!(t!=null)){throw new Error("Root element needs a name")}if(this.rootObject){this.children=[];this.rootObject=null}if(r!=null){s=new e(t,r,i);return s.root()}t=""+t||"";a=new n(this,t,{});a.isRoot=true;a.documentObject=this;this.children.push(a);this.rootObject=a;return a};e.prototype.root=function(){return this.rootObject};e.prototype.end=function(e){return toString(e)};e.prototype.toString=function(e){var t,r,n,i,s;r="";s=this.children;for(n=0,i=s.length;n<i;n++){t=s[n];r+=t.toString(e)}return r};e.prototype.is=function(e,t){var r;r=Object.prototype.toString.call(e).slice(8,-1);return e!=null&&r===t};return e}();t.exports=r}).call(this)},{"./XMLFragment":69}],69:[function(e,t,r){(function(){var e,r={}.hasOwnProperty;e=function(){function e(e,t,r,n){this.isRoot=false;this.documentObject=null;this.parent=e;this.name=t;this.attributes=r;this.value=n;this.children=[]}e.prototype.element=function(t,n,i){var s,a,o,u,f;if(!(t!=null)){throw new Error("Missing element name")}t=""+t||"";this.assertLegalChar(t);if(n==null){n={}}if(this.is(n,"String")&&this.is(i,"Object")){u=[i,n],n=u[0],i=u[1]}else if(this.is(n,"String")){f=[{},n],n=f[0],i=f[1]}for(a in n){if(!r.call(n,a))continue;o=n[a];o=""+o||"";n[a]=this.escape(o)}s=new e(this,t,n);if(i!=null){i=""+i||"";i=this.escape(i);this.assertLegalChar(i);s.raw(i)}this.children.push(s);return s};e.prototype.insertBefore=function(t,n,i){var s,a,o,u,f,c;if(this.isRoot){throw new Error("Cannot insert elements at root level")}if(!(t!=null)){throw new Error("Missing element name")}t=""+t||"";this.assertLegalChar(t);if(n==null){n={}}if(this.is(n,"String")&&this.is(i,"Object")){f=[i,n],n=f[0],i=f[1]}else if(this.is(n,"String")){c=[{},n],n=c[0],i=c[1]}for(o in n){if(!r.call(n,o))continue;u=n[o];u=""+u||"";n[o]=this.escape(u)}s=new e(this.parent,t,n);if(i!=null){i=""+i||"";i=this.escape(i);this.assertLegalChar(i);s.raw(i)}a=this.parent.children.indexOf(this);this.parent.children.splice(a,0,s);return s};e.prototype.insertAfter=function(t,n,i){var s,a,o,u,f,c;if(this.isRoot){throw new Error("Cannot insert elements at root level")}if(!(t!=null)){throw new Error("Missing element name")}t=""+t||"";this.assertLegalChar(t);if(n==null){n={}}if(this.is(n,"String")&&this.is(i,"Object")){f=[i,n],n=f[0],i=f[1]}else if(this.is(n,"String")){c=[{},n],n=c[0],i=c[1]}for(o in n){if(!r.call(n,o))continue;u=n[o];u=""+u||"";n[o]=this.escape(u)}s=new e(this.parent,t,n);if(i!=null){i=""+i||"";i=this.escape(i);this.assertLegalChar(i);s.raw(i)}a=this.parent.children.indexOf(this);this.parent.children.splice(a+1,0,s);return s};e.prototype.remove=function(){var e,t;if(this.isRoot){throw new Error("Cannot remove the root element")}e=this.parent.children.indexOf(this);[].splice.apply(this.parent.children,[e,e-e+1].concat(t=[])),t;return this.parent};e.prototype.text=function(t){var r;if(!(t!=null)){throw new Error("Missing element text")}t=""+t||"";t=this.escape(t);this.assertLegalChar(t);r=new e(this,"",{},t);this.children.push(r);return this};e.prototype.cdata=function(t){var r;if(!(t!=null)){throw new Error("Missing CDATA text")}t=""+t||"";this.assertLegalChar(t);if(t.match(/]]>/)){throw new Error("Invalid CDATA text: "+t)}r=new e(this,"",{},"<![CDATA["+t+"]]>");this.children.push(r);return this};e.prototype.comment=function(t){var r;if(!(t!=null)){throw new Error("Missing comment text")}t=""+t||"";t=this.escape(t);this.assertLegalChar(t);if(t.match(/--/)){throw new Error("Comment text cannot contain double-hypen: "+t)}r=new e(this,"",{},"<!-- "+t+" -->");this.children.push(r);return this};e.prototype.raw=function(t){var r;if(!(t!=null)){throw new Error("Missing raw text")}t=""+t||"";r=new e(this,"",{},t);this.children.push(r);return this};e.prototype.up=function(){if(this.isRoot){throw new Error("This node has no parent. Use doc() if you need to get the document object.")}return this.parent};e.prototype.root=function(){var e;if(this.isRoot){return this}e=this.parent;while(!e.isRoot){e=e.parent}return e};e.prototype.document=function(){return this.root().documentObject};e.prototype.end=function(e){return this.document().toString(e)};e.prototype.prev=function(){var e;if(this.isRoot){throw new Error("Root node has no siblings")}e=this.parent.children.indexOf(this);if(e<1){throw new Error("Already at the first node")}return this.parent.children[e-1]};e.prototype.next=function(){var e;if(this.isRoot){throw new Error("Root node has no siblings")}e=this.parent.children.indexOf(this);if(e===-1||e===this.parent.children.length-1){throw new Error("Already at the last node")}return this.parent.children[e+1]};e.prototype.clone=function(t){var r;r=new e(this.parent,this.name,this.attributes,this.value);if(t){this.children.forEach(function(e){var n;n=e.clone(t);n.parent=r;return r.children.push(n)})}return r};e.prototype.importXMLBuilder=function(e){var t;t=e.root().clone(true);t.parent=this;this.children.push(t);t.isRoot=false;return this};e.prototype.attribute=function(e,t){var r;if(!(e!=null)){throw new Error("Missing attribute name")}if(!(t!=null)){throw new Error("Missing attribute value")}e=""+e||"";t=""+t||"";if((r=this.attributes)==null){this.attributes={}}this.attributes[e]=this.escape(t);return this};e.prototype.removeAttribute=function(e){if(!(e!=null)){throw new Error("Missing attribute name")}e=""+e||"";delete this.attributes[e];return this};e.prototype.toString=function(e,t){var r,n,i,s,a,o,u,f,c,l,h,p;o=e!=null&&e.pretty||false;s=e!=null&&e.indent||"  ";a=e!=null&&e.newline||"\n";t||(t=0);f=new Array(t+1).join(s);u="";if(o){u+=f}if(!(this.value!=null)){u+="<"+this.name}else{u+=""+this.value}h=this.attributes;for(r in h){n=h[r];if(this.name==="!DOCTYPE"){u+=" "+n}else{u+=" "+r+'="'+n+'"'}}if(this.children.length===0){if(!(this.value!=null)){u+=this.name==="?xml"?"?>":this.name==="!DOCTYPE"?">":"/>"}if(o){u+=a}}else if(o&&this.children.length===1&&this.children[0].value){u+=">";u+=this.children[0].value;u+="</"+this.name+">";u+=a}else{u+=">";if(o){u+=a}p=this.children;for(c=0,l=p.length;c<l;c++){i=p[c];u+=i.toString(e,t+1)}if(o){u+=f}u+="</"+this.name+">";if(o){u+=a}}return u};e.prototype.escape=function(e){return e.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/'/g,"&apos;").replace(/"/g,"&quot;")};e.prototype.assertLegalChar=function(e){var t,r;t=/[\u0000-\u0008\u000B-\u000C\u000E-\u001F\uD800-\uDFFF\uFFFE-\uFFFF]/;r=e.match(t);if(r){throw new Error("Invalid character ("+r+") in string: "+e)}};e.prototype.is=function(e,t){var r;r=Object.prototype.toString.call(e).slice(8,-1);return e!=null&&r===t};e.prototype.ele=function(e,t,r){return this.element(e,t,r)};e.prototype.txt=function(e){return this.text(e)};e.prototype.dat=function(e){return this.cdata(e)};e.prototype.att=function(e,t){return this.attribute(e,t)};e.prototype.com=function(e){return this.comment(e)};e.prototype.doc=function(){return this.document()};e.prototype.e=function(e,t,r){return this.element(e,t,r)};e.prototype.t=function(e){return this.text(e)};e.prototype.d=function(e){return this.cdata(e)};e.prototype.a=function(e,t){return this.attribute(e,t)};e.prototype.c=function(e){return this.comment(e)};e.prototype.r=function(e){return this.raw(e)};e.prototype.u=function(){return this.up()};return e}();t.exports=e}).call(this)},{}],70:[function(e,t,r){(function(){var r;r=e("./XMLBuilder");t.exports.create=function(e,t,n){if(e!=null){return new r(e,t,n).root()}else{return new r}}}).call(this)},{"./XMLBuilder":68}]},{},[30]);
/**
 * @fileOverview Library to instrument metacog-enabled Learning Objects
 * @name Metacog Client Library
 *
 * @description
 *<ul>
 * <li>
 * changes in version 0.1.3: (2014-08-06)
 * - validation of empty message array after filtering invalid keys
 *</li>
 * <li>
 * changes in version 0.1.2: (2014/07/14)
 * <ul><li>added support for TrainingEndpoint.js</li></ul>
 *</li>
 * <li>
 * changes in version 0.1.1:
 * <ul><li>added version field</li>
 * <li>added data type validation to logEvent.</li>
 * <li>added window.console validation to push_event.</li>
 * </ul>
 * </li>
 * </ul>
 * @copyright Copyright 2014 Metacog All Rights reserved
 */

'use strict';

/**
 * Metacog
 * @namespace
 * Metacog
 *
 * @description
 * Namespace that contains all the objects from the client library.
 */
var Metacog = {};

/**
 * some utilities..
 */
(function(Metacog){

  Metacog.VERSION = "0.2.0";



  /**
   * Convenience method to initialize all the components of the system. It invokes Metacog.Config.init and Metacog.Logger.init, passing the config object received as parameter.
   * @memberof Metacog
   * @param config {Object} a JSON object with configuration values. @see {@link Metacog.Config.init}  for a detailed description.
   */
  Metacog.init = function(config){
    Metacog.Config.init(config);

    if (Metacog.Config.log_tab === true || Metacog.Config.mode === "training") {
      Metacog.BottomPanel.init();
    }

    Metacog.Logger.init();
    if(config.mode === "training"){
     Metacog.PlaybackController.init();
    }
  };

  /**
   * create a new XHR object for AJAX requests
   * @returns {object} XHR object
   */
  Metacog.newXhr = function(){
    if (XMLHttpRequest) { // Mozilla, WebKit, ...
      return new XMLHttpRequest();
    } else if(ActiveXObject) { // IE
      try {
        return new ActiveXObject("Msxml2.XMLHTTP");
      }
      catch (e) {
        try {
          return new ActiveXObject("Microsoft.XMLHTTP");
        }
        catch (ex) {}
      }
    }
    return null;
  };

  /**
   * this is a "fake" uuid, it is a random number that looks like one.
   * ref: http://note19.com/2007/05/27/javascript-guid-generator/
   */
  Metacog.generateUID = function(){
    function S4() {
      return (((1+Math.random())*0x10000)|0).toString(16).substring(1);
    }
    return (S4()+S4()+"-"+S4()+"-"+S4()+"-"+S4()+"-"+S4()+S4()+S4());
  };


  /**
  * helper method to clean the log tab.
  * intended to be used by instrumentations.
  */
  Metacog.reset_log = function(){
    Metacog._emit("resetlog");
  };


  /**
   * returns true if there is connectivity with the backend services
   */
  Metacog.isOnLine = function(){
    return navigator.onLine;
  };

  /**
   * append a CSS link to the DOM.
   * @param csspath. path to the css. does nothing if passing a falsy value}
   * @private
   */
  Metacog.loadCSS = function(csspath){
    if(csspath){
      var fileCss = document.createElement("link");
      fileCss.setAttribute("rel", "stylesheet");
      fileCss.setAttribute("type", "text/css");
      fileCss.setAttribute("href", csspath);
      document.body.appendChild(fileCss);
    }
  };

  /**
   * helper
   * @param div
   * @param visible
   * @private
   */
  Metacog._showDiv = function(div, visible){
    div.setAttribute("style", "display:"+(visible?"inline":"none"));
  };

  /*
   * helper to remove all childrens for a node
   */
  Metacog._cleanDiv = function(node){
    while (node.hasChildNodes()) {
      node.removeChild(node.lastChild);
    }
  };

  /**
  * helper to set a div's content to either innerHTML or innerText
  * @param msgDiv {DOM} Dom node whose content is going to be set
   * @param strmsg {string} value to pass to the node's content
  * @private
  */
  Metacog._setDivContent = function(msgDiv, strmsg){
    if(msgDiv.innerHTML || msgDiv.innerHTML === ''){
      msgDiv.innerHTML = strmsg;
    }else if(msgDiv.innerText || msgDiv.innerText === ''){
      msgDiv.innerText = strmsg;
    }
  };

  /**
   * returns the value of a data- attribute, if present
   * @param div dom element to check
   * @param attr name of the attribute (without 'data-' prefix)
   * @private
   */
  Metacog._getDivData = function(div, attr){
    if(div.dataset){
      return div.dataset[attr];
    }else{
      return div.getAttribute("data-"+attr);
    }
  };

  /**
   * return the parent DOM element
   * @param div {Object} a DOM node
   * @private
   */
  Metacog._getDivParent = function(div){
    if(div.parentNode){
      return div.parentNode;
    }else if(div.parentElement){
      return div.parentElement;
    }else return null;
  };


  /**
   * given a DOM event (from a click callback, for example)
   * return the Source DOM Element.
   * @param ev
   * @returns {DOM} element that triggered the event
   * @private
   */
  Metacog._getDomEventSource = function(ev){
    if(ev.srcElement){
      return ev.srcElement;
    }else if(ev.target){
      return ev.target;
    }else{
      throw 'event_has_no_target';
    }
  };





})(Metacog);
(function(Metacog){
  'use strict';

  /**
   * keep a reference to command listeners
   * @see Metacog._register and Metacog._emit
   * @type {Array}
   * @private
   */
  var _listeners = [];


  /**
   * a listener is a object capable of receive commands sent through Metacog._emit.
   *  must implement a on_cmd_xxx for each command they want to listen to.
   *  return true from a listener method means the command had been consumed and won't be processed for other listeners.
   * @param listener {object}
   */
  Metacog._register = function(listener){
    if(!listener) return;
    //be sure the object is registered only once
    var registered = false;
    _listeners.forEach(function(r){
      if(r === listener){
        registered = true;
      }
    });
    if(!registered){
      _listeners.push(listener);
    }
  };

  /**
   * emit a command to the collection of listeners.
   * @param cmd {string} name of the command
   * @param args {obj} optional parameters
   * @private
   */
  Metacog._emit = function(cmd, args){
    _listeners.forEach(function(r){
      if(r["on_cmd_"+cmd]){
        r["on_cmd_"+cmd](args);
      }
    });
  };


})(Metacog);

(function(Metacog){
  'use strict';

  /**
   * Metacog.Config behaves like an object to share configurations between metacog components.
   * when used as a singleton, it may keep references to other metacog component instances
   * @class
   */
  Metacog.Config = {};

  //public constants and variables
  //url for the api endpoint API
  Metacog.Config.api_endpoint = "http://api.metacog.com";

  //kinesis stream
  Metacog.Config.stream = "metacog_raw";

  //backward compatibility prior to 1.2.0
  Metacog.Config.verbose =  false;
  Metacog.Config.idle = false;
  Metacog.Config.log_tab = false;
  /**
   * define the styles and transformations applied to the events logged to the log_tab.
   * optional path to CSS.
   */
  Metacog.Config.log_css = null;
  Metacog.Config.mode = 'production';

  Metacog.Config.session = {
    publisher_id: null,
    application_id: null,
    widget_id: null,
    learner_id: null,
    session_id: null
  };

  //training
  Metacog.Config.training = {
    session_name: null,
    session_id: null,
    auth_token: null,
    recording: false,
    timestamps: {
      start: 0,
      end: 0
    },
    toolbar:{
      css: '//cdn.metacog.com/training-toolbar/training-toolbar.css',
      template: '//cdn.metacog.com/training-toolbar/training-toolbar.html'
    },
    bottompanel:{
      css: '//cdn.metacog.com/bottom-panel/bottom-panel.css',
      template: '//cdn.metacog.com/bottom-panel/bottom-panel.html'
    }
  };

  //scoring
  Metacog.Config.scoring = {
    id: null, //id of the scoring session
    name: null  //name of the scoring session (used to keep the value when creating a new scoring session)

  };

  Metacog.Config.rubric = {
    id: null //id of the rubric
  };


  Metacog.Config.production = {

    /**
     * max number of messages to batch together (in the same tick)
     */
    max_concurrent_request: 50,

    /**
    *  size of paginated events retrieved for playback
    */
    max_page_size: 100,

    /**
    * milliseconds for ticks on the logger processing queue
    */
    queue_tick_time: 200

  };


  /**

   * mandatory objects for Metacog communications are publisher, application and widget id.
   * they are stored in a "session" object
   *
   * parameters of session object (session object is mandatory):
   *    <ul>
   *          <li><strong>publisher_id {string} mandatory</strong> identifier of the publisher.</li>
   *          <li><strong>application_id {string} mandatory</strong> identifier of the publisher's application.</li>
   *          <li><strong>widget_id {string} mandatory</strong> a custom value to identify the current Learning Object.</li>
   *          <li><strong>learner_id {string} optional</strong> a custom value. if not present, a random value will be used.</li>
   *          <li><strong>session_id {string} optional</strong> a custom value. if not present, a random value will be used.</li>
   *      </ul>
   *
   * optional parameters for training mode (if not present one with default values is created):
   * training: object with the following attributes (all are optional, setters are provided for TrainingEndpoint and TrainingToolbar)
   * <ul>
   *     <li>session_id: id of the training session being recorded: default null</li>
   *     <li>auth_token: auth token for the training api. default null.</li>
   *     <li>recording: by default false, turns on to start recording. default false.</li>
   *     <li><strong>toolbar</strong>: contains the css and html template paths for customizing the training toolbar UI.
   *     <ul>
   *         <li><strong>css</strong>: path to css </li>
   *         <li><strong>template</strong>: path to html template </li>
   *      </ul>
   *     </li>
   * </ul>
   *
   *  legacy parameters. this are also copied, mainly for back-compatibility:
   *  <ul>
   *      <li><strong>verbose {boolean} optional</strong> print the content of each message with console.log. useful for debugging while instrumenting.</li>
   *      <li><strong>idle {number} optional</strong> number of milliseconds the logger must wait for any user activity before sending an IDLE event.
   *      If not present, the logger won't send idle messages at all.</li>
   *      <li><strong>log_tab {boolean} optional</strong> if true, will send messages to the public log function of the ConsoleLog module. </li>
   *      <li><strong>mode {string} optional</strong> see MetaLogger.setMode.
   *
   *      </li>
   *  </ul>
   *  @memberOf Metacog.Config
   */
  Metacog.Config.init = function(_config){

    //publisher_id, application_id, widget_id, learner_id, session_id

    if(!_config){
      throw "configuration_object_is_mandatory";
    }


    //perform some basic validation over structure of config object
    if(!_config.session){
      throw "no_session_object_present";
    }


    if(!_config.session.publisher_id){
      throw "no_publisher_id_present";
    }

    if(!_config.session.application_id){
      throw "no_application_id_present";
    }

    //perform some basic validation over structure of config object
    if(!_config.session.widget_id){
      throw "no_session_widget_id_present";
    }

    if(_config.api_endpoint){
      this.api_endpoint = _config.api_endpoint;
    }

    if(_config.stream){
      this.stream = _config.stream;
    }

    if(_config.log_css){
      this.log_css = _config.log_css;
    }

    this.session.publisher_id =  _config.session.publisher_id;
    this.session.application_id = _config.session.application_id;
    this.session.widget_id = _config.session.widget_id;
    this.session.learner_id = _config.session.learner_id;
    this.session.session_id = _config.session.session_id;

    if(!_config.session.learner_id){
      this.session.learner_id = Metacog.generateUID();
    }

    if(!_config.session.session_id){
      this.session.session_id = Metacog.generateUID();
    }

    if(_config.training){

      if(_config.training.session_id)
        this.training.session_id = _config.training.session_id;

      if(_config.training.auth_token)
        this.training.auth_token = _config.training.auth_token;

      if(_config.training.recording)
        this.training.recording = _config.training.recording;

      if(_config.training.toolbar){
        if(_config.training.toolbar.css)
          this.training.toolbar.css = _config.training.toolbar.css;

        if(_config.training.toolbar.template)
          this.training.toolbar.template = _config.training.toolbar.template;
      }

      if(_config.training.bottompanel){
        if(_config.training.bottompanel.css)
          this.training.bottompanel.css = _config.training.bottompanel.css;
        if(_config.training.bottompanel.template)
          this.training.bottompanel.template = _config.training.bottompanel.template;
      }

    }

    if(_config.production){
      if(_config.production.max_concurrent_request)
        this.production.max_concurrent_request = _config.production.max_concurrent_request;
      if(_config.production.max_page_size)
        this.production.max_page_size = _config.production.max_page_size;
    }


    //support for backward compatibility (prior to 1.2.0)
    this.verbose =  _config.verbose;
    this.idle = _config.idle;
    this.log_tab = _config.log_tab;
    this.mode = _config.mode;

  };

})(Metacog);
/*
 if (typeof process !== 'undefined' && process !== null) {
 var Class = require('./Class');
 var LocalStorage = require('node-localstorage').LocalStorage;
 global.localStorage = new LocalStorage('./mylocalstorage');
 }
 */

(function(Metacog){
  'use strict';

  /**
   * Module to abstract management of localstorage, based on custom keys
   * @class
   */
  Metacog.OffLineStorage = {
    limit: 1024 * 5, // 5 MB

    /**
     * a prefix to isolate metacog events from other records in the storage
     */
    msgprefix: "vbd-",

    /**
     * a prefix to isolate different instances of this module (in the case of multiple widgets on the same browser)
     */
    instanceprefix: ""
  };


  /**
   *
   * @returns {string}
   */
  Metacog.OffLineStorage.getKeyPrefix = function(){
    return this.msgprefix+this.instanceprefix;
  };

  /**
   * returns true if the given key is conform to metacog standard
   * @param key
   */
  Metacog.OffLineStorage.validateKey =  function(key){
    return key.indexOf(this.getKeyPrefix()) === 0;
  };

  /**
   * add a message to the local storage. generates a unique key using a constant prefix and a timestamp.
   * @param message valid JSON object
   * @returns true on success. false on error. //ideally: the generated key of the new object, null if storage fails.
   */
  Metacog.OffLineStorage.add = function (message) {
    try {
      var key = this.getKeyPrefix() + Date.now() + localStorage.length;
      this.setObject(key, message);
      return true;
    } catch (exception) {
      return false;
    }
  };

  /**
   * put an object into localStorage.
   * if key does not have a valid format, throw error "invalid_key".
   * @param key
   * @param value
   */
  Metacog.OffLineStorage.setObject= function(key, value) {
    if(!this.validateKey(key))
      throw("invalid_key");
    localStorage.setItem(key, JSON.stringify(value));
  };

  /**
   * retrieve an object from local storage.
   * if key does not have a valid format, return null.
   * @param key
   * @returns {*}
   */
  Metacog.OffLineStorage.getObject = function(key) {
    if(!this.validateKey(key)) return null;
    var value = localStorage.getItem(key);
    if(value){
      try{
        var obj=JSON.parse(value);
        return obj;
      }catch(e){
        return null;
      }
    }
    return null;
  };


  Metacog.OffLineStorage.getItem = function (key) {
    return this.getObject(key);
  };

  Metacog.OffLineStorage.getItemsLength = function () {
    return localStorage.length;
  };

  Metacog.OffLineStorage.removeItem = function (key) {
    localStorage.removeItem(key);
  };

  /*
   * get the first item keys up to limit
   * must exclude all the keys that are not metacog-valid.
   * @param limit
   * @returns {Array}
   */
  Metacog.OffLineStorage.getItemKeys = function (limit) {
    var index, key, keys = [];

    var counter = 0;
    limit = Math.min(localStorage.length, limit);

    index = 0;
    while(counter < limit && index < localStorage.length){
      key = localStorage.key(index);
      if(this.validateKey(key)){
        keys.push(key);
        counter++;
      }
      index++;
    }

    return keys;
  };

  /**
   * heavy function! it SORTS the keys of the localStorage everytime it is called..
   * @returns {*}
   */
  Metacog.OffLineStorage.getStorageFirstKey = function() {
    var keys = Object.keys(localStorage).sort();
    return keys[0];
  };


  Metacog.OffLineStorage.getRemainingSpace =  function () {
    return Metacog.OffLineStorage.limit - decodeURI(encodeURIComponent(JSON.stringify(localStorage))).length;
  };

  Metacog.OffLineStorage.getFirstItemKeyByPriority= function (priority) {
    var index, key, keys, log, eventName;

    keys = Object.keys(localStorage).sort();
    for (index = 0; index < keys.length; ++index) {
      key = keys[index];
      if (localStorage.hasOwnProperty(key)) {
        log = this.getObject(key);
        eventName = log.event;

        if (eventName === priority) {
          return key;
        }
      }
    }
    return keys[0];
  };


})(Metacog);

/*
 if (typeof exports !== 'undefined' && exports !== null) {
 module.exports = OffLineStorage;
 }
 */
(function(Metacog){
  'use strict';

  //---------------- MODULE PUBLIC METHODS ---------------

  /**
   * Wrapper for network calls to the Metacog API endpoints.
   * @type {{object}}
   */
  Metacog.API = {
    _xhr: null
  };


  /**
  * initialize the xhr to be used by the API.
  * method included for testeability.. if no used, _getXhr will initialize from Metacog.newXhr
  */
  Metacog.API.init = function(xhr){
    this._xhr = xhr;
  };


  Metacog.API._getXhr =function(){
    if(!this._xhr){
      this.init(Metacog.newXhr());
    }
    return this._xhr;
  };


  /**
  * performs the authentication process with the server, passing the provided authorization token.
  *
  */
  Metacog.API.auth = function(token, cb, errcb){
   this._getXhr().open('GET', Metacog.Config.api_endpoint + '/auth/' + token);
   this._getXhr().setRequestHeader('Access-Control-Allow-Origin', '*');
   this._getXhr().setRequestHeader("Content-type", "application/json");
   this._getXhr().setRequestHeader("application_id", Metacog.Config.session.application_id);
   this._getXhr().setRequestHeader("widget_id", Metacog.Config.session.widget_id);
    this._sendXhr(cb, errcb);
  };


  /**
  * obtain a valid kinesis configuration object, to pass to AWS SDK
  */
  Metacog.API.init_kinesis = function(cb, errcb){

    //we use a new xhr object because the
    var xhr = Metacog.newXhr();

    xhr.open('GET', Metacog.Config.api_endpoint + '/access/kinesis');
    xhr.setRequestHeader("Content-type", "application/json");
    xhr.setRequestHeader("publisher_id", Metacog.Config.session.publisher_id);
    xhr.setRequestHeader("application_id", Metacog.Config.session.application_id);

    xhr.onreadystatechange = function() {
      if (xhr.readyState == 4){
        if(xhr.status == 200){
            var data = JSON.parse(xhr.responseText);
            cb(data);
        }else{
          if(errcb){
            errcb(xhr.status, xhr.responseText);
          }else{
            //throw this to warn the user that there was an error. he must pass a error callback in order to obtain details.
            throw 'unmanaged_metacog_api_error';
          }
        }
      }
    };

    xhr.send();
  };



  /**
  * retrieve the header information of an existing training session
  * GET /training_sessions/:session_id
  */
  Metacog.API.get_training_session = function(session_id, cb, errcb){
   this._getXhr().open('GET', Metacog.Config.api_endpoint + '/training_sessions/' + session_id);
    this._sendXhr(cb, errcb);
  };


  /**
  * retrieve the array of events of a existing training session
  * GET training_sessions/:session_id/events
  */
  Metacog.API.get_training_session_events = function(session_id, pointer, limit, cb, errcb){

    var url = Metacog.Config.api_endpoint + '/training_sessions/' + Metacog.Config.training.session_id + '/events?';
    if(pointer){
     url += 'skip='+pointer+'&';
    }
    url += 'limit='+limit;

     this._getXhr().open('GET', url);
      this._sendXhr(cb, errcb);
  };


  /**
  * create a new training session
  * POST /training_sessions
  */
  Metacog.API.post_training_sessions = function(session, cb, errcb){
     this._getXhr().open('POST',  Metacog.Config.api_endpoint +'/training_sessions');
      this._sendXhr(cb, errcb, session);
  };


  /**
  * close the current training session
  * POST /training_sessions/close
  * @param data {object} with numevents, start and end
  */
  Metacog.API.post_training_sessions_close = function(sessionid, data, cb, errcb){
     this._getXhr().open('POST',  Metacog.Config.api_endpoint +'/training_sessions/'+ sessionid + '/close');
      this._sendXhr(cb, errcb, data);
  };

  /**
  * @param data_str {string} batch of metcog events as a stringifyied JSON
  */
  Metacog.API.post_training_sessions_events = function(sessionid, data_str, cb, errcb){
    this._getXhr().open('POST', Metacog.Config.api_endpoint + '/training_sessions/' + sessionid + '/events');
    this._sendXhr(cb, errcb, data_str);
  };


  /**
  * retrieve an existing rubric
  */
  Metacog.API.get_rubric = function(rubricid, cb, errcb){
     this._getXhr().open('GET',  Metacog.Config.api_endpoint +'/rubrics/'+rubricid);
      this._sendXhr(cb, errcb);
  };


  /**
  * creates a new scoring object
  * POST /score
  */
  Metacog.API.post_score = function(score, cb, errcb){
      var _endpoint = '/training_sessions/'+score.training_session_id+'/scores';
     this._getXhr().open('POST',  Metacog.Config.api_endpoint +_endpoint);
      this._sendXhr(cb, errcb, score.serialize());
  };


  /**
  * get an existing score
  * GET /training_sessions/:training_session_id/scores/:score_id
  */
  Metacog.API.get_score = function(training_session_id, score_id, cb, errcb){
       var _endpoint = '/training_sessions/'+training_session_id+'/scores/'+score_id;
     this._getXhr().open('GET',  Metacog.Config.api_endpoint +_endpoint);
      this._sendXhr(cb, errcb);
  };


  /**
  * GET with search to different endpoints..
  */
  Metacog.API.get_search = function(_endpoint, filter, cb, errcb){
     this._getXhr().open('GET',  Metacog.Config.api_endpoint +_endpoint+filter);
      this._sendXhr(cb, errcb);
  };

  /**
  * save a existing score.
  * PUT /score
  * @params score {Score} an Object of Score type, Score.serialize is used instead of JSON.stringify.
  */
  Metacog.API.put_score = function(score, cb, errcb){
    var _endpoint = '/training_sessions/'+score.training_session_id+'/scores/'+score.id;
   this._getXhr().open('PUT',  Metacog.Config.api_endpoint +_endpoint);
    this._sendXhr(cb, errcb, score.serialize());
  };



  //--------- PRIVATE FUNCTIONS -----------------------

  /**
   * set the proper metacog headers
   * @private
   */
   Metacog.API._setupXhr = function(xhr){
    xhr.setRequestHeader('Access-Control-Allow-Origin', '*');
    xhr.setRequestHeader("Content-type", "application/json");
    xhr.setRequestHeader("auth", Metacog.Config.training.auth_token);
    xhr.setRequestHeader("widget_id", Metacog.Config.session.widget_id);
    xhr.setRequestHeader("publisher_id", Metacog.Config.session.publisher_id);
    return xhr;
  };

  /**
   * prepare a xhr with the proper metacog headers and invoke the send method.
   ( a prior call is required to open the connection with the method and url )
   * handles all the errors (redirect to UI error tab) and invoke the callback on success.
   * @param cb {function} callback to be invoked on success. params: data
   * @param errcb {function} callback to be invoked on errors. params: status, responseText
   * @param data {Object} Object to tokenize as JSON, or a String with a JSON value.
   * @private
   */
   Metacog.API._sendXhr = function(cb, errcb, data){
    var self = this;
     this._setupXhr(this._xhr)
      .onreadystatechange = function() {
      if (self._xhr.readyState == 4){
        if(self._xhr.status == 200 || self._xhr.status == 201 || self._xhr.status == 204){

          if(self._xhr.status == 204){
            cb({results:[]});
          }else{
            var data = JSON.parse(self._xhr.responseText);
            cb(data);
          }

        }else{
          if(errcb){
            errcb(self._xhr.status, self._xhr.responseText);
          }else{
            //throw this to warn the user that there was an error. he must pass a error callback in order to obtain details.
            throw 'unmanaged_metacog_api_error';
          }
        }
      }
    };
    if(data){
        if(typeof data === "string"){
         self._xhr.send(data);
        }else{
         self._xhr.send(JSON.stringify(data));
        }
    }else{
      self._xhr.send();
    }
  };



})(Metacog);



(function(Metacog){
  'use strict';

  //-----------PRIVATE MODULE CONSTANTS ---------

  //max number of characters in a batched message
  var MAX_BATCH_SIZE = 4098;


  //exponential backoff policy
  var MAX_RETRIES = 10;


  //-----------PRIVATE MODULE VARS --------------

  var _kinesis = null;

  /**
   * Offset in milliseconds to be added to local timestamps.
   * @type {null}
   */
  var g_serverTimeOffset = null;

  var _startServerTimeRequest = null;

  var _xhr = null;

  //-----------------------------


  /**
   * @constructor
   * Metacog.ProductionEndpoint
   * @summary
   * production endpoint. logs events to production API.
   * @description
   * Get Kinesis access and timestamp from the server. until it receives an answer, all calls to logEvent will be queued.
   * @param xhr {object} mandatory. a XHR object obtained from Metacog.getNewXHR utility method
   * @param kinesis {object} optional. a kinesis endpoint object. if not present, the endpoint will try to build one.
   * this parameter is used for testing purposes.
   */
  Metacog.ProductionEndpoint = function(xhr, kinesis){
    _xhr = xhr;
    _startServerTimeRequest = Date.now();
    if(kinesis){
      _kinesis = kinesis;
    }else{
      Metacog.API.init_kinesis(on_init_kinesis_sucess, on_init_kinesis_error);
    }
  };



  /*
   * Do its best to send all the content of the OfflineStorage.
   * - try to concatenate messages until certain size limit.
   * - fix timestamp of those messages that yet have a localtimestamp attribute.
   * - add to queue those messages that fail sending.
   * general structure of the sent data:
   * {
   *  "session":{ ... },
   *  "events":[{}, {}, ... {}]
   * }
   *
   * cbPre: callback invoked after detecting events in the queue, but before sending them to the server. pass the number of events.
   *
   * cbDone: invoke callback cb when processing is done. pass the number of processed events
   *
   */
  Metacog.ProductionEndpoint.prototype.processQueue= function(cbPre, cbDone){
    var itemsLength, data, keys;
    //if navigator is offline or kinesis is not yet configured, do nothing.. let the messages accumulate in the queue and try delivery later
    if (!Metacog.isOnLine() || !_kinesis){
      cbPre(0);
      cbDone(0);
      return;
    }

    itemsLength = Metacog.OffLineStorage.getItemsLength();

    if(itemsLength > 0){
      keys = Metacog.OffLineStorage.getItemKeys(Math.min(Metacog.Config.production.max_concurrent_request, itemsLength));

      if (keys.length > 0) {

        var message = '{"session":' + JSON.stringify(Metacog.Config.session) + ',"events":[';
        var size = message.length;
        var separator = "";
        var batched_keys = [];

        for (var i = 0; i < keys.length; ++i) {
          var key = keys[i];
          var timed_item = Metacog.OffLineStorage.getItem(key);
          if (typeof(timed_item.localtimestamp) !== 'undefined') {
            timed_item.timestamp = timed_item.localtimestamp - g_serverTimeOffset;
            delete timed_item.localtimestamp;
            Metacog.OffLineStorage.setObject(key, timed_item);
          }
          var item = JSON.stringify(timed_item);
          /*
           @todo: write a test for this case, and DRY this code with Training endpoint
           if the first message is greater than MAX_BATCH_SIZE, we must send it, anyway..*/
          if (item.length + size < MAX_BATCH_SIZE || i === 0) {
            message = message + separator + item;
            separator = ",";
            batched_keys.push(key);
            size += item.length + 1;
          }
          else {
            break;
          }
        }
        message += "]}";

        //send the batch!
        data = {
          "Data": btoa(message),
          "PartitionKey": Date.now().toString() + "",
          "StreamName": Metacog.Config.stream
        };

        cbPre(batched_keys.length);

        _kinesis.putRecord(data, function (err, return_data) {
          if (!err) {
            for (i = 0; i < batched_keys.length; ++i) {
              Metacog.OffLineStorage.removeItem(batched_keys[i]);
            }
          }
          cbDone(batched_keys.length);
        });
      }
      else{
        cbPre(0);
        cbDone(0);
      }
    } else {
      cbPre(0);
      cbDone(0);
    }
  };


  /*
   * @return {boolean} productionEndpoint never rejects events, so always returns true.
   * @param event
   */
  Metacog.ProductionEndpoint.prototype.onAddEventToQueue = function(message){
    if(g_serverTimeOffset !== null)
      message.timestamp =  Date.now() - g_serverTimeOffset;
    else
      message.localtimestamp =  Date.now();
    return true;
  };

  //----------------- private module methods -------------------

  /*
   * success callback for init_kinesis
   * receives a JSON response from the server
   */
  function on_init_kinesis_sucess(jsonResponse){
    // get the server time and calculate latency
    var servertime = parseInt(jsonResponse.time);
    var latency = Date.now() -_startServerTimeRequest;
    g_serverTimeOffset = Math.round((Date.now() + (latency / 2)) - servertime);
    // remove the response time from the response object
    delete jsonResponse.time;
    //adding exponential backoff policy
    jsonResponse.maxRetries = MAX_RETRIES;
    _kinesis = new AWS.Kinesis(jsonResponse);
  }

  /*
   * Error callback for init_kinesis
   * receives a Json Response from the server
   */
  function on_init_kinesis_error(jsonResponse){
    throw "Could not init Kinesis library. Server status: " + jsonResponse.status + " - Server response: " + jsonResponse.message;
  }




}(Metacog));
  /**
  * panel to present the metacog events. it is a children of BottomPanel.
  */
(function(Metacog, $){
  'use strict';
 //-----------PRIVATE MODULE VARS --------------

  //var CONTAINER_DIV = "metacog_bottom_panel";

  /**
  * Jquery DOM container.
  */
  var _container_div = null;

  var _enabled = true;


  //---------- PUBLIC METHODS -----------------

  /**
  * The Log panel is the container of the logged events.
  * this is a child of BottomPanel.
  * @constructor
  * @private
  * @param container_div {Object} JQuery Div container of the Bottom parent
  */
  Metacog.LogPanel = function(container_div){

    Metacog.loadCSS(Metacog.Config.log_css);
    _container_div = container_div.find("div#logger_body");
  };


  /**
  * convention-over-configuration signature for command bus, command "print"
  */
  Metacog.LogPanel.prototype.on_cmd_print =  function(msg)
  {
    // ignore message if it is disabled
    if(!_enabled)
      return;

    // check if this object is initialized
    if(!_container_div)
    {
      return;
    }

    var msgDefined = true;

    // convert non-string type to string
    if(typeof msg == "undefined")   // print "undefined" if param is not defined
    {
      msg = "undefined";
      msgDefined = false;
    }
    else if(msg === null)           // print "null" if param has null value
    {
      msg = "null";
      msgDefined = false;
    }
    else if(typeof msg === "object")
    {
      this.log(msg);
      return;
    }
    else
    {
      msg += ""; // for "object", "function", "boolean", "number" types
    }

    var lines = msg.split(/\r\n|\r|\n/);
    for(var i in lines)
    {
      // format time and put the text node to inline element
      var timeDiv = document.createElement("div");  // color for time
      timeDiv.setAttribute("style", "color:#999; float:left;");

      var timeNode = document.createTextNode(this._getTime() + "\u00a0");
      timeDiv.appendChild(timeNode);

      // create message span
      var msgDiv = document.createElement("div");
      msgDiv.setAttribute("style", "float:left; word-wrap:break-word;  width:90%;");
      if(!msgDefined)
        msgDiv.style.color = "#afa"; // override color if msg is not defined

      // put message into a text node
      var line = lines[i].replace(/ /g, "\u00a0");
      var msgNode = document.createTextNode(line);
      msgDiv.appendChild(msgNode);

      // new line div with clearing css float property
      var newLineDiv = document.createElement("div");
      newLineDiv.setAttribute("style", "clear:both;");

      _container_div.append(timeDiv);   // add time
      _container_div.append(msgDiv);    // add message
      _container_div.append(newLineDiv);// add message

      _container_div.scrollTop(_container_div.prop("scrollHeight"));   // scroll to last line
    }
  };

  /**
     * add a Metacog JSON event to the log tab. applies styles and parsing.
     * @param event
     */
  Metacog.LogPanel.prototype.log = function(event){

    if(!_enabled || event.type === "metacog")
      return;

    var strmsg = this.JSON2HTML(event);


     /**
      * special cases: reject type "metacog", except those with event "indicator"

    if(event.type === "metacog"){
     if(event.event !== "indicator"){
        return;
      }
      var indstr = "<span class='indicator' ";
      indstr += " data-dimension='"+event.data.dimension+"'";
      indstr += " data-indicator='"+event.data.indicator+"'";
      indstr += " data-timestamp='"+event.data.timestamp+"'";
      indstr += "></span>";
      strmsg = indstr + strmsg;
    }
 */

    var msgDiv = document.createElement("div");
    msgDiv.setAttribute("style", "word-wrap:break-word;" );
    Metacog._setDivContent(msgDiv, strmsg);
    _container_div.append(msgDiv);

    _container_div.scrollTop(_container_div.prop("scrollHeight"));   // scroll to last line
  };



  /**
     * parse a Metacog Event JSON object into html with proper spans and css classes.
     * @see Metacog.Config.log_css
     * @return {string} formatted JSON
     */
  Metacog.LogPanel.prototype.JSON2HTML = function(event){

    function openbracket(){
      html += "<span class='bracket'>{</span>";
    }
    function closebracket(){
      html += "<span class='bracket'>}</span>";
    }
    function parseobj(obj){
      openbracket();
      var sep = "";
      var key;
      for(key in obj){
        html += sep + "<span class='attr_label'>"+key+"</span>:";
        sep = ",";
        var val = obj[key];
        if(typeof val === "object"){
          parseobj(val);
        }else{
          if(typeof val === "string"){
            val = "'"+val+"'";
          }

          html += "<span class='attr_val'>"+val+"</span>";
        }
      }
      closebracket();
    }
    var html = "";

    openbracket();
    html += "<span class='event_label'>event</span>:<span class='event_name'>'"+event.event+"'</span>,";
    html += "<span class='type_label'>type</span>:<span class='type'>'"+event.type+"'</span>,";
    html += "<span class='timestamp_label'>timestamp</span>:<span class='timestamp'>'"+event.timestamp+"'</span>,";
    html += "<span class='data_label'>data:</span>";
    html += "<span class='data'>";
    parseobj(event.data);
    html += "</span>";
    closebracket();

    return html;
  };


  /**
  * command to reset the content of the log tab
  */
  Metacog.LogPanel.prototype.on_cmd_resetlog = function(){
    _container_div.html("");
  };


  //------------- PRIVATE FUNCTIONS --------------


  /*
  * get time and date as string with a trailing space
  * @private
  */
   Metacog.LogPanel.prototype._getTime = function()
   {
      var now = new Date();
      var hour = "0" + now.getHours();
      hour = hour.substring(hour.length-2);
      var minute = "0" + now.getMinutes();
      minute = minute.substring(minute.length-2);
      var second = "0" + now.getSeconds();
      second = second.substring(second.length-2);
      return hour + ":" + minute + ":" + second;
    };



})(Metacog, $);
(function(){
 "use strict";

  /**
  * @constructor
  */
  Metacog.IndicatorTimeline = function(){

    if(!d3){
      throw 'metacog scoring toolbar requires d3 library';
    }

    this.height = 150; //height of the focus
    this.height2 = 60; //height of the context
    this.axis_offset = [150, 10];

    this.root = d3.select("#indicator_timeline")
    //.attr("width", this.width+"px")
    .attr("width", "100%")
    .attr("height", this.height+this.height2+this.axis_offset[0]+"px")
    .style('border', '0px solid white');

    //the hack: ok, we set the width to 100%. query width through attributes will return "100%", useless, eh? let's try this:
    //it works, but returns 0 here. let's replace this.root with a div that already exists.
    this.width = d3.select("#metacog_bottom_panel")[0][0].getBoundingClientRect().width;

    //lets update the clipping area
    var _clip = this.root.select("rect#cliprect");
    _clip.attr("width", this.width);

    this.focus = this.root.append('g')
    .attr({ 'class': 'data_background', 'transform': 'translate(' + this.axis_offset[0] + ','+this.axis_offset[1]+' )', });

    this.context = this.root.append('g')
    .attr({ 'class': 'data_background', 'transform': 'translate(' + this.axis_offset[0] + ','+(this.axis_offset[1]+this.height + 30)+' )'})
    .style('border', '1px solid white');

    this.context_root = this.context.append('g');
    this.focus_root = this.focus.append('g')
    .attr({'style': 'clip-path: url("#clip");'});

    //temp values
    var minx = new Date(Metacog.PlaybackController.session.mintime);
    var maxx = new Date(Metacog.PlaybackController.session.maxtime);
    var domain = [".", ".."];

     ///// X AXIS (for focus) /////

    this.scalex = d3.scale.linear()
    .domain([minx, maxx])
    //.clamp(true) //DONT enable clamping! this will mess up all the icons positioning methods!
    .range([0, this.width - this.axis_offset[0]]);


    function parseTime(d){
      var _d = new Date(d);
      return _d.getHours() +":"+ _d.getMinutes() +":"+ _d.getSeconds();
    }

    this.axisx = d3.svg.axis()
    .scale(this.scalex)
    .tickFormat(parseTime);

    this.focus.append('g')
    .attr({ 'class': 'xaxis',
           'transform': 'translate(0,' + (this.height - this.axis_offset[1]) + ')', })
    .call(this.axisx);

    ///// X AXIS 2 (for context) /////

    this.scalex2 = d3.scale.linear()
    .domain([minx, maxx])
    .clamp(true)
    .range([0, this.width - this.axis_offset[0]]);

    this.axisx2 = d3.svg.axis()
    .scale(this.scalex2)
    .tickFormat(parseTime);

    this.context.append('g')
    .attr({ 'class': 'xaxis',
           'transform': 'translate(0,' + (this.height2 - this.axis_offset[1]) + ')', })
    .call(this.axisx2);

    //// Y AXIS (for focus) /////

    this.scaley  = d3.scale.ordinal()
    .domain(domain)
    .rangeBands([0, this.height- this.axis_offset[1]]);

    this.axisy = d3.svg.axis().scale(this.scaley).orient('left');
    this.focus.append('g')
    .attr({ 'class': 'yaxis' })
    .call(this.axisy);

    //// Y AXIS 2 (for context) /////

    this.scaley2  = d3.scale.ordinal()
    .domain(domain)
    .rangeBands([0, this.height2- this.axis_offset[1]]);

    window._timeline = this;

    //adding a vertical line to use as time_indicator
    this.vertical_line = this.context_root.append("line")
    .attr('x1', 0)
    .attr('y1', 0)
    .attr('x2', 0)
    .attr('y2', this.height2 - this.axis_offset[1])
    .style('stroke-width', "2px")
    .style('stroke', "yellow");


    var self = this;

    // BRUSH ///////
    //add a brush
    this.brush = d3.svg.brush()
    .x(this.scalex2)
    .on("brush", function(){
        self._on_brush();
        self._update_icons(true);
        })
    //.on("brushstart", function(){self._show_icons(false);})
    //.on("brushend", function(){self._show_icons(true);})
    ;

     this.context.append("g")
      .attr("class", "xbrush")
      .call(this.brush)
    .selectAll("rect")
      .attr("y", -6)
     .attr("height", this.height2 - 7)
     .attr("fill-opacity", 0.125);

    /// DRAG  /////////
    this._drag = d3.behavior.drag()
    .origin(function(d){return get_origin(this);})
    .on("drag", function(d){self.on_drag(this);})
    .on("dragstart", function(){self.on_drag_start(this);})
    .on("dragend", function(){self.on_drag_end(this);})
    ;

    //TOOLTIP
    this._tooltip = d3.select("body").append("div")
    .attr("class", "metacog_tooltip")
    .style("opacity", 1e-6);


  };


  /**
  * set the active dimension to be visualized in the timeline.
  */
  Metacog.IndicatorTimeline.prototype.set_active_dimension = function(rubric_dimension, score_dimension){
  var self = this;
    this.rubric_dimension = rubric_dimension;
    this.score_dimension = score_dimension;

    //forget last selected item
    this._set_selected_item(null);

    this.data = this._extract_data();

    //remove the add_icon buttons. setup_charts will add them again
    this.root.selectAll('.yaxis use').remove().on("click", null);


    this._setup_charts();

    //first reset the graph, then add new things
    this.focus_root.selectAll('rect').remove().on("click", null);


    //draw the rectangles in the top
    this._refresh_focus_chart_data();
    //draw the rectangles in the bottom
    this._refresh_context_chart_data();
 };


  /**
  * move the vertical line to a new position defined by progress.
  * @param progress {Number} between 0 and 1
  */
  Metacog.IndicatorTimeline.prototype.update_progress = function(progress){

    var d = this.scalex2.domain();
    var p = ((d[1]-d[0]) * progress )+ d[0];
    p = this.scalex2(p);
    this.vertical_line.attr('x1', p)
    .attr('x2', p);
  };


  /**
  * parses the rubric and score dimension to return an array of all the applied indicators
  * @private
  */
  Metacog.IndicatorTimeline.prototype._extract_data = function(){
    var data = [];
    var self = this;

      self.score_dimension.indicators.forEach(function(score_indicator){

      score_indicator.applied_indicators.forEach(function(applied_indicator){
          data.push({
            uid: applied_indicator.uid,
            ini: new Date(applied_indicator.ini),
            end: new Date(applied_indicator.end),
            indicator: score_indicator.name
                    });
        });
      });

    return data;
  };

  /**
  * having an array of applied indicators, we use that data to compute max and min values,
  * create color ranges, axis and other stuff
  */
  Metacog.IndicatorTimeline.prototype._setup_charts = function(){
    var self = this;

    //var minx = d3.min(this.data, function(applied_indicator){return applied_indicator.ini;});
    //var maxx = d3.max(this.data, function(applied_indicator){return applied_indicator.end;});

    var minx = Metacog.PlaybackController.session.mintime;
    var maxx = Metacog.PlaybackController.session.maxtime;

    this.scalex.domain([minx, maxx]);
    this.scalex2.domain([minx, maxx]);

    this.scaley.domain(this.rubric_dimension.indicators);
    this.scaley2.domain(this.rubric_dimension.indicators);

    this.focus.select(".xaxis").call(this.axisx);
    this.context.select(".xaxis").call(this.axisx2);

    this.focus.select(".yaxis").call(this.axisy);

    //colors for the yaxis. we use this for both the rectangles and the labels
    if(this.rubric_dimension.indicators.length < 10){
      this.colorscale = d3.scale.category10();
    }else{
      this.colorscale = d3.scale.category20();
    }


    //select the labels and put each one the color of the matching indicator
    var _yaxis_labels =  this.focus.selectAll(".yaxis text");

    _yaxis_labels.data(this.rubric_dimension.indicators)
    .attr("fill", function(d){return self.colorscale(d);})
    .attr("cursor", "arrow")
    .on("mouseover", function(d){
      console.log(d, d3.event.pageX, d3.event.pageY);
      self._tooltip.html(d)
      .style("left", (d3.event.pageX - 34) + "px")
      .style("top", (d3.event.pageY + 16) + "px")
      .transition()
      .duration(500)
      .style("opacity", 1);
    })
    .on("mouseout", function(d){
      self._tooltip.transition()
      .duration(500)
      .style("opacity", 1e-6);
    })
    ;

    //select the tick texts' and manipulate their transform x attribute (presserving the y value, that is unique for each element)
    d3.selectAll(".yaxis .tick text")
    .each(function(d){
      //console.log(d);
      //console.log(this);
      //"this" is the text element. we want the parent.
      var _pos = get_origin(this.parentNode);
      _pos.x -= 25;
      set_origin(this.parentNode, _pos.x, _pos.y);
    });

    //select the ticks (they are SVG "g" elements) to add icon buttons..
    this.focus.selectAll(".yaxis .tick")
      .append("use")
      .attr("xlink:href", function(d) { return "#add_icon_ref"/* + d.type*/; } );

    this.focus.selectAll(".yaxis use")
    .on("click", function(d){
      console.log("click ", this);
      self._apply_indicator(d);
    });

  };


  /**
  * create a new applied indicator and notify the model of the change
  * @private
  */
  Metacog.IndicatorTimeline.prototype._apply_indicator = function(indicatorname){
    //we need to obtain a random range to put the new indicator on, create the object and emit the command, then refresh the view

    var ini = (0.3*(this.scalex2.domain()[1] - this.scalex2.domain()[0]))+this.scalex2.domain()[0];
    var end = (0.6*(this.scalex2.domain()[1] - this.scalex2.domain()[0]))+this.scalex2.domain()[0];

    var applied_indicator = {
      indicator: indicatorname,
      dimension: this.rubric_dimension.name,
      ini:ini,
      end:end
    };
    Metacog._emit("apply_indicator", applied_indicator);

    //refresh the view
    this.set_active_dimension(this.rubric_dimension, this.score_dimension);
  };


  /**
  * update the visual of a item to match its internal .__data__ attribute (applied_indicator)
  * given the fact that each rectangle (item) in the graph holds a reference to an applied_indicator object,
  * if you change the time ini, end you may use this metod to make the visual match the data.
  */
  Metacog.IndicatorTimeline.prototype._refresh_item = function(item, applied_indicator){
    item.setAttribute("x", this.scalex(applied_indicator.ini));
   //we need the max because we can't use clamp in this axis and width does not support negative values
    item.setAttribute("width",  Math.max(1, this.scalex(applied_indicator.end) - this.scalex(applied_indicator.ini)));
  };


 /**
  * d3 brush event handler
  * @private
  */
  Metacog.IndicatorTimeline.prototype._on_brush = function(){
    this.scalex.domain(this.brush.empty() ? this.scalex2.domain() : this.brush.extent());

    var self = this;
     this.focus
    .selectAll('rect')
    .data(this.data)
    .each(function(applied_indicator, i){
      self._refresh_item(this, applied_indicator);
     });
    this.focus.select(".xaxis").call(this.axisx);
    this._update_icons(false);
  };

  /**
  * handler for clicking on applied indicators
  */
  Metacog.IndicatorTimeline.prototype.on_item_clicked = function(){
    this._set_selected_item(d3.event.srcElement);
  };


  /**
  * unselect the previous selected item and select the new one.
  * pass nothing if want just unselect the existing one.
  * @param item: the D3 DOM element to select
  */
  Metacog.IndicatorTimeline.prototype._set_selected_item = function(item){
   if(this._selected_item != null){
      this._selected_item.setAttribute("stroke-opacity", 0);
    }
    if(item){
      this._selected_item = item;
      this._selected_item.setAttribute("stroke", "white");
      this._selected_item.setAttribute("stroke-opacity", 1);
      this._update_icons(true);
      this._show_icons(true);
    }else{
      this._show_icons(false);
    }
  };

   /**
   * attach the arrows and trash icons to the selected item.
   *load them if they are not initialized.
   * @param reattach {boolean} if true, remove trash_icon from DOM and attach to selected_item.
   pass false if you just want to update the position withouth changing the selected_item.
   */
  Metacog.IndicatorTimeline.prototype._update_icons = function(reattach){
    var self = this;
    if(!this._trash_icon){
      //initialize
      this._trash_icon = d3.select("#trash_icon");
      this._right_arrow = d3.select("#right_arrow");
      this._left_arrow = d3.select("#left_arrow");

      //hide by default
      this._right_arrow.attr("opacity", 0);
      this._left_arrow.attr("opacity", 0);
      this._trash_icon.attr("opacity", 0);

      //attach event handlers
      this._trash_icon.on("click", function(){self.on_trash_clicked();});
      this._left_arrow.call(this._drag);
      this._right_arrow.call(this._drag);
    }
    if(!this._selected_item) return;
    var x = +this._selected_item.getAttribute("x");
    var y = +this._selected_item.getAttribute("y");
    var w = +this._selected_item.getAttribute("width");
    var h = +this._selected_item.getAttribute("height");

    var size = h / 80; //the icon_trash at scale 1 is about 80 px height
    if(reattach){
      var parent = d3.select(this._selected_item.parentNode);
      parent.append(function(){return self._trash_icon.node();});
      parent.append(function(){return self._right_arrow.node();});
      parent.append(function(){return self._left_arrow.node();});
    }
    this._trash_icon.attr("transform", "matrix("+size+",0,0,"+size+","+(x + w/2)+","+y+")");
    this._right_arrow.attr("transform", "matrix("+size+",0,0,"+size+","+(x+w+7)+","+(y + h/2)+")");
    this._left_arrow.attr("transform", "matrix("+size+",0,0,"+size+","+(x-7)+","+(y+h/2)+")");
  };

  /**
  * show or hide icons
  */
  Metacog.IndicatorTimeline.prototype._show_icons = function(flag){
    //this call ensure the icons are initialized..
    this._update_icons(false);
    this._trash_icon.attr("opacity", flag?1:0);
    this._left_arrow.attr("opacity", flag?1:0);
    this._right_arrow.attr("opacity", flag?1:0);
  };


  /**
   * draw the rectangles in the top
   */
  Metacog.IndicatorTimeline.prototype._refresh_focus_chart_data = function(){
    var self = this;

     function select_callback(){
      self._set_selected_item(d3.event.srcElement);
      self._show_icons(true);
    }

    this.focus_root
    .selectAll('rect')
    .data(this.data)
    .enter()
      .append('rect')
      .attr('x', function(applied_indicator, i){return self.scalex(applied_indicator.ini);})
      .attr('y', function(applied_indicator, i){return self.scaley(applied_indicator.indicator);})
      .attr('width', function(applied_indicator, i){return Math.max(1, self.scalex(applied_indicator.end) - self.scalex(applied_indicator.ini));})
      .attr('height', this.scaley.rangeBand()*0.8)
      .attr('class', 'applied_indicator_rect')
    .attr('fill', function(applied_indicator, i){ return self.colorscale(applied_indicator.indicator);})
    .on("click", select_callback);
    };


  /**
  * draw the rectangles in the bottom
  */
  Metacog.IndicatorTimeline.prototype._refresh_context_chart_data = function(){
    var self = this;
    //first reset the graph, then add new things
    this.context_root.selectAll('rect').remove();

    this.context_root
    .selectAll('rect')
    .data(this.data)
    .enter()
      .append('rect')
      .attr('x', function(applied_indicator, i){return self.scalex2(applied_indicator.ini);})
      .attr('y', function(applied_indicator, i){return self.scaley2(applied_indicator.indicator);})
      .attr('width', function(applied_indicator, i){return  Math.max(1, self.scalex2(applied_indicator.end) - self.scalex2(applied_indicator.ini));})
      .attr('height', this.scaley2.rangeBand()*0.8)
      .attr('class', 'applied_indicator_rect')
    .attr('fill', function(applied_indicator, i){ return self.colorscale(applied_indicator.indicator);});
  };


 /**
  * icon trash clicked hander
  */
  Metacog.IndicatorTimeline.prototype.on_trash_clicked = function(_this){
    var applied_indicator = this._selected_item.__data__;
    applied_indicator.dimension = this.rubric_dimension.name;
    //this must be listened by the Score object
    Metacog._emit("delete_applied_indicator", applied_indicator);
    //refresh the view
    this.set_active_dimension(this.rubric_dimension, this.score_dimension);
  };


  /**
  * drag handler
  */
  Metacog.IndicatorTimeline.prototype.on_drag = function(_this){

    var origin2;
    var src = d3.event.sourceEvent.srcElement;


    var origin = get_origin(_this);
    //ignoring dy we limit the dragging to x axis!
    //and, remember to clamp using drag_target_origin to prevent the arrows going into the rectangle..

    var x = origin.x + d3.event.dx;
    if(this._drag_target === this._left_arrow){
     origin2 = get_origin(this._right_arrow);
     x = Math.min(origin2.x-15, x);
    }
    else{
     origin2 = get_origin(this._left_arrow);
     x = Math.max(origin2.x+15, x);
    }
    set_origin(_this, x, origin.y);

    //invert
    var ddomain = this.scalex.invert(origin.x);

    //change model
    if(this._drag_target === this._right_arrow){
      this._selected_item.__data__.end = ddomain;
    }else if(this._drag_target === this._left_arrow){
      this._selected_item.__data__.ini = ddomain;
    }

    //let enrich this object with dimension id too
    this._selected_item.__data__.dimension = this.rubric_dimension.name;
    Metacog._emit("update_applied_indicator", this._selected_item.__data__);
    //refresh view, but only the item
    this._refresh_item(this._selected_item, this._selected_item.__data__); //??

  };

  /**
  * drag start handler
  */
  Metacog.IndicatorTimeline.prototype.on_drag_start = function(_this){

    var src = d3.event.sourceEvent.srcElement;
    if(src.id === "right_arrow"){
      this._trash_icon.attr("opacity", 0);
      this._drag_target = this._right_arrow;
    }else if(src.id === "left_arrow"){
      this._trash_icon.attr("opacity", 0);
      this._drag_target = this._left_arrow;
    }else{
      return;
    }
    //extract the origin x coord
    this._drag_target_origin = get_origin(this._drag_target);
  };


  /**
  * drag end handler
  */
  Metacog.IndicatorTimeline.prototype.on_drag_end = function(_this){
    var src = d3.event.sourceEvent.srcElement;
    Metacog._emit("save_scoring");
    //refresh the view
    this._refresh_context_chart_data();
    this._show_icons(true);
  };

    /////// PRIVATE UTILITY FUNCTIONS /////////////////////////


 /**
 * this is one of the arrows. they have only a transform, not x and y attributes.
 * so we need to parse the transform to extract the desired values (uff!)
 */
 function get_origin(_this){
   var tokens = get_parsed_transform(_this);
   return {
     x:tokens[tokens.length-2],
     y:tokens[tokens.length-1]
     };
 }

 /**
 * given a dom element with a transform property, update the transform to x and y
 *
 */
 function set_origin(item, x, y){
   var tokens = get_parsed_transform(item);

   //if transform is "matrix", will have lenght 6. "translate" and others will have length 2.
   tokens[tokens.length-2] = x;
   tokens[tokens.length-1] = y;
   set_parsed_transform(item, tokens);
 }


 /**
 * given a dom element with a transform property, return the transform as an array
 */
 function get_parsed_transform(item){
   //humm.. sometimes item is a d3 selection, in others, it is a dom..
   var transform;
   if(item.attr){
     transform = item.attr("transform");
   }else{
     transform =  d3.select(item).attr("transform");
   }
   //it may be "matrix" or "translate"
   transform = transform.replace("matrix(", "");
   transform = transform.replace("translate(", "");
   transform = transform.replace(")", "");
   var tokens = transform.split(",");
   for(var i=0; i<tokens.length; ++i){
     tokens[i] = +tokens[i];
   }
   return tokens;
 }


  /**
  * given a dom item and an array with a transform,
  * convert the transform to svg string notation and set the attribute in the item
  */
  function set_parsed_transform(item, transform){
   //if transform is "matrix", will have lenght 6. "translate" and others will have length 2.
    var str = transform.length == 6 ? "matrix(": "translate(";
    var separator = "";
    for(var i=0; i<transform.length; ++i){
      str+= separator + transform[i];
      separator = ",";
    }
    str+= ")";
    d3.select(item).attr("transform", str);
  }


})(Metacog, window.d3);
  /**
  * panel to present the metacog indicators. it is a children of BottomPanel.
  */
(function(Metacog, $){
  'use strict';
 //-----------PRIVATE MODULE VARS --------------

  //var CONTAINER_DIV = "metacog_bottom_panel";

  /**
  * Jquery DOM container.
  */
  var _container_div = null;

  var _currRubricDimension = null;
  var _currScoreDimension = null;

  var _indicator_timeline = null;

  //---------- PUBLIC METHODS -----------------

  /**
  * The Log panel is the container of the indicator timeline visualization.
  * this is a child of BottomPanel.
  * @constructor
  * @private
  * @param container_div {Object} JQuery Div container of the Bottom parent
  */
  Metacog.IndicatorsPanel = function(container_div){
    _container_div = container_div.find("div#indicators_body");
  };

/**
* creates a new IndicatorTimeline instance
*/
Metacog.IndicatorsPanel.prototype.init_chart = function(){
  if(_indicator_timeline){
    return;
  }
    _indicator_timeline = new Metacog.IndicatorTimeline();
};

/**
* command listener triggered by the playback controller
*/
Metacog.IndicatorsPanel.prototype.on_cmd_update_progress = function(progress, waitingfordata){
  if(!_indicator_timeline) return;
  _indicator_timeline.update_progress(progress);
};


/**
* command listener triggered when the user changes the active dimension in the scoring toolbar.
*/
 Metacog.IndicatorsPanel.prototype.on_cmd_dimension_changed = function(dimname){
    _currRubricDimension = Metacog.Config.rubric.getDimension(dimname);
    _currScoreDimension = Metacog.Config.scoring.getDimension(dimname);

   this.init_chart();
   _indicator_timeline.set_active_dimension(Metacog.Config.rubric.getDimension(dimname), Metacog.Config.scoring.getDimension(dimname));

 };

  /**
  * this command is triggered for the IndicatorTimeline to apply a new indicator
  */
  Metacog.IndicatorsPanel.prototype.on_cmd_apply_indicator = function(applied_indicator){
    var indicator = Metacog.Config.scoring.getIndicator(applied_indicator.dimension, applied_indicator.indicator);
    indicator.applied_indicators.push({
       uid: Date.now(),
       ini: applied_indicator.ini,
       end: applied_indicator.end
    });
    this.on_cmd_save_scoring();
  };


/**
* triggered when clicked the trash icon in the IndicatorTimeline
*/
  Metacog.IndicatorsPanel.prototype.on_cmd_delete_applied_indicator= function(applied_indicator){
    Metacog.Config.scoring.deleteAppliedIndicator(applied_indicator.dimension, applied_indicator.indicator, applied_indicator.uid);
    this.on_cmd_save_scoring();
  };


  /**
  * update command receive a applied_indicator object. given the fact that we need ini and end to
  * find the applied_indicator into the array, we must also provide new_ini, new_end values to override.
  */
  Metacog.IndicatorsPanel.prototype.on_cmd_update_applied_indicator= function(applied_indicator){
    Metacog.Config.scoring.updateAppliedIndicator(applied_indicator.dimension, applied_indicator.indicator, applied_indicator.uid, applied_indicator);
    //do not save here, we don't want a HTTP call by each pixel the arrow is drawn..
    //this.on_cmd_save_scoring();
  };

  /**
  * invoked when the scoring has changes that need to be saved in the server side
  */
  Metacog.IndicatorsPanel.prototype.on_cmd_save_scoring = function(){
    Metacog.Config.scoring.save(
    function(){
      console.log("scoring saved in the server!");
    },
    function(){
      console.log("scoring NOT saved :(");
    });
  };


})(Metacog, $);

(function(Metacog, $){
  'use strict';
 //-----------PRIVATE MODULE VARS --------------

  var CONTAINER_DIV = "metacog_bottom_panel";

  /**
  * Jquery DOM container. it contains the header and the body sections.
  */
  var _container_div = null;

  /**
  * Metacog.BottomPanel is the top level container for the UI elements that appears in the bottom of the screen.
  * currently, it includes the LogTab and the IndicatorsTab and handles all the HTML code and HTML events.
  */
  Metacog.BottomPanel = {};


  /**
  * a hash with key = panel name, value = panel object
  */
  var _panels = {};


  /**
  * retrieve the html and css templates and load them
  */
  Metacog.BottomPanel.init  = function(){
    _container_div = $("#"+CONTAINER_DIV);

    // avoid redundant call
    if(_container_div.lenght)
      return true;

    // check if DOM is ready
    if(!document || !document.createElement || !document.body || !document.body.appendChild)
      return false;

    Metacog.loadCSS(Metacog.Config.training.bottompanel.css);

     var xhr = Metacog.newXhr();
    /*
     * loading the html template. it may be the default value or a value provided by the user.
     */
    xhr.open("GET", Metacog.Config.training.bottompanel.template);
    xhr.setRequestHeader('Access-Control-Allow-Origin', '*');

    var self = this;
    xhr.onreadystatechange = function(){

      if(xhr.readyState != 4 || xhr.status != 200) return;

      //creates the root element that will hold the references to external resources
      _container_div = $("<div>");
      _container_div.attr('id', CONTAINER_DIV);
      _container_div.appendTo('body');
      _container_div.find("div#body_container").hide();
      _container_div.html(xhr.responseText);
      self._init();
    };
    // send the request
    xhr.send();
  };


  /**
  * callback function invoked async where the html template had been loaded into the DOM.
  * we may assume that it exist a DIV with id CONTAINER_DIV, and its content comes from the bottom-panel template.
  * in this method we browse the DOM to obtain references to key elements and create event bindings
  * @private
  */
  Metacog.BottomPanel._init = function(){

    _panels["logger"] = new Metacog.LogPanel(_container_div);

    //when used in metalogger library instead of metacog client library, IndicatorsPanel will not exist
    if(Metacog.IndicatorsPanel){
      _panels["indicators"] = new Metacog.IndicatorsPanel(_container_div);
    }

    //register this instance with the command bus
    Metacog._register(_panels["logger"]);
    Metacog._register(_panels["indicators"]);
    Metacog._register(Metacog.BottomPanel);

    _container_div.find('.tab_title').on("click", function(ev){set_active_panel(ev.target.id.replace("_tab", ""));});

  };

  /**
  * hide the pannel
  */
  Metacog.BottomPanel.hide = function(){
    _container_div.find("div#body_container").hide(500);
    _container_div.find("div#minus_tab").hide(500);
  };

  /**
  * show the panel
  */
  Metacog.BottomPanel.show = function(){
    _container_div.find("div#body_container").show(500);
    _container_div.find("div#minus_tab").show(500);
  };


  /**
  * make sure that selection of indicators force the panel to be visible
  */
  Metacog.BottomPanel.on_cmd_dimension_changed = function(dimname){
    set_active_panel("indicators");
    //lazy-load the d3-related stuff
    _panels["indicators"].init_chart();
  };

  //----------- PRIVATE MODULE FUNCTIONS -------------


  /**
  * set the active panel
  */
  function set_active_panel(panelid){
    if(panelid === "minus"){
      Metacog.BottomPanel.hide();
    }
    else{
      _container_div.find('.tab_title').removeClass("active");
      _container_div.find('.tab_title#'+panelid+"_tab").show().addClass("active");
      _container_div.find("div.tab_body").hide();
      _container_div.find("div#"+panelid+"_body").show();
      Metacog.BottomPanel.show();
    }
  }


})(Metacog, $);

(function(Metacog){
  'use strict';

  //-----------PRIVATE MODULE VARS --------------

  //max number of characters in a batched message
  var MAX_BATCH_SIZE = 4098;

  var _xhr;

  //--------------------------

  /**
   *  @constructor
   * TrainingEndpoint
   * @description
   * TrainingEndpoint will handle the communication with the training API.
   *  it is intended to be assigned to the Logger by the TrainingToolbar.
   *  the toolbar will control the sessionid and recording attributes.
   *  if some of these attributes is not set, the TrainingEndpoing will SILENTLY ignore events.
   */
  Metacog.TrainingEndpoint = function(xhr){
    _xhr = xhr;
    Metacog.Config.training.event_counter = 0;
  };

  /*
   * processing of the queue happens only if there is a sessionid set, and recording is true.
   * in other cases, the endpoint consumes the events silently, without invoking cbMsgProcessed, and invoking cbDone with zero.
   * there is no way to detect if there were no messages or if they were consumed silently.
   *
   * @param cbPre: callback invoked after detecting events in the queue, but before sending them to the server. pass the number of events.
   * @param cbDone: it is mandatory to invoke this method! pass the number of processed events
   */
  Metacog.TrainingEndpoint.prototype.processQueue = function(cbPre, cbDone){

    var itemsLength, keys, i;

    if( !Metacog.Config.training.session_id || !Metacog.Config.training.auth_token ){
      //must create a session in order to send events.. and must be in record mode (not paused)
      //in training mode, we DISCARD events we are not interested into, instead of let them accumulate in the queue.
      itemsLength = Metacog.OffLineStorage.getItemsLength();
      keys = Metacog.OffLineStorage.getItemKeys(itemsLength);
      //remove from offline storage
      for (i = 0; i < keys.length; ++i) {
        Metacog.OffLineStorage.removeItem(keys[i]);
      }
       cbPre(0);
       cbDone(0);
       return;
    }

    itemsLength = Metacog.OffLineStorage.getItemsLength();

    if(itemsLength > 0){
      keys = Metacog.OffLineStorage.getItemKeys(Math.min(Metacog.Config.production.max_concurrent_request, itemsLength));

      if (keys.length > 0) {

        var message = '{"session":' + JSON.stringify(Metacog.Config.session) + ',"events":[';
        var size = message.length;
        var separator = "";
        var batched_keys = [];

        // set the start time only if it hasn't been set before
        if (!Metacog.Config.training.timestamps.start)
          Metacog.Config.training.timestamps.start = Metacog.OffLineStorage.getItem(keys[0]).timestamp;

        // last element of the list is the end time
        Metacog.Config.training.timestamps.end = Metacog.OffLineStorage.getItem(keys[keys.length-1]).timestamp;

        for (i = 0; i < keys.length; ++i) {
          var key = keys[i];
          var timed_item = Metacog.OffLineStorage.getItem(key);
          var item = JSON.stringify(timed_item);
          /*
           @todo: write a test for this case!
           if the first message is greater than MAX_BATCH_SIZE, we must send it, anyway..*/
          if ((item.length + size) < MAX_BATCH_SIZE /*|| i === 0*/) {
            message = message + separator + item;
            separator = ",";
            batched_keys.push(key);
            size += item.length + 1;
          }
          else {
            break;
          }
        }
        message += "]}";

        cbPre(batched_keys.length);
        Metacog.API.post_training_sessions_events(Metacog.Config.training.session_id, message,
        function(){
              //remove from offline storage
              for (i = 0; i < batched_keys.length; ++i) {
                Metacog.OffLineStorage.removeItem(batched_keys[i]);
              }
              Metacog.Config.training.event_counter += batched_keys.length;
              cbDone(batched_keys.length);
        },
        function(){
              throw "no_training_api_server_available";
        });

      }
      else{
        cbPre(0);
        cbDone(0);
      }
    }
    else {
      cbPre(0);
      cbDone(0);
    }
  };

  /*
   * @return {boolean} returns false if not in recording mode, causing the logger not adding events to queue.
   * @param message
   */
  Metacog.TrainingEndpoint.prototype.onAddEventToQueue = function(message){

    if(!Metacog.Config.training.recording){
      //do not accept messages if we are not in recording mode! but remember to clean the queue..
      return false;
    }

    message.timestamp =  Date.now();
    return true;
  };


}(Metacog));

(function(Metacog){
  'use strict';


  var _queue= [];

  /*
   * @constructor
   */
  Metacog.TestingEndpoint = function(){
  };

  Metacog.TestingEndpoint.prototype.processQueue= function(cbMsgProcessed, cbDone){
    _queue.forEach(function(msg){
      cbMsgProcessed(msg);
    });
    _queue = [];
    cbDone();
  };

  /*
   *
   * @param message
   */
  Metacog.TestingEndpoint.prototype.onAddEventToQueue = function(message){
    _queue.push(message);
    return true;
  };


  /**
  * just for testing purpouses
  * @private
  */
  Metacog.TestingEndpoint._getQueue = function(){
    return _queue;
  };


  /**
  * just for testing purpouses
  * @private
  */
  Metacog.TestingEndpoint._resetQueue = function(){
    _queue = [];
  };

}(Metacog));
'use strict';

(function(Metacog){

  //-----------PUBLIC MODULE CONSTANTS ---------


  /**
   * Enum for event types.
   * @readonly
   * @enum {string}
   * @public
   * @kind constant
   * @see logEvent
   */
  Metacog.EVENT_TYPE = {
    /**
     * @desc indicates that the event has not impact in the model of the simulation, only in the user interface, like displaying a dialog.
     */
    UI:'ui',
    /**
     * @desc indicates that the event affects the underlying model of the Learning Object.
     */
    MODEL:'model',
    /**
     * this event type is used for special events, like enabling playback mode. It used for communication between objects within the library, they are not sent to the backend.
     */
    METACOG: 'metacog'
  };


  /**
   * the idea is to have a single instance of the logger (as a singleton) but backward compatibility requires to offer a constructor..
   * so we keep the last constructed instance referenced here
   * @type {null}
   */
  var instance = null;


  //-----------PRIVATE MODULE CONSTANTS ---------




  //-----------PRIVATE MODULE VARS --------------

  // used for instrumentation hooks
  var inst_target = null;
  var inst_cb = null;

  var _window = null;

  /**
   * id of the timeout used for ticking the logger. set through Logger.start and stop methods
   * @type {null}
   */
  var g_timeout = null;


  /**
   * a instance of productionEndpoint, trainingEndpoint or testingEndpoint, according to the mode.
   * @type {null}
   * @private
   */
  var endpoint = null;


  /**
   * helper variable to keep track of idle g_timeout
   * @see update_idle_status
   * @type {null}
   */
  var g_idleElapsedTime = null;

  /**
   * helper variable to keep track of last tick time
   * @type {null}
   */
  var g_lastTime = null;




  //---------- CLASS LOGGER (public methods) ---------------------


  Metacog.Logger = {
  };


  /**
  * a value between 0 and 1 that measures queue activity over time. it jumps to 1 when sending events
  * and decay slowly to zero.
  * @type {number}
  */
  Metacog.Logger.activity = 0;


  /**
   * @description
   * The instance will not accept messages until a call to start is done.
   * for legacy support, if valid parametrization is passed the Metacog.Config.config object will be created internally,
   * but this is not recomended for new instrumentations.
   * @param {object} config a Metacog.Config.config object.
   */
  Metacog.Logger.init = function(config){

    if(config){

      /*backward compatibility..
       prior to 1.2.0 version, Logger receives directly  a plain config object. we must be sure that if a valid plain object is passed,
       a new MetaCog config is built to keep old instrumented widgets running.
       */
      if(config.session){
        Metacog.Config.init(config);
      }
      else
        throw 'config_must_be_metacog_config_instance';
    }

    //backward compatibility
    if(typeof(Metacog.Config.log_tab) == 'undefined'){
      Metacog.Config.log_tab = false;
    }

    //set the widget id as part of the prefix for the OfflineStorage service
    Metacog.OffLineStorage.instanceprefix = Metacog.Config.session.widget_id;

    if(Metacog.Config.verbose  === undefined){
      Metacog.Config.verbose = false;
    }

    this.setMode(Metacog.Config.mode);

    //prevent weird behaviours if called multiple times
    this.stop();

  };


  /**
   * defines the mode of operation for the logger. it can be changed at runtime with Metacog.setMode(mode).
   *          available modes:
   *          <ul>
   *              <li><strong>production</strong> (default): events are sent to kinesis</li>
   *              <li><strong>testing</strong>: events are not sent to the server. suggestion: use log_tab = true to see the events in the helper console tab</li>
   *              <li><strong>training</strong>: enables the training toolbar and batches messages for sending to training REST API. </li>
   *          </ul>
   * @param mode
   */
  Metacog.Logger.setMode = function(mode){
    var xhr;
    Metacog.Config.mode = null;
    endpoint = null;
    if(typeof(mode) === 'undefined'){
      Metacog.Config.mode = 'production';
    }
    else Metacog.Config.mode = mode;

    if(Metacog.Config.mode === "production"){
      xhr = Metacog.newXhr();
      endpoint = new Metacog.ProductionEndpoint(xhr);
    }else if(Metacog.Config.mode === "testing"){
      endpoint = new Metacog.TestingEndpoint();
    }else if(Metacog.Config.mode === "training"){
      xhr = Metacog.newXhr();
      endpoint = new Metacog.TrainingEndpoint(xhr);
    }else{
      throw "metacog_invalid_mode";
    }

  };


  /**
   * utility method to delay the execution of the given callback until a property with the given target_name
   * exist in the global context.
   * this is useful in the cases where the Learning Object utilizes a preloader process that delays the creation of the object of interest.
   * @param {string} target_name name of the property to watch.
   * @param {callback} cb callback function to invoke when the object existence is detected. ideally, calls to watch log methods must be declared here.
   */
  Metacog.Logger.configure_instrumentation = function(target_name, cb){
    inst_target = target_name;
    inst_cb = cb;
    inst_check_object();
  };


  /**
   * Utility method to add interceptor callbacks before and after calling an arbitrary function.
   * The target function may be a global function or a method of a global object.
   * The purpose of this method is to help to keep separated the Learning Object code from the instrumentation code.
   * @param {object} configuration attributes:
   * <ul>
   *     <li><strong>targetMethodName {string} mandatory</strong> global function name or target object method name that will be intercepted.</li>
   *     <li><strong>targetObject {object} optional</strong> if undefined, assume targetMethod is a global function. if present, assume targetMethod is a method of this object</li>
   *     <li><strong>preCallback {callback} optional</strong> callback function to be executed before the target method is invoked</li>
   *     <li><strong>postCallback {callback} optional </strong> callback function to be executed after the target method is invoked</li>
   *  </ul>
   * @param: targetObject
   * @method
   */
  Metacog.Logger.logMethod = function(config){
    if(config.targetObject === undefined){
      config.targetObject = _window;
    }
    var func  = config.targetObject[config.targetMethodName];
    config.targetObject[config.targetMethodName] = function(){
      if(config.preCallback !== undefined) config.preCallback.apply(this, arguments);
      func.apply(config.targetObject, arguments);
      if(config.postCallback !== undefined) config.postCallback.apply(this, arguments);
    };
  };


  /**
   * Starts the processing of the event queue. in start method, we put a first message with the session object.
   */
  Metacog.Logger.start = function(){
    if(g_timeout !== null) return;
    g_lastTime = Date.now();
    if(Metacog.Config.idletime !== undefined){
      g_idleElapsedTime = 0;
      window.onload = _resetIdleTimer;
      window.onclick = _resetIdleTimer;
      window.onmousemove = _resetIdleTimer;
      window.onmouseenter = _resetIdleTimer;
      window.onkeydown = _resetIdleTimer;
      window.onscroll = _resetIdleTimer;
      window.onfocus = _resetIdleTimer;

    }

    Metacog._emit("print", "starting Metacog Logger v"+ Metacog.VERSION +": "+ JSON.stringify(Metacog.Config.session));

    g_timeout = setTimeout(tick, Metacog.Config.production.queue_tick_time);
  };

  /**
   * Stops the processing of the event queue.
   */
  Metacog.Logger.stop = function(){
    if(g_timeout === null) return;
    clearTimeout(g_timeout);
    g_timeout = null;
  };

  /**
   * add a event to the queue. it will be sent ASAP by the timing mechanism of the logger.
   * @param {string} event_name name of the event
   * @param {object} data json object with custom data
   * @param {string} type one of the module constants Metacog.EVENT_TYPE.UI, Metacog.EVENT_TYPE.MODEL
   * @method
   */
  Metacog.Logger.logEvent = push_event;


  /**
   *
   * @returns {null}
   */
  Metacog.Logger.getEndpoint = function(){
    return endpoint;
  };

  //---- PRIVATE METHODS -----------------------------

  function inst_check_object(){
    if(typeof window[inst_target] === 'undefined'){
      setTimeout(inst_check_object, 1000);
    }
    else{
      //keep a inner reference to global window object. window is not accessible from configuration callback.
      _window = window;
      inst_cb();
    }
  }

  /**
   * run the update methods and process the event queue
   */
  function tick(){
    var now = Date.now();
    var dt = now - g_lastTime;
    update_idle_status(dt);
    process_queue();
    g_lastTime = now;
  }

  function update_idle_status(dt){
    if(g_idleElapsedTime === null) return;
    g_idleElapsedTime += dt;
    if(g_idleElapsedTime >= Metacog.Config.idletime){

      push_event('idle', {
        "target": "document",
        "interval": g_idleElapsedTime
      }, Metacog.EVENT_TYPE.UI);
      g_idleElapsedTime -= Metacog.Config.idletime;
    }
  }


  function _resetIdleTimer(){
    g_idleElapsedTime = 0;
  }


  function consoleLog(msg){
    if(Metacog.Config.verbose && window["console"] !== undefined && window.console["log"] !== undefined){
      console.log(msg);
    }
  }

  /**
   * events are stored in the queue.
   * timestamp requiere aditional calculations:
   * - if g_serverTimeOffset is set (not null), log will have a definitive timestamp atribute.
   * - else, it will have a localtimestamp atribute, and the message will stay in the queue
   *   until sometime in the future there is a serverTimeOffset to calculate timestamp and remove this
   *   temporal attribute. @see process_queue.
   * @param {object} event with proper metacog JSON structure
   */
  function push_event(evt){

    if(evt  === null || evt.data === null || typeof evt.data !== "object"){
      throw  "metacog_invalid_json_object";
    }

    if(g_timeout === null){
      //logger is not running! discard event
      return;
    }


    /**
     * this call gives opportunity to endpoint to do some preprocessing on the messages prior to their addition to the queue
     */
    if(!endpoint.onAddEventToQueue(evt)){
      /* if here, means that the endpoint had rejected the event.
       * a possible case is TrainingEndpoint after hitting the close button
       */
      return;
    }

    //there are going to be events in the queue, so it is fair to mark activity at 100%
    Metacog.Logger.activity = 1.0;


    // Save the log event in the localStorage.  If not space is available, try recycle a space
    var eventName,
      searchedPriorities,
      key = Metacog.OffLineStorage.getStorageFirstKey();
    while (true !== Metacog.OffLineStorage.add(evt) && key !== null) {
      eventName = evt.event;

      if (null === Metacog.Config.eventPriorities) {
        key = Metacog.OffLineStorage.getStorageFirstKey();
      } else {
        switch (getPriorityByEventName(eventName)) {
          case "low":
            searchedPriorities = ["low"];
            break;

          case "medium":
            searchedPriorities = ["low", "medium"];
            break;

          case "high":
            searchedPriorities = ["low", "medium", "high"];
            break;
          default:
            searchedPriorities = [];
            key = null;
            break;
        }

        for (var index = 0; index < searchedPriorities.length; ++index) {
          key = Metacog.OffLineStorage.getFirstItemKeyByPriority(searchedPriorities[index]);

          if (null !== key) {
            break;
          }
        }
      }

      if (key) {
        Metacog.OffLineStorage.removeItem(key);
      }
    }
  }

  /**
   *
   * @param eventName
   * @returns {*}
   */
  function getPriorityByEventName(eventName) {
    var priority;

    for (priority in Metacog.Config.eventPriorities) {
      if (priority) {
        if (-1 !== Metacog.Config.eventPriorities[priority].indexOf(eventName)) {
          return priority;
        }
      }
    }
  }


  /**
   * Do its best to send all the content of the Metacog.OffLineStorage.
   * - try to concatenate messages until certain size limit.
   * - fix timestamp of those messages that yet have a localtimestamp attribute.
   * - add to queue those messages that fail sending.
   * general structure of the sent data:
   * {
     *  "session":{ ... },
     *  "events":[{}, {}, ... {}]
     * }
   */
  function process_queue() {
    endpoint.processQueue(function(num_events_to_process){ //event pre processed: before calling the server
        if(num_events_to_process > 0){
          Metacog.Logger.activity = 1.0;
        }

      },
      function(num_events_processed){ //queue processed callback. after calling the server

        //we use num_events_processed to implement a decay algorithm to measure queue activity..
        if(num_events_processed > 0){
          Metacog.Logger.activity = 1.0;
        }else if(Metacog.Logger.activity > 0){
          Metacog.Logger.activity = (Metacog.Logger.activity < 0.01)?0.0: Metacog.Logger.activity*0.6;
        }

        g_timeout = setTimeout(tick, Metacog.Config.production.queue_tick_time);
      });
  }

}(Metacog));

/**
 * @namespace MetaLogger
 * @description
 * version 1.1 of the Metacog Client Library had a MetaLogger class that the user had to initialize and use directly in order
 * to send messages. from version 1.2, the preferred way to send events is through the Metacog.Router object.
 * @deprecated
 */
var MetaLogger = (function(Metacog){

  var MetaLogger = {
    EVENT_TYPE: Metacog.EVENT_TYPE
  };

  /**
   * @constructor
   * MetaLogger.Logger
   * @summary
   * MetaLogger backward-compatibility class.
   * @deprecated
   * @description
   * This implementation of MetaLogger class wraps the call to the new Metacog objects.
   * @param config {object} JSON object with configuration parameters.
   */
  MetaLogger.Logger = function(config){
    Metacog.Logger.init(config);
  };

  /**
   * wraps the call to Metacog.Router.sendEvent.
   * @deprecated
   * @param evt {object} JSON object to be sent as event to the Metacog platform.
   * @memberOf MetaLogger.Logger
   */
  MetaLogger.Logger.prototype.logEvent = function(name, data, type){
    Metacog.Logger.logEvent({event:name, data:data, type:type});
  };

  /**
   * Generate a random number given a min and max range.
   * Used for testing purposes (random student ids, etc)
   * @deprecated
   */
  MetaLogger.getRandInt = function(min, max){
    return Math.floor(Math.random() * (max - min + 1)) + min;
  };

  /**
   * wraps the call to Metacog.Router.start
   * @deprecated
   */
  MetaLogger.Logger.prototype.start = function(){
    Metacog.Logger.start();
  };

  return MetaLogger;
})(Metacog);


(function(Metacog){
  'use strict';


  var _event_counter = 0;

  /**
   * metaRouter may be used to re-implement widgets in order to support playback.
   * it must be passed a callback that receives the events.
   * @class
   */
  Metacog.Router = {};

  Metacog.Router._callback = null;


  /**
   * configure the Router object
   * @param callback: a object that declares camel-case methods that must match the event names. each method will receive a data, olddata (optional) params
   */
  Metacog.Router.init = function(callback){

    if(callback){
      this._callback = callback;
    }
  };


  /**
  * getter for event_counter
  */
  Metacog.Router.event_counter = function(){
    return _event_counter;
  };


  /**
  * set event_counter to zero
  */
  Metacog.Router.resetEventCounter = function(){
    _event_counter = 0;
  };



  /**
   * Receives a JSON object that represents an event.
   * The event is sent to the listener first, through the callback method.
   * If there are no errors, it is sent to the logger.
   * @param evt
   * @param prevevt
   * @param fromPlayback true if the caller is the Metacog.PlaybackController
   */
  Metacog.Router.sendEvent = function(evt, prevevt, fromPlayback){

    if(!evt){
      throw 'invalid_event_type';
    }

    if(!evt.event || !evt.data || !evt.type) {
      throw 'invalid_event_structure';
    }

    var name = evt.event.replace(/-/g, "_");

    var _process = true;
    //while in playback mode, block events that don't come from the playback controller (collateral triggers)
    if(Metacog.PlaybackController.isPlaying() && !fromPlayback){
      _process = false;
    }
    //..but let pass special metacog events!
    if(name.indexOf("metacog_") === 0){
      _process = true;
    }

    if(_process){
      if(this._callback){
        if(this._callback[name]){
          this._callback[name](evt.data, prevevt?prevevt.data:null);
        }
        else if(this._callback.on_event){ //no custom callback? lets try with a default one..
          //notice that on_event receives the whole event, not the data attribute
          this._callback.on_event(evt, prevevt?prevevt:null);
        }
      }

      if(!prevevt){
        Metacog.Logger.logEvent(evt);
      }

      if (Metacog.Config.log_tab === true) {
        Metacog._emit("print", evt);
      }

      _event_counter++;

    }
  };
})(Metacog);
(function(Metacog){
  'use strict';

  /**
  * @description this class works with relational backends. for non-sql use DynamoInfiniteBuffer instead.
  * @deprecated
  * @constructor
  * @param max_global_size {Number} total size of the target buffer
  * @param max_page_size {Number} max size for pagination calls
  * @param local_buffer_size {Number} size of the local buffer, as factor of max_page_size (eg: 3 means 3*max_page_size slots)
   @param provider {function }  is a callback function that is used as source for a remote large buffer.
      * @param skip {Number} current global position of the iterator
      * @param max_mage_size {Number} max page size requested. may return less.
      * @param cb {Function} callback that is invoked when new data is ready. it pass and array of records. empty if no more.
  */
 var InfiniteBuffer = function(global_size, max_page_size, provider){
   this.global_size = global_size;
   this.max_page_size = max_page_size;
   this.slots = new Array(this.max_page_size);
   //usually will be equals to slots.length (max_page_size) but sometimes it may be less (i.e, at the end of the global buffer)
   this.slots_length = 0;
   this.provider = provider;
   //position of the local buffer related to the global buffer
   this.page = -1;
   this.local_index = -1;
   this.waiting_for_data = false;
 };


  /**
  * return true if there is more data in the global (remote) buffer,
  * it does not matter if the data is out of range of the local array
  */
  InfiniteBuffer.prototype.hasGlobalNext = function(){
    return (this.local_index+1>=0) &&
      (this._localToGlobalIndex(this.local_index + 1) < this.global_size);
  };

  /**
  * return true if there is more data in the global (remote) buffer,
  * it does not matter if the data is out of range of the local array
  */
  InfiniteBuffer.prototype.hasGlobalPrev = function(){
    if(this.local_index == -1)
      return true;
    else{
      var globindex = this._localToGlobalIndex(this.local_index - 1);
      var flag =  globindex >= 0;
      //console.log("InfiniteBuffer.hasGlobalPrev: ", flag, this.local_index, globindex);
      return flag;
    }
  };

  /**
  * try to advance the local index.
  * return true if the data is available for retrieval with the val method.
  * return false means that it is waiting for retrieval of remote data from the provider.
  */
  InfiniteBuffer.prototype.next = function(){

    if(this.waiting_for_data) {
      return false;
    }

    if(this._globalIndexAvailable(this._localToGlobalIndex(this.local_index+1))){
      this.local_index++;
      return true;
    }
    else{
      this.page++;
      this._retrievePage(false);
      return false;
    }
  };


  /**
  * try to decrease the local index.
  * return true if the data is available for retrieval with the val method.
  * return false means that it is waiting for retrieval of remote data from the provider.
  */
  InfiniteBuffer.prototype.prev = function(){

    if(this.waiting_for_data) {
      return false;
    }

    if(this.local_index == -1 && this.page == -1){
      this.page = Math.floor(this.global_size / this.max_page_size);

      if(this.page * this.max_page_size === this.global_size){
        //there are no more events, so the last page must be one minus this one.
        this.page--;
      }

      //console.log("infinitebuffer.js prev we are at the last page ", this.page, this.local_index);
      this._retrievePage(true);
      return false;
    }

    var globindex = this._localToGlobalIndex(this.local_index-1);
    //console.log("infinitebuffer.js:prev: local_index -1:", this.local_index-1, "globindex:", globindex, "page:", this.page);
    if(this._globalIndexAvailable(globindex)){
      if(this.local_index === 0){
        this.local_index = this.max_page_size;
        this.page--;
        this._retrievePage(true);
        return false;
      }else{
        this.local_index--;
      }
      return true;
    }
    else{
      this.page--;
      this._retrievePage(true);
      return false;
    }
  };




  /**
  * returns the value to which is pointing local_index
  */
  InfiniteBuffer.prototype.val = function(){
    //console.log("ib.js val gi ", this._localToGlobalIndex(this.local_index));
    return this.slots[this.local_index];
  };


  /**
  * reset the buffer
  */
  InfiniteBuffer.prototype.reset = function(){
    this.local_index = -1; //this.global_size % this.max_page_size;
    this.page = -1; //Math.floor(this.global_size / this.max_page_size);
  };


  /**
  * returns {Number} global index transformed into global index
  */
  InfiniteBuffer.prototype._localToGlobalIndex = function(li){
    return (this.page*this.max_page_size) + li;
  };


  /**
  * returns true if global index gi is loaded into local data
  */
  InfiniteBuffer.prototype._globalIndexAvailable = function(gi){
    if(gi < 0) return false;
    var offset = this.page*this.max_page_size;
    return gi >= offset && gi < Math.min(offset + this.max_page_size, this.global_size);
  };


  /**
  * if moveToEnd is true, local_index will be moved to the lenght of returned data.
  * else, it will be set to -1
  */
  InfiniteBuffer.prototype._retrievePage = function(moveToEnd){
    this.waiting_for_data = true;
    var offset = (this.page)*this.max_page_size;
    var self = this;
    this.provider(offset, this.max_page_size, function(data){
      self.slots_length = Math.min(data.length, self.max_page_size);
      for(var i=0; i<self.slots_length; ++i){
        self.slots[i] = data[i];
      }
      self.waiting_for_data = false;
      if(moveToEnd){
        self.local_index = data.length;
      }else{
        self.local_index = -1;
      }
      //console.log("infinitebuffer.js retrievePage: we got offst ", offset, "local index ",self.local_index);

    });
  };


 Metacog.InfiniteBuffer = InfiniteBuffer;


})(Metacog);
(function(Metacog){
  'use strict';

  /**
  * @constructor
  * @param max_global_size {Number} total size of the target buffer
  * @param max_page_size {Number} max size for pagination calls
  * @param local_buffer_size {Number} size of the local buffer, as factor of max_page_size (eg: 3 means 3*max_page_size slots)
   @param provider {function }  is a callback function that is used as source for a remote large buffer.
      * @param pointer {String} current global random pointer
      * @param limit {Number} max page size requested. may return less. use negative if in backward mode.
      * @param cb {Function} callback that is invoked when new data is ready. parameters: json object with: data: array of records. empty if no more. ini and end random pointers.
  * important: the data returned by the provider MUST NOT INCLUDE the pointer itself.
  */
 var DynamoInfiniteBuffer = function(global_size, max_page_size, provider){
   this.global_size = global_size;
   this.max_page_size = max_page_size;
   this.slots = new Array(this.max_page_size);
   //usually will be equals to slots.length (max_page_size) but sometimes it may be less (i.e, at the end of the global buffer)
   this.slots_length = 0;
   this.provider = provider;
   //position of the local buffer related to the global buffer

  this.reset();
 };




  /**
  * try to advance the local index.
  * return true if the data is available for retrieval with the val method.
  * return false means that it is waiting for retrieval of remote data from the provider.
  */
  DynamoInfiniteBuffer.prototype.next = function(){

    if(this.waiting_for_data) {
      return false;
    }

    if(this.slots_length > 0 && this.local_index < this.slots_length-1){
      this.local_index++;
      return true;
    }
    else{
      //this.page++;
      this._retrievePage(false);
      return false;
    }
  };


  /**
  * try to decrease the local index.
  * return true if the data is available for retrieval with the val method.
  * return false means that it is waiting for retrieval of remote data from the provider.
  */
  DynamoInfiniteBuffer.prototype.prev = function(){

    if(this.waiting_for_data) {
      return false;
    }

    if(this.local_index > 0){
      this.local_index--;
      return true;
    }
    else{
      this._retrievePage(true);
      return false;
    }
  };




  /**
  * returns the value to which is pointing local_index
  */
  DynamoInfiniteBuffer.prototype.val = function(){
    return this.slots[this.local_index];
  };


  /**
  * reset the buffer
  */
  DynamoInfiniteBuffer.prototype.reset = function(){
   this.pointer_ini = null;
   this.pointer_end = null;
   this.local_index = -1;
   this.waiting_for_data = false;

  };



  /**
  * if moveToEnd is true, local_index will be moved to the lenght of returned data.
  * else, it will be set to -1
  */
  DynamoInfiniteBuffer.prototype._retrievePage = function(moveToEnd){
    var i;
    this.waiting_for_data = true;

    var self = this;

    //it seems that dynamo does not return sorted pointers. so in rwd mode, first > last. so, just pick always the last pointer.
    //var pointer = moveToEnd?this.pointer_ini:this.pointer_end;
    var pointer = this.pointer_end;

    var size = moveToEnd?-this.max_page_size:this.max_page_size;

    this.provider(pointer, size, function(result){

      //console.log("DynamoInfinite Buffer._retrievePage: result: ", result);

      self.slots_length = Math.min(result.results.length, self.max_page_size);

      //as Dynamo returns rwd data inverted, we need to fill the array taking that into account..
      if(moveToEnd){
        //rwd mode... fill inverted
        for(i=0; i<self.slots_length; ++i){
          self.slots[self.slots_length-1-i] = result.results[i];
        }
      }else{
        //fwd mode... fill as usual
        for(i=0; i<self.slots_length; ++i){
          self.slots[i] = result.results[i];
        }
      }


      self.pointer_ini = result.first;
      self.pointer_end = result.last;

      self.waiting_for_data = false;
      if(moveToEnd){
        self.local_index = result.results.length;
      }else{
        self.local_index = -1;
      }

    });
  };


 Metacog.DynamoInfiniteBuffer = DynamoInfiniteBuffer;


})(Metacog);
(function(Metacog){
  'use strict';

  //---------- PRIVATE MODULE VARIABLES ----------------

  /*
  * the event currently pointed by the iterator
  * @type {object}
  */
  var _curr_event = null;


  Metacog.PlaybackController = {
    session: null,
    speed: 1.0
  };

  /**
  * status is one of: head, fwd, rwd, tail, paused_fwd, paused_rwd
  * @type {string}
  */
  Metacog.PlaybackController.status = "head";

  /*
  * array with the collection of events to be replayed
  * @type {number}
  */
  //var events = null;
  Metacog.PlaybackController.buffer = null;

  //configuration for the simulation
  Metacog.PlaybackController.simulation = null;



  //---------- PUBLIC METHODS -------------------------

  /**
   * MetaPlayback.Controller
   * @description
   * Initializes the Metacog playback controller instance
   * this component consumes the training API to retrieve events and push them through the Metacog Router.
   * @param router: a metacog.router instance
   * @throws router_must_be_instance_of_metarouter if router is not a valid instance
   */
  Metacog.PlaybackController.init = function(){
    //events = [];
    this.simulation = {
      lasttick:null,
      //absolute real time of simulation (not affected by speed)
      abselapsedtime: null,
      //adjusted elapsed time of the sim (affected by speed)
      elapsedtime: null,
      //percentage of progress of the simulation
      progress: null,
      //intervalid from setInterval
      interval: null
    };
  };


  /**
   * Reset the status of the controller
   */
  Metacog.PlaybackController.reset = function(){
    this.status = "head";
    //dont know if this must throw an error
    if(this.buffer)
      this.buffer.reset();
    _curr_event = null;
    clearInterval(this.simulation.interval);
  };


  /**
   * stop the playback
   */
  Metacog.PlaybackController.stop = function(){
    clearInterval(this.simulation.interval);
    this.status = "head";
  };

  /**
   * pause the playback
   * @return boolean flag indicating if the operation was allowed
   */
  Metacog.PlaybackController.pause = function(){
    if(this.status !== "fwd" && this.status !== "rwd"){
      return false;
    }

    clearInterval(this.simulation.interval);
    this.simulation.interval = null;

    if(this.status === "fwd"){
      this.status = "paused_fwd";
    }else if(this.status === "rwd"){
      this.status = "paused_rwd";
    }
    return true;
  };


      /*
     * 1. update elapsed time
     * 2. compute new simulation time
     * 3. find range of events between last and new simulation time
     * 4. send all those events to the router
     */
    Metacog.PlaybackController._tickfw = function(){

      //absolute, 1:1 elapsed time (millis), scaled
      var now = Date.now();
      var diff = now - this.simulation.lasttick;
      this.simulation.lasttick = now;
      var oldelapsedtime = this.simulation.elapsedtime;
      this.simulation.elapsedtime += diff*this.speed;
      this.simulation.abselapsedtime += diff;

      //normalized scaled elapsed time (0..1)
      var oldprogress = this.simulation.progress;
      this.simulation.progress = (this.simulation.elapsedtime) /  (this.session.maxtime - this.session.mintime);

      if(this.simulation.progress > 1.0){
        this.simulation.progress = 1.0;
        clearInterval(this.simulation.interval);
        this.simulation.interval = null;
        Metacog.PlaybackController.status = "tail";
      }

      /*
      * new way: we keep a _curr_event var that starts as null. we peek the next i_buffer element into that var.
      * we check if the nt of the var is in the past, or in the future. if in the past, consume it and pick the next
      * until you meet one in the future or the end of the global _buffer.
      */
      do{

        if(_curr_event){

          Metacog._emit("update_progress", this.simulation.progress, false);

          if(_curr_event.nt <= this.simulation.progress){
            //this event is in the past! consume it!

            Metacog.Router.sendEvent(_curr_event, null, true);
            _curr_event = null; //mark as consumed
          }else{
            //this event is in the future.. just exit and wait for the right moment
            return;
          }
        }

        //if here, it is time to pull the next event
        if(/*Metacog.PlaybackController.buffer.hasGlobalNext()*/ this.simulation.progress < 1.0){
          if(Metacog.PlaybackController.buffer.next()){
            _curr_event = Metacog.PlaybackController.buffer.val();
             Metacog.PlaybackController._normalize(_curr_event);
          }
          else{
            //we are waiting for data..
            this.simulation.lasttick = Date.now();
            this.simulation.progress = oldprogress;
            this.simulation.elapsedtime = oldelapsedtime;
            Metacog._emit("update_progress", this.simulation.progress, true);
          }
        }else{
          //we reach the end of the global _buffer!
          Metacog._emit("update_progress", this.simulation.progress, false);
          return;
        }
      }while(_curr_event != null);
    };



  /**
   * Put the controller in automatic forward play mode.
   * @param cbprogress(progress, waitingfordata) receives frequent updates from the simulation clock to update UI
   * @return boolean flag indicating if the operation was allowed
   */
  Metacog.PlaybackController.autoplayFwd = function(){

    if(this.status !== "head" && this.status !== "tail" && this.status !== "paused_fwd" && this.status !== "paused_rwd"){
      return false;
    }

    clearInterval(this.simulation.interval);

    if(this.status === "head" || this.status === "tail"){
      Metacog.PlaybackController.buffer.reset();
      this.simulation.elapsedtime = 0;
      this.simulation.abselapsedtime = 0;
      this.simulation.progress = 0;
    }
    else if(this.status === "paused_rwd"){
          this.simulation.progress = 1 - this.simulation.progress;
        this.simulation.elapsedtime = this.simulation.progress * (this.session.maxtime - this.session.mintime);
    }
    this.simulation.lasttick = Date.now();
    this.status = "fwd";

    var self = this;
    this.simulation.interval = setInterval(function(){
                self._tickfw();
                }, 100);

    return true;
  };



  /*
     * 1. update elapsed time
     * 2. compute new simulation time
     * 3. find range of events between last and new simulation time
     * 4. send all those events to the router
     */
     Metacog.PlaybackController._tickrw = function(){

      //absolute, 1:1 elapsed time (millis), scaled
      var diff = Date.now() - this.simulation.lasttick;
      var oldelapsedtime = this.simulation.elapsedtime;
      this.simulation.elapsedtime += diff;

      //normalized scaled elapsed time (0..1)
      var oldprogress = this.simulation.progress;
      this.simulation.progress = 1.0 - ((this.simulation.elapsedtime*this.speed) /  (Metacog.PlaybackController.session.maxtime - Metacog.PlaybackController.session.mintime));

      if(this.simulation.progress < 0.0){
        this.simulation.progress = 0.0;
      }

       do{

        if(_curr_event){

          Metacog._emit("update_progress", this.simulation.progress, false);

          if(_curr_event.nt >= this.simulation.progress){
            //this event is in the future! consume it!
             Metacog.Router.sendEvent(_curr_event, null, true);
            _curr_event = null; //mark as consumed
          }else{
            //this event is in the past.. just exit and wait for the right moment
            break;
          }
        }
      //if here, it is time to pull the prev event
      if(/*Metacog.PlaybackController.buffer.hasGlobalPrev()*/this.simulation.progress > 0){
        if(Metacog.PlaybackController.buffer.prev()){
          _curr_event = Metacog.PlaybackController.buffer.val();
           Metacog.PlaybackController._normalize(_curr_event);
        }else{
          //we are waiting for data..
          this.simulation.lasttick = Date.now();
          this.simulation.progress = oldprogress;
          this.simulation.elapsedtime = oldelapsedtime;
          Metacog._emit("update_progress", this.simulation.progress, true);
        }
      }else{
        //we reach the start of the global _buffer!
        Metacog._emit("update_progress", this.simulation.progress, false);
        break;
      }
      }while(_curr_event != null);

      if(this.simulation.progress <= 0.0){
        clearInterval( this.simulation.interval);
        this.simulation.interval = null;
        Metacog.PlaybackController.status = "head";
      }
    };


  /**
   * Put the controller in automatic rewind play mode.
   * @param cb receives the current event index
   */
  Metacog.PlaybackController.autoplayRwd = function(){
    if(this.status !== "tail" && this.status !== "paused_fwd" && this.status !== "paused_rwd"){
      return false;
    }

    clearInterval(this.simulation.interval);

    if( this.status === "tail"){
       this.simulation.elapsedtime = 0;
       this.simulation.progress = 1;
       this.buffer.reset();
    }
    else if( this.status === "paused_fwd"){
     this.simulation.progress = 1 - this.simulation.progress;
      this.simulation.elapsedtime = this.simulation.progress * (Metacog.PlaybackController.session.maxtime - Metacog.PlaybackController.session.mintime);
    }
    this.simulation.lasttick = Date.now();
    this.status = "rwd";
    var self = this;
    this.simulation.interval = setInterval(function(){self._tickrw();}, 100);
    return true;
  };

  /**
   * load the header of a training session. The most important retrieved fields are timeini and timeend,
   * that allow the controller to normalize events times and perform the playback keeping relative times.
   * @param session_id
   * @param cb
   */
  Metacog.PlaybackController.loadTrainingSession= function(session_id, cb, errcb){
    Metacog.Config.training.session_id = session_id;
    var self = this;
    Metacog.API.get_training_session(session_id,
       function(session_res){
           Metacog.PlaybackController.session = session_res;

           //prepare the infinite_buffer to receive paginated data..
           Metacog.PlaybackController.buffer = new Metacog.DynamoInfiniteBuffer(Metacog.PlaybackController.session.numevents, Metacog.Config.production.max_page_size,
             function(pointer, limit, _cb){
               //this is the provider callback to feed data into the infiniteBufer.
               Metacog.API.get_training_session_events(session_id, pointer, limit, _cb);
              });
           cb();
        },
       function(errcode){
         if(errcb){
           errcb(errcode, "error loading training session");
         }
         else{
          throw "error_loading_training_session";
         }
       });
  };


  /**
   * returns an absolute timestamp that correspond to the current progress of the simulation.
   */
  Metacog.PlaybackController.getAbsoluteProgress = function(){
    return  this.session.mintime +  this.simulation.progress*( this.session.maxtime -  this.session.mintime);
  };

  /**
   * return true if it is in fwd or rwd status (exclude paused status)
   */
  Metacog.PlaybackController.isPlaying = function(){
    return  Metacog.PlaybackController.isPlayingForward() ||  Metacog.PlaybackController.isPlayingBackward();
  };

  /**
   * returns true only if the mode is "fwd". excludes pause_fwd status.
   */
  Metacog.PlaybackController.isPlayingForward = function(){
    return  this.status === "fwd";
  };

  /**
   * returns true only if the mode is "rwd". excludes pause_rwd status.
   */
  Metacog.PlaybackController.isPlayingBackward = function(){
    return  this.status === "rwd";
  };


  /**
  * @private
  */
  Metacog.PlaybackController._normalize = function(event){
      event.nt =   (event.timestamp -  this.session.mintime) / ( this.session.maxtime -  this.session.mintime);
  };

})(Metacog);
(function(Metacog){
  'use strict';

  //---------------- PRIVATE MODULE ATTRIBUTES ---------------------


  //---------------- MODULE PUBLIC METHODS ---------------



  /**
  * @param name {string} name of the dimension
  * @param value {object} value of the dimension
  * @param indicators{array} array of indicators
  * @constructor
  */

  Metacog.Dimension= function(name, value, indicators){
    this.name = name;
    this.value = value;
    this.indicators = [];
    if(!indicators){
      console.log("Metacog.Dimension: indicators is empty");
    }else{
      var self = this;
      indicators.forEach(function(indicator){
        self.indicators.push({
          name: indicator,
          applied_indicators: []
        });
      });
    }

  };


  /**
  * retrieve and indicator by name
  * @param
  */
  Metacog.Dimension.prototype.get_indicator = function(name){
   for(var i=0; i<this.indicators.lenght; ++i){
      if(this.indicators[i].name === name){
        return this.indicators[i];
      }
    }
    return null;
  };

})(Metacog);

(function(Metacog){
  'use strict';

  //---------------- PRIVATE MODULE ATTRIBUTES ---------------------


  //---------------- MODULE PUBLIC METHODS ---------------

  /**
   * Factory for Metacog.Score class
   * @type {{object}}
   */
  Metacog.ScoreFactory = {};


  /**
   * @description factory method to create a new score.
   * @params {object} with the following attributes:
   * name {string} name of the new score
   * training_session_id {string} id of the training session to score
   * rubric {object} rubric (fully loaded) to use for scoring
   * @param cb callback that receives the new Metacog.Score object
   */
  Metacog.ScoreFactory.new = function(params, cb, errcb){
    var score = new Metacog.Score(params);
    //configure object
    score.resetDimensions();
    //send to server

    Metacog.API.post_score(score,
      function(score_res){
        score.id = score_res.id;
        cb(score);
      }, errcb);
  };

  /**
   *
   * @param id of a existing Score object
   * @param cb callback that receives the Metacog.Score object. signature: (err, score)
   * @param cb callback that receives the error. signature: (errcode, errormsg)
   */
  Metacog.ScoreFactory.get = function(training_session_id, score_id, cb, errcb){
    Metacog.API.get_score(training_session_id, score_id,
      function(score_res){
        var score = new Metacog.Score(score_res);
        cb(score);
      }, errcb);
  };


  //---------------- CONSTRUCTOR AND PUBLIC METHODS  ----------------------

  /**
   * @constructor Score
   * @description Business Object that represent the scoring of a training session and a rubric.
   * @params {object} json object to clone parameters from.
   * @class
   */
  Metacog.Score = function(params){

    this.id = params.id;
    this.name = params.name;
    this.training_session_id= params.training_session_id;
    this.value = params.value;
    this.rubric = params.rubric;
    this.rubric_id = params.rubric_id;
    if(params.dimensions){
      this.dimensions = params.dimensions;
    }
  };

  /**
   * given the rubric parameter, iterate over the collection of dimensions to create its own collection with default values
   * and empty indicators.
   */
  Metacog.Score.prototype.resetDimensions= function(){
    if(!this.rubric){
      throw "invalid_rubric";
    }
    this.dimensions = [];
    var self = this;
    this.rubric.dimensions.forEach(function(dimension){
      self.dimensions.push(new Metacog.Dimension(dimension.name, dimension.value, dimension.indicators));
    });
  };

  /**
   * return a dimension by name
   * @param name
   */
  Metacog.Score.prototype.getDimension = function(name){
    for( var i = 0; i< this.dimensions.length; ++i){
      var dim = this.dimensions[i];
      if(dim.name === name){
        return dim;
      }
    }
    return null;
  };


  /**
  * finds a indicator by its dimension and indicator name
  * @returns {object} indicator
  */
  Metacog.Score.prototype.getIndicator = function(dimensionname, indicatorname)
  {
    var dimension = this.getDimension(dimensionname);
    //find the indicator in ths array by name, then push the new element to applied_indicators
    var _indicator = null;
    dimension.indicators.forEach(function(indicator){
       if(indicator.name === indicatorname){
         _indicator =  indicator;
       }
    });
    return _indicator;
  };


  /**
  * find and delete an applied indicator by its uid
  */
  Metacog.Score.prototype.deleteAppliedIndicator = function(dimensionname, indicatorname, appliedindicatoruid){
    var indicator = this.getIndicator(dimensionname, indicatorname);
    for(var i=0; i<indicator.applied_indicators.length; ++i){
      if(indicator.applied_indicators[i].uid === appliedindicatoruid){
        indicator.applied_indicators.splice(i, 1);
        return;
      }
    }
  };


  /**
  * change the date ini and end of a given applied indicator
  */
  Metacog.Score.prototype.updateAppliedIndicator = function(dimensionname,indicatorname, appliedindicatoruid, applied_indicator){
    var indicator = this.getIndicator(dimensionname, indicatorname);
    for(var i=0; i<indicator.applied_indicators.length; ++i){
      if(indicator.applied_indicators[i].uid === appliedindicatoruid){
        indicator.applied_indicators[i].ini = applied_indicator.ini;
        indicator.applied_indicators[i].end = applied_indicator.end;
        return;
      }
    }
  };


  /**
   * set a value on a dimension but validating that the type and properties are conformant
   * @param dimensionid
   * @param value
   */
  Metacog.Score.prototype.setValue = function(dimensionid, value){
      console.log("Score.setValue NOT IMPLEMENTED ", dimensionid, value);
  };


  /**
   * link a existing rubric to a existing score requires may prevalidations:
   * 1. the score has not a rubric object, or the rubric object has the same id that the passing rubric.
   * 2. if the score has a rubric_id attribute, it must match the passing rubric.id
   * 3.
   * @param rubric
   */
  Metacog.Score.prototype.setRubric = function(rubric){
    if(!rubric){
      throw "invalid_rubric";
    }
    if(this.rubric){
      if(this.rubric.id !== rubric.id){
        throw 'assigning_invalid_rubric_to_score';
      }
    }else{
      if(this.rubric_id){
        if(this.rubric_id !== rubric.id){
          throw 'assigning_invalid_rubric_to_score';
        }
      }
    }
    this.rubric = rubric;
    //merge the dimensions! rubric has the authority
    //@todo: merge dimensions
  };

  /**
   * returns a JSON with the structure of the object, ready for POST and PUT to the server.
   * it preserves methods and attributes like "rubric" that are not sent to the server (we send rubric_id instead).
   */
  Metacog.Score.prototype.serialize = function(){

    var _json = {
      id : this.id,
      name : this.name,
      training_session_id: this.training_session_id,
      rubric_id : this.rubric.id,
      dimensions: this.dimensions
      };

    //only send value if not empty. prevents dynamodb from dying.
    if(this.value){
      _json.value = this.value;
    }

    return JSON.stringify(_json);
  };


  /**
   * PUT the score object to the server
   */
  Metacog.Score.prototype.save = function(cb, cberr){
    if(!cb) cb = function(){};
    Metacog.API.put_score(this, cb, cberr);
  };


})(Metacog);

(function(Metacog){
  'use strict';

  //---------------- PRIVATE MODULE ATTRIBUTES ---------------------

  //---------------- MODULE PUBLIC METHODS ---------------

  /**
   * Factory for Metacog.Score class
   * @class
   */
  Metacog.RubricFactory = {};


  /**
   *
   * @param id of a existing Rubric object
   * @param cb callback that receives the Metacog.Rubric object. signature: (err, rubric)
   * @param cb callback that receives the error. signature: (errcode, errormsg)
   * */
  Metacog.RubricFactory.get = function(id, cb, errcb){

    Metacog.API.get_rubric(id,
       function(rubric_res){
         var rubric = new Rubric(rubric_res);
         cb(rubric);
       }, errcb);
  };


  //---------------- CONSTRUCTOR AND PUBLIC METHODS  ----------------------

  /**
   * @constructor
   * @description constructor for the Rubric class
   * @class
   */
  var Rubric = function(jsonrubric){
    this.id = jsonrubric.id;
    this.name = jsonrubric.name;
    this.description = jsonrubric.description;
    this.dimensions = jsonrubric.dimensions;

  };

  /**
   * retrive a dimension by name
   * @param {string} name
   */
  Rubric.prototype.getDimension = function(name){
    for( var i = 0; i< this.dimensions.length; ++i){
      var dim = this.dimensions[i];
      if(dim.name === name){
        return dim;
      }
    }
    return null;
  };

})(Metacog);

(function(Metacog){
  'use strict';

  //---------------- PRIVATE MODULE ATTRIBUTES ---------------------

  var _rootdiv = null;

  var _selected_id = null;
  var _selected_name = null;

  var _selected_cb = null;

  var _endpoint = null;

  //---------------- CONSTRUCTOR AND PUBLIC METHODS  ----------------------

  /**
   * @constructor SearchModal
   * @description Modal for search training sessions
   * @class
   */
  Metacog.SearchModal = function(){
    this.init();
  };

  /**
   * initialize the Modal DOM internal vars and callbacks
   */
  Metacog.SearchModal.prototype.init = function(){
    _rootdiv = document.getElementById('trainingToolbarSearchModal');
    Metacog._showDiv(_rootdiv, false);

    var self = this;
    _rootdiv.getElementsByTagName("button")[0].onclick = function(){
      self.search();
    };

    _rootdiv.getElementsByTagName("button")[1].onclick = function(){
      self.select();
    };

    _rootdiv.getElementsByTagName("button")[2].onclick = function(){
      self.hide();
    };

  };

  /**
   * make visible the modal
   * @param   mode {string} one of 'training', 'scoring' or 'rubrics'
   * @param onSelectedCallback {function} params: id and name of the selected session.
   */
  Metacog.SearchModal.prototype.show = function(mode, onSelectedCallback){
    _selected_id = null;
    _selected_cb = onSelectedCallback;

    $(_rootdiv).find(".feedback")
    .html("Press search to retrieve results")
    .show();

    if(mode === "training"){
      _endpoint = '/training_sessions?name=';
      _rootdiv.getElementsByClassName("modal-title")[0].innerHTML = "Search Training Sessions";
    }else if(mode === "scoring"){
      _endpoint = '/training_sessions/'+Metacog.Config.training.session_id+'/scores?name=';
      _rootdiv.getElementsByClassName("modal-title")[0].innerHTML = "Search Scores";
    }else if(mode === "rubrics"){
      _endpoint = '/rubrics?name=';
      _rootdiv.getElementsByClassName("modal-title")[0].innerHTML = "Search Rubrics";
    }

    Metacog._cleanDiv(_rootdiv.getElementsByTagName("ul")[0]);

    Metacog._showDiv(_rootdiv, true);
  };

  /**
   * hide the modal
   */
  Metacog.SearchModal.prototype.hide = function(){
    Metacog._showDiv(_rootdiv, false);
  };

  /**
   * invoke the onSelected callback passing the id and name of the session
   * and hides itself.
   */
  Metacog.SearchModal.prototype.select = function(){
    if(!_selected_id){
      return;
    }
    this.hide();
    if(_selected_cb){
      _selected_cb(_selected_id, _selected_name);
    }
  };

  /**
   * trigger a search
   */
  Metacog.SearchModal.prototype.search = function(){
    var $rootdiv = $(_rootdiv);
    var filter = _rootdiv.getElementsByTagName("input")[0].value;
    $rootdiv.find(".feedback").html("searching..");
    $rootdiv.find("ul").hide();

    Metacog.API.get_search(_endpoint, filter,
      function(records){

        if(records.results.length > 0){
          $rootdiv.find(".feedback").hide();
          $rootdiv.find("ul").empty();
          $rootdiv.find("ul").show();
        }else{
          $rootdiv.find(".feedback")
            .html("Sorry, no results were found.")
            .show();
          $rootdiv.find("ul").hide();
        }

          var list = _rootdiv.getElementsByTagName("ul")[0];
          //Metacog._cleanDiv(list);

          var clickcb = function(ev){
            //remove all active styling
            $(this).closest("ul").find("li").removeClass("active");

            //mark the current element as active and copy its values
            this.className = "active";
            var el = Metacog._getDomEventSource(ev);
            _selected_id = el.id;
            _selected_name = el.innerHTML;
          };
          records.results.forEach(function(record){
            var item = document.createElement("li");
            item.id = record.id;
            item.innerHTML = record.name;
            item.onclick = clickcb;
            list.appendChild(item);
          });
      },
      function(err, msg){
        Metacog.TrainingToolbar.showError(err, msg);
      });
  };

})(Metacog);

(function(Metacog){
  'use strict';

  //---------------- PRIVATE MODULE ATTRIBUTES ---------------------


  //---------------- CONSTRUCTOR AND PUBLIC METHODS  ----------------------

  /**
   * @constructor SetValueModal
   * @description Modal for setting values
   * @param: xhr {object} xhr object
   * @param: type {string} "ordinal", "categorical", "numerical"
   * @class
   */
  Metacog.SetValueModal = function(type){
    this._rootdiv = null;
    this._type = type;
    this.init();
  };

  /**
   * initialize the Modal DOM internal vars and callbacks
   */
  Metacog.SetValueModal.prototype.init = function(){

    var rootid = null;
    if(this._type === "ordinal"){
      rootid = "scoringToolbarSetOrdinal";
    }else if(this._type === "categorical"){
      rootid = "scoringToolbarSetCategorical";
    }else if(this._type === "numerical"){
      rootid = "scoringToolbarSetNumerical";
    }else{
      throw 'unknown_value_type';
    }

    this._rootdiv = document.getElementById(rootid);
    Metacog._showDiv(this._rootdiv, false);

    var self = this;
    this._rootdiv.getElementsByTagName("button")[0].onclick = function(){
      self.save();
    };

    this._rootdiv.getElementsByTagName("button")[1].onclick = function(){
      self.hide();
    };


  };

  /**
   * make visible the modal
   * @param   mode {string} one of 'training', 'scoring' or 'rubrics'
   * @param onSelectedCallback {function} params: id and name of the selected session.
   */
  Metacog.SetValueModal.prototype.show = function(ScoreDimension, RubricDimension, onSaveCallback){
    this["_show_"+this._type](ScoreDimension, RubricDimension);
   this.onSaveCallback = onSaveCallback;
    Metacog._showDiv(this._rootdiv, true);
  };


  Metacog.SetValueModal.prototype._show_numerical = function(ScoreDimension, RubricDimension){
    var inputel = this._rootdiv.getElementsByTagName("input")[0];
    inputel.value = ScoreDimension.value;
    inputel.min = RubricDimension.params.min || 0;
    inputel.max = RubricDimension.params.max || 100;
    inputel.step = RubricDimension.params.step || 1;
    var outputel = this._rootdiv.getElementsByTagName("output")[0];
    outputel.value = ScoreDimension.value;
  };

  Metacog.SetValueModal.prototype._show_categorical = function(ScoreDimension, RubricDimension){
    var select = this._rootdiv.getElementsByTagName("select")[0];
    Metacog._cleanDiv(select);

    if(RubricDimension.params.items){
      RubricDimension.params.items.forEach(function(item){
        var _item = document.createElement("option");
        _item.innerHTML = item;
        if(item === ScoreDimension.value){
          _item.selected = true;
        }
        select.appendChild(_item);
      });
    }
  };

  Metacog.SetValueModal.prototype._show_ordinal = function(ScoreDimension, RubricDimension){
    var select = this._rootdiv.getElementsByTagName("select")[0];
    Metacog._cleanDiv(select);

    if(RubricDimension.params.items){
      RubricDimension.params.items.forEach(function(item){
        var _item = document.createElement("option");
        _item.innerHTML = item;
        if(item === ScoreDimension.value){
          _item.selected = true;
        }
        select.appendChild(_item);
      });
    }
  };


  /**
   * hide the modal
   */
  Metacog.SetValueModal.prototype.hide = function(){
    Metacog._showDiv(this._rootdiv, false);
  };

  /**
   * invoke the onSelected callback passing the id and name of the session
   * and hides itself.
   */
  Metacog.SetValueModal.prototype.save = function(){
    if(!this.onSaveCallback){
      return;
    }
    this.hide();
    if(this.onSaveCallback){
      var newvalue = null;
      if(this._type === "numerical"){
        newvalue = this._rootdiv.getElementsByTagName("input")[0].value;
      }else{
        var select = this._rootdiv.getElementsByTagName("select")[0];
        newvalue = select.options[select.selectedIndex].innerHTML;
      }
      this.onSaveCallback(newvalue);
    }
  };



})(Metacog);

(function(Metacog){
    'use strict';

    //---------------- PRIVATE MODULE ATTRIBUTES ---------------------


    //---------------- CONSTRUCTOR AND PUBLIC METHODS  ----------------------

    /**
     * @constructor DeleteIndicatorModal
     * @description Modal for setting values
     * @class
     */
    Metacog.DeleteIndicatorModal = function(){
        this._rootdiv = null;
        this.init();
    };

    /**
     * initialize the Modal DOM internal vars and callbacks
     */
    Metacog.DeleteIndicatorModal.prototype.init = function(){

        this._rootdiv = document.getElementById("scoringToolbarDeleteIndicator");
        Metacog._showDiv(this._rootdiv, false);

        var self = this;
        this._rootdiv.getElementsByTagName("button")[0].onclick = function(){
            self.delete();
        };

        this._rootdiv.getElementsByTagName("button")[1].onclick = function(){
            self.hide();
        };


    };

    /**
     * make visible the modal
     * @param   mode {string} one of 'training', 'scoring' or 'rubrics'
     * @param onSelectedCallback {function} params: id and name of the selected session.
     */
    Metacog.DeleteIndicatorModal.prototype.show = function(params, onDeleteCallback){
        //this._rootdiv.getElementsByTagName("input")[0].value = currvalue;
        this.onDeleteCallback = onDeleteCallback;

      console.log("DeleteIndicatorModal.show: params: ", params);
      //dimensionName, indicatorName, timestamp

        Metacog._showDiv(this._rootdiv, true);
    };

    /**
     * hide the modal
     */
    Metacog.DeleteIndicatorModal.prototype.hide = function(){
        Metacog._showDiv(this._rootdiv, false);
    };

    /**
     * invoke the onSelected callback passing the id and name of the session
     * and hides itself.
     */
    Metacog.DeleteIndicatorModal.prototype.delete = function(){
        if(!this.onDeleteCallback){
            return;
        }
        this.hide();
        if(this.onDeleteCallback){
          this.onDeleteCallback();
        }
    };



})(Metacog);

(function(Metacog){
  'use strict';

  //------- PRIVATE MODULE VARIABLES -----------------


  /**
   * select with dimensions: DOM element
   * @private
   */
  var _dimensionsel = null;

  /**
   * input text with default value for dimension:  DOM Element
   * @private
   */
  var _valueel = null;

  var _currRubricDimension = null;
  var _currScoreDimension = null;


  var _saveCategoricalModal = null;
  var _saveOrdinalModal = null;
  var _saveNumericalModal = null;

  var _playback = null;



  ///------ PUBLIC METHODS AND CLASSES -----------------

  /**
   * Scoring toolbar is a subcomponent of TrainingToolbar, managed by it.
   * param {object} div container DOM element
   * @constructor
   */
  Metacog.ScoringToolbar = function(domel, playbackController){
    _playback = playbackController;
    _dimensionsel = domel.getElementsByTagName("select")[0];
    _valueel = domel.getElementsByTagName("input")[0];
    var self = this;
    domel.getElementsByTagName("button")[0].onclick = function(){
      self._editCurrentValue();
    };

    /**
     * load the indicators availables for the current dimension and display its value
    */
    _dimensionsel.onchange = function(){
      var dimname = this.value;
      _currRubricDimension = Metacog.Config.rubric.getDimension(dimname);
      if(_currRubricDimension) {

        //the value is read from the score..
        _currScoreDimension = Metacog.Config.scoring.getDimension(dimname);
        _valueel.value = _currScoreDimension.value;

        //the listener of this cmd is the indicator's panel
        Metacog._emit("dimension_changed", dimname);

      }
    };

    _saveCategoricalModal = new Metacog.SetValueModal("categorical");
    _saveOrdinalModal = new Metacog.SetValueModal("ordinal");
    _saveNumericalModal = new Metacog.SetValueModal("numerical");

  };

  /**
   * clean and reinitialize scoring elements based in passed score
   */
  Metacog.ScoringToolbar.prototype.initUI = function(score){
    var item;
    Metacog.Config.scoring = score;
    Metacog._cleanDiv(_dimensionsel);
    _valueel.innerHTML = "";

    //empty default value
    item = document.createElement("option");
    item.selected = true;
    _dimensionsel.appendChild(item);

    score.dimensions.forEach(function(dimension){
      item = document.createElement("option");
      //item.id = dimension.id;
      //item.innerHTML = score.rubric.getDimension(dimension.id).name;
      item.innerHTML = dimension.name;
      _dimensionsel.appendChild(item);
    });

  };

  /**
   * open a editable popup according to the type of the value associated to the current dimension.
   * (type is known from the rubric, value is known from the score).
   * this action force a POST to the server to save the whole score object.
   * @private
   */
  Metacog.ScoringToolbar.prototype._editCurrentValue = function(){
    var type = _currRubricDimension.type.toLowerCase();
    var modal = null;
    if(type === "categorical"){
      modal = _saveCategoricalModal;
    }else if(type === "ordinal"){
      modal = _saveOrdinalModal;
    }else if(type === "numerical"){
      modal = _saveNumericalModal;
    }else{
      throw 'unexpected_dimension_type';
    }
    modal.show(_currScoreDimension, _currRubricDimension, function(newval){
      _currScoreDimension.value = newval;
      _valueel.value = newval;
      Metacog.Config.scoring.save();
    });

  };

})(Metacog);

(function(Metacog){
  'use strict';

  //-----------PRIVATE MODULE VARS --------------

  var CONTAINER_DIV = "trainingToolbarContainer";

  //div that holds the ui toolbar
  var _container_div = null;


  var _toolbarLogin= null;
  var _toolbarMainMenu= null;
  var _toolbarNewTrainingSession = null;
  var _toolbarSearchTrainingSession = null;
  var _toolbarContainerTraining= null;
  var _toolbarClose= null;
  var _toolbarPlayback= null;

  var toolbarScoring = null; //object
  var _toolbarScoring = null; //div
  var _scoring_enabled = false;

  var _toolbarSearchScoring = null;
  var _toolbarSearchRubric = null;

  var _alertPanel = null;

  var auth_token_input = null;
  var session_name_input = null;

  var close_button;
  var resume_button;
  var pause_button;
  var _recording = null;

  var _searchModal = null;
  var _deleteIndicatorModal = null;

  var _progressbar = null;
  var _waitingfordata = false;


  //---------------- CONSTRUCTOR AND PUBLIC METHODS  ----------------------

  Metacog.TrainingToolbar = {};

  /**
   * @constructor TrainingToolbar
   * @description Toolbar for interaction with playback and training API services
   * @param config: a Metacog.Config.Config instance
   * @param playbackController: a MetaPlayback.Controller instance
   * @throws router_must_be_instance_of_Metacog.Router if router is not a valid instance
   * @class
   */
  Metacog.TrainingToolbar.init = function(visible){

    if(Metacog.Config.mode === "production"){
      //we dont allow training toolbar while in production mode
      return;
    }

    Metacog.TrainingToolbar._init(visible);
    Metacog._register(Metacog.TrainingToolbar);
  };


  /**
   * Builds the training ui toolbar.
   * @memberOf TrainingToolbar
   */
  Metacog.TrainingToolbar._init = function(visible){

    Metacog.Config.training.recording = false;

    // avoid redundant call
    _container_div = document.getElementById(CONTAINER_DIV);
    if(_container_div)
      return true;

    // check if DOM is ready
    if(!document || !document.createElement || !document.body || !document.body.appendChild)
      return false;


    /*
     adding the toolbar css, either if it is the default value or it a value provided for the user.
     falsy values mean that the intention is to reuse the styles from the host.
     */
    Metacog.loadCSS(Metacog.Config.training.toolbar.css);

    var xhr = Metacog.newXhr();
    /*
     * loading the html template. it may be the default value or a value provided by the user.
     */
    xhr.open("GET", Metacog.Config.training.toolbar.template);
    xhr.setRequestHeader('Access-Control-Allow-Origin', '*');

    xhr.onreadystatechange = function(){

      //creates the root element that will hold the references to external resources
      _container_div = document.createElement("div");
      _container_div.id = "trainingContentWrapper";

      Metacog._showDiv(_container_div, false);

      if(xhr.readyState != 4 || xhr.status != 200) return;
      _container_div.innerHTML = xhr.responseText;

      document.body.appendChild(_container_div);

      //--- ALERT PANEL ----------
      _alertPanel = document.getElementById('toolbar-msg');

      var _closeMsg = document.getElementById('toolbar-msg-close');
      _closeMsg.onclick = function(){
        Metacog.TrainingToolbar.closeAlert();
      };

      //--- DIRECTION ARROWS ----------
      var _directions = document.getElementsByClassName('btn-location');

      var dirclickcb = function() {
        var _dir = this.getAttribute("dir");
        var _toolbar = document.getElementById('trainingToolbarInner');
        _toolbar.className = "_" + _dir;
      };

      for(var i = 0; i < _directions.length; i++) {
        var _direction = _directions[i];
        _direction.onclick = dirclickcb;
      }

      //-- a helper method to attach click callbacks to buttons given it index
      function onclickbutton(parent, index, cb){
        parent.getElementsByTagName("button")[index].onclick = cb;
      }

      //-- LOGIN TOOLBAR -------
      _toolbarLogin = document.getElementById('trainingToolbarContainerLogin');
      _toolbarLogin.setAttribute("style", "display:block");

      auth_token_input =  _toolbarLogin.getElementsByTagName("input")[0];
      onclickbutton(_toolbarLogin, 0, function() {
        Metacog.TrainingToolbar.authenticate();
      });

      //--- MENU TOOLBAR ----------
      _toolbarMainMenu = document.getElementById('trainingToolbarContainerMenu');

      //record new session button
      onclickbutton(_toolbarMainMenu, 0, function() {
        Metacog.TrainingToolbar.recordNewSession();
      });

      //enter playback menu button
      onclickbutton(_toolbarMainMenu, 1, function() {
        _scoring_enabled = false;
        //before display search training session, init the search with the latest recorded session, if any
        if(Metacog.Config.training.session_id){
          var selected_session_name = _toolbarSearchTrainingSession.getElementsByTagName("input")[0];
          selected_session_name.value = session_name_input.value;
        }
         _showDivAndHide(_toolbarSearchTrainingSession);
      });

      //scoring button
      onclickbutton(_toolbarMainMenu, 2, function() {
         _scoring_enabled = true;
        _showDivAndHide(_toolbarSearchTrainingSession);
      });

      //--- SAVE NEW SESSION TOOLBAR ----------

      _toolbarNewTrainingSession = document.getElementById('trainingToolbarNewTrainingSession');

      session_name_input = _toolbarNewTrainingSession.getElementsByTagName("input")[0];
      onclickbutton(_toolbarNewTrainingSession, 0, function() {
        Metacog.TrainingToolbar.createSession();
      });

      onclickbutton(_toolbarNewTrainingSession, 1, function() {
        Metacog.TrainingToolbar.showmenu();
      });

      //------ SEARCH TRAINING SESSION -----------------

      _toolbarSearchTrainingSession = document.getElementById('trainingToolbarSearchTrainingSession');

      //select button
      onclickbutton(_toolbarSearchTrainingSession, 0, function() {
        if(_scoring_enabled){
          //go to search scoring
          _showDivAndHide(_toolbarSearchScoring);
        }else{
          //just playback!
          Metacog.TrainingToolbar.onPlayBack();
        }
      });

      //search button
      onclickbutton(_toolbarSearchTrainingSession, 1, function() {
        _searchModal.show("training", function(selectedid, selectedname){
          Metacog.Config.training.session_id = selectedid;
          _toolbarSearchTrainingSession.getElementsByTagName("input")[0].value = selectedname;
        });
      });

      //home button
      onclickbutton(_toolbarSearchTrainingSession, 2, function() {
        Metacog.TrainingToolbar.showmenu();
      });


      //--- TRAINING TOOLBAR ----------
      _toolbarContainerTraining = document.getElementById('trainingToolbarContainerTraining');

      pause_button = _toolbarContainerTraining.getElementsByTagName("button")[0];
      resume_button = _toolbarContainerTraining.getElementsByTagName("button")[1];
      close_button = _toolbarContainerTraining.getElementsByTagName("button")[2];

      _recording = _toolbarContainerTraining.getElementsByClassName("recording")[0];

      pause_button.onclick = function() {
        onPause();
        Metacog.TrainingToolbar.record(false);
      };
      resume_button.onclick = function() {
        onResume();
        Metacog.TrainingToolbar.record(true);
      };
      close_button.onclick = function() {
        Metacog.TrainingToolbar.record(false);
        onClose();
      };

      //--- CLOSE TRAINING TOOLBAR ----------
      _toolbarClose = document.getElementById('trainingToolbarContainerClose');

      //close button
      onclickbutton(_toolbarClose, 0, function() {
        Metacog.TrainingToolbar.openDashboard();
      });

      //home button
      onclickbutton(_toolbarClose, 1, function() {
        Metacog.TrainingToolbar.showmenu();
      });


      //--- PLAYBACK TOOLBAR ----------
      _toolbarPlayback = document.getElementById('trainingToolbarContainerPlayback');

      //var _toolbarPlaybackBtnRWD = _toolbarPlayback.getElementsByClassName("btn-rwd")[0];
      var _toolbarPlaybackBtnFFW = _toolbarPlayback.getElementsByClassName("btn-fwd")[0];
      //var _toolbarPlaybackBtnStop = _toolbarPlayback.getElementsByClassName("btn-stop")[0];
      var _toolbarPlaybackBtnReset = _toolbarPlayback.getElementsByClassName("btn-reset")[0];
      var _toolbarPlaybackBtnMenu = _toolbarPlayback.getElementsByClassName("btn-menu")[0];

      _progressbar = _toolbarPlayback.getElementsByClassName("progress-bar")[0];


      _toolbarPlayback.getElementsByTagName("select")[0].onchange = function(ev){
        Metacog.TrainingToolbar.reset();
        Metacog.TrainingToolbar.setSpeed(parseFloat(this.value));
      };

      /*_toolbarPlaybackBtnRWD.onclick = function() {
        Metacog.TrainingToolbar.autoplayRwd();
      };*/

      _toolbarPlaybackBtnFFW.onclick = function() {

        if(Metacog.PlaybackController.status === "tail"){
          //this method will set the button in asyc mode
          Metacog.TrainingToolbar.reset(function(){
            Metacog.TrainingToolbar.autoplay(true);
          });
        }else{
          Metacog.TrainingToolbar.autoplay(!Metacog.PlaybackController.isPlaying());
        }

      };

      /*_toolbarPlaybackBtnStop.onclick = function(){
        Metacog.TrainingToolbar.stop();
      };*/

      _toolbarPlaybackBtnReset.onclick = function(){
        Metacog.TrainingToolbar.reset();
      };

      _toolbarPlaybackBtnMenu.onclick = function(){
        Metacog.TrainingToolbar.autoplay(false);
        Metacog.TrainingToolbar.showmenu();
      };

      //-------- SCORING (the scoring itself) -----------------
      _toolbarScoring = document.getElementById('trainingToolbarScoring');
      _scoring_enabled = false;
      toolbarScoring = new Metacog.ScoringToolbar(_toolbarScoring);

      //------ SEARCH SCORING --------------------------
      _toolbarSearchScoring = document.getElementById('trainingToolbarSearchScoring');

      //select scoring button
      onclickbutton(_toolbarSearchScoring, 0, function() {
        _onScoringExistingScore();
      });

      //search scoring button
      onclickbutton(_toolbarSearchScoring, 1, function() {
          _searchModal.show("scoring", function(selectedid, selectedname){
            Metacog.Config.scoring.id =selectedid;
          _toolbarSearchScoring.getElementsByTagName("input")[0].value =selectedname;
        });
      });

      //--------- SEARCH RUBRIC ---------------------

      _toolbarSearchRubric = document.getElementById('trainingToolbarSearchRubric');

      //select rubric button
      onclickbutton(_toolbarSearchRubric, 0, function() {
        Metacog.TrainingToolbar._onScoringNewScore();
      });

      //search rubric button
      onclickbutton(_toolbarSearchRubric, 1, function() {
        _searchModal.show("rubrics", function(selectedid, selectedname){
          Metacog.Config.rubric.id = selectedid;
          _toolbarSearchRubric.getElementsByTagName("input")[0].value = selectedname;
        });
      });

      //------------
      Metacog._showDiv(_container_div, visible);
      _searchModal = new Metacog.SearchModal(xhr);

      _deleteIndicatorModal = new Metacog.DeleteIndicatorModal(xhr);

    };
    // send the request
    xhr.send();

  };

  //-----------------------------------

  /**
   * Method to show/hide the training toolbar
   * @param flag
   * @memberOf TrainingToolbar
   */
  Metacog.TrainingToolbar.show = function(flag){
    Metacog._showDiv(_container_div, flag);
  };

  /**
   * hides the alert panel
   */
  Metacog.TrainingToolbar.closeAlert = function() {
    _alertPanel.setAttribute("style", "top:0; opacity: 0");
  };

  /**
   * shows the alert panel
   * @param errcode error code
   * @param response response message in json format
   */
  Metacog.TrainingToolbar.showError = function(errcode, response) {
    var message;
    try {
        response = JSON.parse(response);
        message = response.error;
    }catch(err){
      message = response;
    }
    _alertPanel.getElementsByClassName("toolbar-msg-content")[0].innerHTML = "<strong>error "+errcode+": </strong>"+message;
    _alertPanel.setAttribute("style", "top:none; opacity: 1");
  };



  Metacog.TrainingToolbar.showAlert = function(message) {
    _alertPanel.getElementsByClassName("toolbar-msg-content")[0].innerHTML = message;
    _alertPanel.setAttribute("style", "top:none; opacity: 1");
  };


  /*
   * display the playback div
   */
  Metacog.TrainingToolbar.onPlayBack = function(){


    if(!Metacog.Config.training.session_id){
      return;
    }

    Metacog.Config.training.recording = false;
    _progressbar.style.width = "0%";


    //lets alert the widget that we are going to enter playback mode!
    Metacog.Router.sendEvent({event:"metacog-setplaybackmode", data:{enabled:true}, type:Metacog.EVENT_TYPE.METACOG});

    _loadTrainingSession(function(){
      Metacog.PlaybackController.reset();
      Metacog.TrainingToolbar.set_play_btn_status("play");
      _showDivAndHide(_toolbarPlayback);
    });


  };


  /**
   * set the playback speed factor
   * @param speedfactor a float value
   */
  Metacog.TrainingToolbar.setSpeed = function(speedfactor){
    Metacog.PlaybackController.speed = speedfactor;
  };

  /**
   * reset the status of the simulation in the playback controller.
   * before reloading stuff, check in the scoringToolbar the existence
   * of new indicators in the indicators_buffer, in order to inject them
   * into the playbackController and sort them.
   *
   * mhhh.. we dont need to injectNewIndicators, nor the indicators_buffer, if we reload from server all the data.
   */
  Metacog.TrainingToolbar.reset = function(cbdone){

    //lets alert the widget that we are going to reset playback!
    Metacog.PlaybackController.reset();
    Metacog.Router.sendEvent({event:"metacog-playbackreset", data:{}, type:Metacog.EVENT_TYPE.METACOG});

    var self = this;

    function _onreset(){
      self.set_play_btn_status("play");
      _progressbar.classList.remove("active");
      _progressbar.style.width = "0%";
      Metacog.PlaybackController.reset();
      Metacog.Router.sendEvent({event:"metacog-playbackreset", data:{}, type:Metacog.EVENT_TYPE.METACOG});
      if(cbdone) cbdone();
  }

    if(_scoring_enabled){
      Metacog.ScoreFactory.get(Metacog.Config.training.session_id, Metacog.Config.scoring.id,
        function(score){
            score.setRubric(Metacog.Config.rubric);
              //we got the rubric! now get the training_session
              _loadTrainingSession(_onreset);
         },
        function(err, msg){
          Metacog.TrainingToolbar.showError(err, msg);
        }
      );

    }else{ //just playing back, not scoring mode
        _loadTrainingSession(_onreset);
    }

  };

  /*
   * unused.. probably must be marked as deprecated in the future. 2015/01
   */
  Metacog.TrainingToolbar.autoplayRwd = function(){
    var self = this;
    _waitingfordata = false;
    if(Metacog.PlaybackController.autoplayRwd()){
      _progressbar.classList.add("active");
      //lets alert the widget that we are going to change playback status!
      Metacog.Router.sendEvent({event:"metacog-playbackstatus", data:{status:'rwd'}, type:Metacog.EVENT_TYPE.METACOG});
    }
  };

  /**
  * status must be "play" or "pause"
  */
  Metacog.TrainingToolbar.set_play_btn_status = function(status){
    var _toolbarPlaybackBtnFFW = _toolbarPlayback.getElementsByClassName("btn-fwd")[0];
    var icon = _toolbarPlaybackBtnFFW.getElementsByTagName("span")[0];
    if(status === "pause"){
        _toolbarPlaybackBtnFFW.title ="pause";
        icon.className = "icon-pause2";
    }else{
        _toolbarPlaybackBtnFFW.title ="play";
        icon.className = "icon-play2";
    }
  };


  /*
  * toggle the playbackstatus between playFwd and stop, based on the boolean value of play
   */
  Metacog.TrainingToolbar.autoplay = function(play){
    var self = this;

    if(play){

      _waitingfordata = false;

      if(Metacog.PlaybackController.autoplayFwd()){

        this.set_play_btn_status("pause");

        _progressbar.classList.add("active");
        //lets alert the widget that we are going to change playback status!
        Metacog.Router.sendEvent({event:"metacog-playbackstatus", data:{status:'fwd'}, type:Metacog.EVENT_TYPE.METACOG});
      }
    }else{
      if(Metacog.PlaybackController.pause()){

        this.set_play_btn_status("play");

        _progressbar.classList.remove("active");
      //lets alert the widget that we are going to change playback status!
      Metacog.Router.sendEvent({event:"metacog-playbackstatus", data:{status:'paused'}, type:Metacog.EVENT_TYPE.METACOG});
      }
    }

  };



  /**
   * authenticate the toolbar using a token.
   * @param token
   */
  Metacog.TrainingToolbar.authenticate = function(){
    Metacog.Config.training.recording = false;
    var token = auth_token_input.value;
    var self = this;
    Metacog.API.auth(token,
      function(){
          Metacog.Config.training.auth_token  = token;
          self.showmenu();
      },
      function(errcode, response){
        Metacog.TrainingToolbar.showError(errcode, response);
      });
  };

  /**
   * Open a new browser window pointing to the Metacog Widget Dashboard
   */
  Metacog.TrainingToolbar.openDashboard = function(){
    window.open(Metacog.Config.TRAINING_ENDPOINT + "/#/auth/"+Metacog.Config.training.auth_token);
  };


  Metacog.TrainingToolbar.record = function(flag){
    Metacog.Config.training.recording = flag;
    _recording.style.display = flag?"inline":"none";

  };

  /*
   *
   */
  Metacog.TrainingToolbar.showmenu = function(){
    _scoring_enabled = false;
    Metacog.TrainingToolbar.record(false);
    _showDivAndHide(_toolbarMainMenu);
    //lets alert the widget that we are not in playback mode!
    Metacog.Router.sendEvent({event:"metacog-setplaybackmode", data:{enabled:false}, type:Metacog.EVENT_TYPE.METACOG});

  };

  /*
   *
   */
  Metacog.TrainingToolbar.recordNewSession = function(){
    Metacog.TrainingToolbar.record(false);
    Metacog.Router.resetEventCounter();
    session_name_input.value = "";
    _showDivAndHide(_toolbarNewTrainingSession, true);
  };

  /*
   *
   * create a new training session in the server to hold all the recorded events
   * send a POST call to the server, it must return the id of the new session.
   * @param title
   */
  Metacog.TrainingToolbar.createSession = function(){
    Metacog.API.post_training_sessions({
      name: session_name_input.value,
      publisher_id: Metacog.Config.session.publisher_id,
      application_id: Metacog.Config.session.application_id
    },
    function(session_resp){
      Metacog.Config.training.session_id = session_resp.id;
      Metacog.Config.training.recording = true;
      Metacog.Router.resetEventCounter();

      //launch a metacog event to notify the widget that we are starting recording
      Metacog.Router.sendEvent({event:"metacog-recordingstatus", data:{status:"recording"}, type:Metacog.EVENT_TYPE.METACOG});

      // make sure the training times are reset
      Metacog.Config.training.timestamps = {start: null, end: 0};
      Metacog._showDiv(pause_button, true);
      Metacog._showDiv(resume_button, false);
      _recording.style.display = "inline";
      _showDivAndHide(_toolbarContainerTraining);
    },
    function(errcode, response){
          Metacog.TrainingToolbar.showError(errcode, response);
    });
  };


  /**
   * at this point, we have in Metacog.Config.scoring = {id: null, name: "something"}
   * and in Metacog.Config.rubric a rubric object without collections.
   * so, we must:
   * 1. retrieve the rubric from the server, with all its collections.
   * 2. create a new score object using the rubric as template.
   * 3. save the score object to the server to obtain its id.
   * 4. load the training session data and init the playback controller.
   * 5. merge the applied indicators from the scoring object with the events??
   * 5. open the scoring toolbar
   * @private
   * */
  Metacog.TrainingToolbar._onScoringNewScore = function(){

    if(!Metacog.Config.rubric.id)
      return;
    var self = this;
    Metacog.RubricFactory.get(Metacog.Config.rubric.id,
      function(rubric){
        //we got the rubric! now get the score
        Metacog.Config.rubric = rubric;
        var params = {
          name: Metacog.Config.scoring.name,
          training_session_id: Metacog.Config.training.session_id,
          value:"",
          rubric: rubric
        };
        Metacog.ScoreFactory.new(
          params,
          function(score){
            //we got the score! now get the training_session
            _loadTrainingSession(function(){

             toolbarScoring.initUI(score);
              _showDivAndHide(_toolbarScoring);
            });

          },
          function(err, msg){
            Metacog.TrainingToolbar.showError(err, msg);
          }
        );

      },
      function(err, msg){
        Metacog.TrainingToolbar.showError(err, msg);
      }
    );
  };



    /**
     * display the modal to confirm the deletion of an applied indicator
     * @param params {object params for command "confirmIndicatorDeletion"  {indicator: indicatorName, dimension:dimensionName, timestamp: timestamp}
     */
  Metacog.TrainingToolbar.on_cmd_confirmIndicatorDeletion = function(params){
    _deleteIndicatorModal.show(params, function(){

      //here, execute the deletion
      //send a command to force deletion in the log tab
      if(Metacog.Config.scoring.deleteIndicator(params)){
        Metacog.Config.scoring.save(function(){
          Metacog._emit("indicatorDeleted", params);
          Metacog.TrainingToolbar.showAlert("Indicator deleted. Remember to reset playback");
        });

      }else{
       Metacog.TrainingToolbar.showAlert("deletion of indicator failed");
      }

    });
  };


  /*
   *
   */
  function onResume(){
    Metacog.Config.training.recording = true;

    //launch a metacog event to notify the widget that we are resuming recording
    Metacog.Router.sendEvent({event:"metacog-recordingstatus", data:{status:"resuming"}, type:Metacog.EVENT_TYPE.METACOG});

    Metacog._showDiv(pause_button, true);
    Metacog._showDiv(resume_button, false);
  }

  /*
   *
   */
  function onPause(){
    Metacog.Config.training.recording = false;

    //launch a metacog event to notify the widget that we are resuming recording
    Metacog.Router.sendEvent({event:"metacog-recordingstatus", data:{status:"paused"}, type:Metacog.EVENT_TYPE.METACOG});

    Metacog._showDiv(pause_button, false);
    Metacog._showDiv(resume_button, true);
  }

  /*
   *
   */
  function onClose(){
    //this will prevent the TrainingEndpoint from accepting new events..
    Metacog.Config.training.recording = false;

    //launch a metacog event to notify the widget that we are finishing recording
    Metacog.Router.sendEvent({event:"metacog-recordingstatus", data:{status:"finished"}, type:Metacog.EVENT_TYPE.METACOG});


    /*
    the call to API.post_training_session_close must happen only when we are sure that the queue is empty.
    as it is an async process, we will poll the "activity" variable of the logger. if it is zero, we can close in a safe way.

    */

    function poll_activity(){
      if(Metacog.Logger.activity > 0){
        setTimeout( poll_activity, Metacog.Config.production.queue_tick_time*2.5);
      }
      else{

        var data = {
          numevents: Metacog.Router.event_counter(),
          start: Metacog.Config.training.timestamps.start,
          end: Metacog.Config.training.timestamps.end
        };

        Metacog.API.post_training_sessions_close(
          Metacog.Config.training.session_id,
          data,
          function(){
            //instead of showing the menu with the "open editor" button we go back to record/playback menu
            _showDivAndHide(_toolbarMainMenu);
            //_showDivAndHide(_toolbarClose);
            Metacog._showDiv(pause_button, false);
            Metacog._showDiv(resume_button, false);
          },
          function(err, msg){
            Metacog.TrainingToolbar.showError(err, msg);
          }
        );

      }
    }

    setTimeout(poll_activity, Metacog.Config.production.queue_tick_time*2.5);


  }

 /*
 *
 */
  function _showDivAndHide(div){
    _alertPanel.setAttribute("style", "top:0; opacity: 0");
    Metacog._showDiv(_toolbarLogin, div === _toolbarLogin);
    Metacog._showDiv(_toolbarMainMenu, div === _toolbarMainMenu);
    Metacog._showDiv(_toolbarNewTrainingSession, div === _toolbarNewTrainingSession);
    Metacog._showDiv(_toolbarSearchTrainingSession, div === _toolbarSearchTrainingSession);
    Metacog._showDiv(_toolbarContainerTraining, div === _toolbarContainerTraining);
    Metacog._showDiv(_toolbarClose, div === _toolbarClose);

    //prevent playback be hidden if scoring is enabled, because he contains all the scoring divs
    Metacog._showDiv(_toolbarPlayback, div === _toolbarPlayback || (_scoring_enabled && div === _toolbarScoring));

    Metacog._showDiv(_toolbarScoring, div === _toolbarScoring);

    Metacog._showDiv(_toolbarSearchScoring, div === _toolbarSearchScoring);
    Metacog._showDiv(_toolbarSearchRubric, div === _toolbarSearchRubric);

  }


  /**
     * update the progress bar, both the var itself and the label
     * @param progress {number} floating point between 0 and 1
     * also check for changes in waitingfordata value, to ensure that pause messages are sent to widget
     * @private
     */
  Metacog.TrainingToolbar.on_cmd_update_progress = function(progress, waitingfordata){
      var progressStr = Math.ceil((progress * 100)) + "%";
      _progressbar.style.width = progressStr;
      _progressbar.getElementsByTagName("span")[0].innerHTML = progressStr;

    if(_waitingfordata != waitingfordata){
      var status = waitingfordata?"paused":Metacog.PlaybackController.status;
      Metacog.Router.sendEvent({event:"metacog-playbackstatus", data:{status:status}, type:Metacog.EVENT_TYPE.METACOG});
    }
    _waitingfordata = waitingfordata;


    if(Metacog.PlaybackController.status === "tail"){
       Metacog.TrainingToolbar.set_play_btn_status("play");
    }

  };




  /**
   * load the training session data based on Metacog.Config.training.session_id.
   * invoke the callback on success.
   * @param cb
   * @private
   */
  function _loadTrainingSession(cb){
    //first, load the header..
    Metacog.PlaybackController.loadTrainingSession(Metacog.Config.training.session_id, cb, Metacog.TrainingToolbar.showError);
  }

  /*
   * we are just after selecting an existing score.
   * so, the steps are:
   * 1. retrieve the score object from the server
    * 2. retrieve the rubric object from the server, based on the retrieved score.rubric_id
    * 3. retrieve the training session
    * 4. inject indicators into training session events
   */
  function _onScoringExistingScore(){
    //check if it is a existing or new scoring.
    if(!Metacog.Config.scoring.id){
      // if new, go to select rubrics.
      Metacog.Config.scoring.name = _toolbarSearchScoring.getElementsByTagName("input")[0].value;
      _showDivAndHide(_toolbarSearchRubric);
    }else{
      // if existing, go to scoring toolbar, but first retrieve the scoring object from the server, and using it, retrieve the rubric..
      Metacog.ScoreFactory.get(Metacog.Config.training.session_id, Metacog.Config.scoring.id,
        function(score){
            //we got the scoring! now get the rubric..
          Metacog.RubricFactory.get(score.rubric_id,
            function(rubric){
              Metacog.Config.rubric = rubric;
              score.setRubric(rubric);
              //we got the rubric! now get the training_session
              _loadTrainingSession(function(){
                //for existing scores, inject the applied indicators into the playbackController.
                //score.injectIndicators();
                //Metacog.PlaybackController.sort();
                toolbarScoring.initUI(score);
                _showDivAndHide(_toolbarScoring);
              });
            },
            function(err, msg){
              Metacog.TrainingToolbar.showError(err, msg);
            }
          );
        },
        function(err, msg){
          Metacog.TrainingToolbar.showError(err, msg);
        }
      );
    }
  }


})(Metacog);
