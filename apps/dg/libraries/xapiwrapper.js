/*! xAPIWrapper v 1.1.2 | Built on 2015-02-09 10:38:34-0500 */
/*
CryptoJS v3.1.2
code.google.com/p/crypto-js
(c) 2009-2013 by Jeff Mott. All rights reserved.
code.google.com/p/crypto-js/wiki/License
*/
/**
 * CryptoJS core components.
 */
var CryptoJS = CryptoJS || (function (Math, undefined) {
    /**
     * CryptoJS namespace.
     */
    var C = {};

    /**
     * Library namespace.
     */
    var C_lib = C.lib = {};

    /**
     * Base object for prototypal inheritance.
     */
    var Base = C_lib.Base = (function () {
        function F() {}

        return {
            /**
             * Creates a new object that inherits from this object.
             *
             * @param {Object} overrides Properties to copy into the new object.
             *
             * @return {Object} The new object.
             *
             * @static
             *
             * @example
             *
             *     var MyType = CryptoJS.lib.Base.extend({
             *         field: 'value',
             *
             *         method: function () {
             *         }
             *     });
             */
            extend: function (overrides) {
                // Spawn
                F.prototype = this;
                var subtype = new F();

                // Augment
                if (overrides) {
                    subtype.mixIn(overrides);
                }

                // Create default initializer
                if (!subtype.hasOwnProperty('init')) {
                    subtype.init = function () {
                        subtype.$super.init.apply(this, arguments);
                    };
                }

                // Initializer's prototype is the subtype object
                subtype.init.prototype = subtype;

                // Reference supertype
                subtype.$super = this;

                return subtype;
            },

            /**
             * Extends this object and runs the init method.
             * Arguments to create() will be passed to init().
             *
             * @return {Object} The new object.
             *
             * @static
             *
             * @example
             *
             *     var instance = MyType.create();
             */
            create: function () {
                var instance = this.extend();
                instance.init.apply(instance, arguments);

                return instance;
            },

            /**
             * Initializes a newly created object.
             * Override this method to add some logic when your objects are created.
             *
             * @example
             *
             *     var MyType = CryptoJS.lib.Base.extend({
             *         init: function () {
             *             // ...
             *         }
             *     });
             */
            init: function () {
            },

            /**
             * Copies properties into this object.
             *
             * @param {Object} properties The properties to mix in.
             *
             * @example
             *
             *     MyType.mixIn({
             *         field: 'value'
             *     });
             */
            mixIn: function (properties) {
                for (var propertyName in properties) {
                    if (properties.hasOwnProperty(propertyName)) {
                        this[propertyName] = properties[propertyName];
                    }
                }

                // IE won't copy toString using the loop above
                if (properties.hasOwnProperty('toString')) {
                    this.toString = properties.toString;
                }
            },

            /**
             * Creates a copy of this object.
             *
             * @return {Object} The clone.
             *
             * @example
             *
             *     var clone = instance.clone();
             */
            clone: function () {
                return this.init.prototype.extend(this);
            }
        };
    }());

    /**
     * An array of 32-bit words.
     *
     * @property {Array} words The array of 32-bit words.
     * @property {number} sigBytes The number of significant bytes in this word array.
     */
    var WordArray = C_lib.WordArray = Base.extend({
        /**
         * Initializes a newly created word array.
         *
         * @param {Array} words (Optional) An array of 32-bit words.
         * @param {number} sigBytes (Optional) The number of significant bytes in the words.
         *
         * @example
         *
         *     var wordArray = CryptoJS.lib.WordArray.create();
         *     var wordArray = CryptoJS.lib.WordArray.create([0x00010203, 0x04050607]);
         *     var wordArray = CryptoJS.lib.WordArray.create([0x00010203, 0x04050607], 6);
         */
        init: function (words, sigBytes) {
            words = this.words = words || [];

            if (sigBytes != undefined) {
                this.sigBytes = sigBytes;
            } else {
                this.sigBytes = words.length * 4;
            }
        },

        /**
         * Converts this word array to a string.
         *
         * @param {Encoder} encoder (Optional) The encoding strategy to use. Default: CryptoJS.enc.Hex
         *
         * @return {string} The stringified word array.
         *
         * @example
         *
         *     var string = wordArray + '';
         *     var string = wordArray.toString();
         *     var string = wordArray.toString(CryptoJS.enc.Utf8);
         */
        toString: function (encoder) {
            return (encoder || Hex).stringify(this);
        },

        /**
         * Concatenates a word array to this word array.
         *
         * @param {WordArray} wordArray The word array to append.
         *
         * @return {WordArray} This word array.
         *
         * @example
         *
         *     wordArray1.concat(wordArray2);
         */
        concat: function (wordArray) {
            // Shortcuts
            var thisWords = this.words;
            var thatWords = wordArray.words;
            var thisSigBytes = this.sigBytes;
            var thatSigBytes = wordArray.sigBytes;

            // Clamp excess bits
            this.clamp();

            // Concat
            if (thisSigBytes % 4) {
                // Copy one byte at a time
                for (var i = 0; i < thatSigBytes; i++) {
                    var thatByte = (thatWords[i >>> 2] >>> (24 - (i % 4) * 8)) & 0xff;
                    thisWords[(thisSigBytes + i) >>> 2] |= thatByte << (24 - ((thisSigBytes + i) % 4) * 8);
                }
            } else if (thatWords.length > 0xffff) {
                // Copy one word at a time
                for (var i = 0; i < thatSigBytes; i += 4) {
                    thisWords[(thisSigBytes + i) >>> 2] = thatWords[i >>> 2];
                }
            } else {
                // Copy all words at once
                thisWords.push.apply(thisWords, thatWords);
            }
            this.sigBytes += thatSigBytes;

            // Chainable
            return this;
        },

        /**
         * Removes insignificant bits.
         *
         * @example
         *
         *     wordArray.clamp();
         */
        clamp: function () {
            // Shortcuts
            var words = this.words;
            var sigBytes = this.sigBytes;

            // Clamp
            words[sigBytes >>> 2] &= 0xffffffff << (32 - (sigBytes % 4) * 8);
            words.length = Math.ceil(sigBytes / 4);
        },

        /**
         * Creates a copy of this word array.
         *
         * @return {WordArray} The clone.
         *
         * @example
         *
         *     var clone = wordArray.clone();
         */
        clone: function () {
            var clone = Base.clone.call(this);
            clone.words = this.words.slice(0);

            return clone;
        },

        /**
         * Creates a word array filled with random bytes.
         *
         * @param {number} nBytes The number of random bytes to generate.
         *
         * @return {WordArray} The random word array.
         *
         * @static
         *
         * @example
         *
         *     var wordArray = CryptoJS.lib.WordArray.random(16);
         */
        random: function (nBytes) {
            var words = [];
            for (var i = 0; i < nBytes; i += 4) {
                words.push((Math.random() * 0x100000000) | 0);
            }

            return new WordArray.init(words, nBytes);
        }
    });

    /**
     * Encoder namespace.
     */
    var C_enc = C.enc = {};

    /**
     * Hex encoding strategy.
     */
    var Hex = C_enc.Hex = {
        /**
         * Converts a word array to a hex string.
         *
         * @param {WordArray} wordArray The word array.
         *
         * @return {string} The hex string.
         *
         * @static
         *
         * @example
         *
         *     var hexString = CryptoJS.enc.Hex.stringify(wordArray);
         */
        stringify: function (wordArray) {
            // Shortcuts
            var words = wordArray.words;
            var sigBytes = wordArray.sigBytes;

            // Convert
            var hexChars = [];
            for (var i = 0; i < sigBytes; i++) {
                var bite = (words[i >>> 2] >>> (24 - (i % 4) * 8)) & 0xff;
                hexChars.push((bite >>> 4).toString(16));
                hexChars.push((bite & 0x0f).toString(16));
            }

            return hexChars.join('');
        },

        /**
         * Converts a hex string to a word array.
         *
         * @param {string} hexStr The hex string.
         *
         * @return {WordArray} The word array.
         *
         * @static
         *
         * @example
         *
         *     var wordArray = CryptoJS.enc.Hex.parse(hexString);
         */
        parse: function (hexStr) {
            // Shortcut
            var hexStrLength = hexStr.length;

            // Convert
            var words = [];
            for (var i = 0; i < hexStrLength; i += 2) {
                words[i >>> 3] |= parseInt(hexStr.substr(i, 2), 16) << (24 - (i % 8) * 4);
            }

            return new WordArray.init(words, hexStrLength / 2);
        }
    };

    /**
     * Latin1 encoding strategy.
     */
    var Latin1 = C_enc.Latin1 = {
        /**
         * Converts a word array to a Latin1 string.
         *
         * @param {WordArray} wordArray The word array.
         *
         * @return {string} The Latin1 string.
         *
         * @static
         *
         * @example
         *
         *     var latin1String = CryptoJS.enc.Latin1.stringify(wordArray);
         */
        stringify: function (wordArray) {
            // Shortcuts
            var words = wordArray.words;
            var sigBytes = wordArray.sigBytes;

            // Convert
            var latin1Chars = [];
            for (var i = 0; i < sigBytes; i++) {
                var bite = (words[i >>> 2] >>> (24 - (i % 4) * 8)) & 0xff;
                latin1Chars.push(String.fromCharCode(bite));
            }

            return latin1Chars.join('');
        },

        /**
         * Converts a Latin1 string to a word array.
         *
         * @param {string} latin1Str The Latin1 string.
         *
         * @return {WordArray} The word array.
         *
         * @static
         *
         * @example
         *
         *     var wordArray = CryptoJS.enc.Latin1.parse(latin1String);
         */
        parse: function (latin1Str) {
            // Shortcut
            var latin1StrLength = latin1Str.length;

            // Convert
            var words = [];
            for (var i = 0; i < latin1StrLength; i++) {
                words[i >>> 2] |= (latin1Str.charCodeAt(i) & 0xff) << (24 - (i % 4) * 8);
            }

            return new WordArray.init(words, latin1StrLength);
        }
    };

    /**
     * UTF-8 encoding strategy.
     */
    var Utf8 = C_enc.Utf8 = {
        /**
         * Converts a word array to a UTF-8 string.
         *
         * @param {WordArray} wordArray The word array.
         *
         * @return {string} The UTF-8 string.
         *
         * @static
         *
         * @example
         *
         *     var utf8String = CryptoJS.enc.Utf8.stringify(wordArray);
         */
        stringify: function (wordArray) {
            try {
                return decodeURIComponent(escape(Latin1.stringify(wordArray)));
            } catch (e) {
                throw new Error('Malformed UTF-8 data');
            }
        },

        /**
         * Converts a UTF-8 string to a word array.
         *
         * @param {string} utf8Str The UTF-8 string.
         *
         * @return {WordArray} The word array.
         *
         * @static
         *
         * @example
         *
         *     var wordArray = CryptoJS.enc.Utf8.parse(utf8String);
         */
        parse: function (utf8Str) {
            return Latin1.parse(unescape(encodeURIComponent(utf8Str)));
        }
    };
    /**
     * Base64 encoding strategy.
     */
    var Base64 = C_enc.Base64 = {
        /**
         * Converts a word array to a Base64 string.
         *
         * @param {WordArray} wordArray The word array.
         *
         * @return {string} The Base64 string.
         *
         * @static
         *
         * @example
         *
         *     var base64String = CryptoJS.enc.Base64.stringify(wordArray);
         */
        stringify: function (wordArray) {
            // Shortcuts
            var words = wordArray.words;
            var sigBytes = wordArray.sigBytes;
            var map = this._map;

            // Clamp excess bits
            wordArray.clamp();

            // Convert
            var base64Chars = [];
            for (var i = 0; i < sigBytes; i += 3) {
                var byte1 = (words[i >>> 2]       >>> (24 - (i % 4) * 8))       & 0xff;
                var byte2 = (words[(i + 1) >>> 2] >>> (24 - ((i + 1) % 4) * 8)) & 0xff;
                var byte3 = (words[(i + 2) >>> 2] >>> (24 - ((i + 2) % 4) * 8)) & 0xff;

                var triplet = (byte1 << 16) | (byte2 << 8) | byte3;

                for (var j = 0; (j < 4) && (i + j * 0.75 < sigBytes); j++) {
                    base64Chars.push(map.charAt((triplet >>> (6 * (3 - j))) & 0x3f));
                }
            }

            // Add padding
            var paddingChar = map.charAt(64);
            if (paddingChar) {
                while (base64Chars.length % 4) {
                    base64Chars.push(paddingChar);
                }
            }

            return base64Chars.join('');
        },

        /**
         * Converts a Base64 string to a word array.
         *
         * @param {string} base64Str The Base64 string.
         *
         * @return {WordArray} The word array.
         *
         * @static
         *
         * @example
         *
         *     var wordArray = CryptoJS.enc.Base64.parse(base64String);
         */
        parse: function (base64Str) {
            // Shortcuts
            var base64StrLength = base64Str.length;
            var map = this._map;

            // Ignore padding
            var paddingChar = map.charAt(64);
            if (paddingChar) {
                var paddingIndex = base64Str.indexOf(paddingChar);
                if (paddingIndex != -1) {
                    base64StrLength = paddingIndex;
                }
            }

            // Convert
            var words = [];
            var nBytes = 0;
            for (var i = 0; i < base64StrLength; i++) {
                if (i % 4) {
                    var bits1 = map.indexOf(base64Str.charAt(i - 1)) << ((i % 4) * 2);
                    var bits2 = map.indexOf(base64Str.charAt(i)) >>> (6 - (i % 4) * 2);
                    words[nBytes >>> 2] |= (bits1 | bits2) << (24 - (nBytes % 4) * 8);
                    nBytes++;
                }
            }

            return WordArray.create(words, nBytes);
        },

        _map: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/='
    };

    /**
     * Abstract buffered block algorithm template.
     *
     * The property blockSize must be implemented in a concrete subtype.
     *
     * @property {number} _minBufferSize The number of blocks that should be kept unprocessed in the buffer. Default: 0
     */
    var BufferedBlockAlgorithm = C_lib.BufferedBlockAlgorithm = Base.extend({
        /**
         * Resets this block algorithm's data buffer to its initial state.
         *
         * @example
         *
         *     bufferedBlockAlgorithm.reset();
         */
        reset: function () {
            // Initial values
            this._data = new WordArray.init();
            this._nDataBytes = 0;
        },

        /**
         * Adds new data to this block algorithm's buffer.
         *
         * @param {WordArray|string} data The data to append. Strings are converted to a WordArray using UTF-8.
         *
         * @example
         *
         *     bufferedBlockAlgorithm._append('data');
         *     bufferedBlockAlgorithm._append(wordArray);
         */
        _append: function (data) {
            // Convert string to WordArray, else assume WordArray already
            if (typeof data == 'string') {
                data = Utf8.parse(data);
            }

            // Append
            this._data.concat(data);
            this._nDataBytes += data.sigBytes;
        },

        /**
         * Processes available data blocks.
         *
         * This method invokes _doProcessBlock(offset), which must be implemented by a concrete subtype.
         *
         * @param {boolean} doFlush Whether all blocks and partial blocks should be processed.
         *
         * @return {WordArray} The processed data.
         *
         * @example
         *
         *     var processedData = bufferedBlockAlgorithm._process();
         *     var processedData = bufferedBlockAlgorithm._process(!!'flush');
         */
        _process: function (doFlush) {
            // Shortcuts
            var data = this._data;
            var dataWords = data.words;
            var dataSigBytes = data.sigBytes;
            var blockSize = this.blockSize;
            var blockSizeBytes = blockSize * 4;

            // Count blocks ready
            var nBlocksReady = dataSigBytes / blockSizeBytes;
            if (doFlush) {
                // Round up to include partial blocks
                nBlocksReady = Math.ceil(nBlocksReady);
            } else {
                // Round down to include only full blocks,
                // less the number of blocks that must remain in the buffer
                nBlocksReady = Math.max((nBlocksReady | 0) - this._minBufferSize, 0);
            }

            // Count words ready
            var nWordsReady = nBlocksReady * blockSize;

            // Count bytes ready
            var nBytesReady = Math.min(nWordsReady * 4, dataSigBytes);

            // Process blocks
            if (nWordsReady) {
                for (var offset = 0; offset < nWordsReady; offset += blockSize) {
                    // Perform concrete-algorithm logic
                    this._doProcessBlock(dataWords, offset);
                }

                // Remove processed words
                var processedWords = dataWords.splice(0, nWordsReady);
                data.sigBytes -= nBytesReady;
            }

            // Return processed words
            return new WordArray.init(processedWords, nBytesReady);
        },

        /**
         * Creates a copy of this object.
         *
         * @return {Object} The clone.
         *
         * @example
         *
         *     var clone = bufferedBlockAlgorithm.clone();
         */
        clone: function () {
            var clone = Base.clone.call(this);
            clone._data = this._data.clone();

            return clone;
        },

        _minBufferSize: 0
    });

    /**
     * Abstract hasher template.
     *
     * @property {number} blockSize The number of 32-bit words this hasher operates on. Default: 16 (512 bits)
     */
    var Hasher = C_lib.Hasher = BufferedBlockAlgorithm.extend({
        /**
         * Configuration options.
         */
        cfg: Base.extend(),

        /**
         * Initializes a newly created hasher.
         *
         * @param {Object} cfg (Optional) The configuration options to use for this hash computation.
         *
         * @example
         *
         *     var hasher = CryptoJS.algo.SHA256.create();
         */
        init: function (cfg) {
            // Apply config defaults
            this.cfg = this.cfg.extend(cfg);

            // Set initial values
            this.reset();
        },

        /**
         * Resets this hasher to its initial state.
         *
         * @example
         *
         *     hasher.reset();
         */
        reset: function () {
            // Reset data buffer
            BufferedBlockAlgorithm.reset.call(this);

            // Perform concrete-hasher logic
            this._doReset();
        },

        /**
         * Updates this hasher with a message.
         *
         * @param {WordArray|string} messageUpdate The message to append.
         *
         * @return {Hasher} This hasher.
         *
         * @example
         *
         *     hasher.update('message');
         *     hasher.update(wordArray);
         */
        update: function (messageUpdate) {
            // Append
            this._append(messageUpdate);

            // Update the hash
            this._process();

            // Chainable
            return this;
        },

        /**
         * Finalizes the hash computation.
         * Note that the finalize operation is effectively a destructive, read-once operation.
         *
         * @param {WordArray|string} messageUpdate (Optional) A final message update.
         *
         * @return {WordArray} The hash.
         *
         * @example
         *
         *     var hash = hasher.finalize();
         *     var hash = hasher.finalize('message');
         *     var hash = hasher.finalize(wordArray);
         */
        finalize: function (messageUpdate) {
            // Final message update
            if (messageUpdate) {
                this._append(messageUpdate);
            }

            // Perform concrete-hasher logic
            var hash = this._doFinalize();

            return hash;
        },

        blockSize: 512/32,

        /**
         * Creates a shortcut function to a hasher's object interface.
         *
         * @param {Hasher} hasher The hasher to create a helper for.
         *
         * @return {Function} The shortcut function.
         *
         * @static
         *
         * @example
         *
         *     var SHA256 = CryptoJS.lib.Hasher._createHelper(CryptoJS.algo.SHA256);
         */
        _createHelper: function (hasher) {
            return function (message, cfg) {
                return new hasher.init(cfg).finalize(message);
            };
        },

        /**
         * Creates a shortcut function to the HMAC's object interface.
         *
         * @param {Hasher} hasher The hasher to use in this HMAC helper.
         *
         * @return {Function} The shortcut function.
         *
         * @static
         *
         * @example
         *
         *     var HmacSHA256 = CryptoJS.lib.Hasher._createHmacHelper(CryptoJS.algo.SHA256);
         */
        _createHmacHelper: function (hasher) {
            return function (message, key) {
                return new C_algo.HMAC.init(hasher, key).finalize(message);
            };
        }
    });

    /**
     * Algorithm namespace.
     */
    var C_algo = C.algo = {};

    // Reusable object
    var W = [];

    /**
     * SHA-1 hash algorithm.
     */
    var SHA1 = C_algo.SHA1 = Hasher.extend({
        _doReset: function () {
            this._hash = new WordArray.init([
                0x67452301, 0xefcdab89,
                0x98badcfe, 0x10325476,
                0xc3d2e1f0
            ]);
        },

        _doProcessBlock: function (M, offset) {
            // Shortcut
            var H = this._hash.words;

            // Working variables
            var a = H[0];
            var b = H[1];
            var c = H[2];
            var d = H[3];
            var e = H[4];

            // Computation
            for (var i = 0; i < 80; i++) {
                if (i < 16) {
                    W[i] = M[offset + i] | 0;
                } else {
                    var n = W[i - 3] ^ W[i - 8] ^ W[i - 14] ^ W[i - 16];
                    W[i] = (n << 1) | (n >>> 31);
                }

                var t = ((a << 5) | (a >>> 27)) + e + W[i];
                if (i < 20) {
                    t += ((b & c) | (~b & d)) + 0x5a827999;
                } else if (i < 40) {
                    t += (b ^ c ^ d) + 0x6ed9eba1;
                } else if (i < 60) {
                    t += ((b & c) | (b & d) | (c & d)) - 0x70e44324;
                } else /* if (i < 80) */ {
                    t += (b ^ c ^ d) - 0x359d3e2a;
                }

                e = d;
                d = c;
                c = (b << 30) | (b >>> 2);
                b = a;
                a = t;
            }

            // Intermediate hash value
            H[0] = (H[0] + a) | 0;
            H[1] = (H[1] + b) | 0;
            H[2] = (H[2] + c) | 0;
            H[3] = (H[3] + d) | 0;
            H[4] = (H[4] + e) | 0;
        },

        _doFinalize: function () {
            // Shortcuts
            var data = this._data;
            var dataWords = data.words;

            var nBitsTotal = this._nDataBytes * 8;
            var nBitsLeft = data.sigBytes * 8;

            // Add padding
            dataWords[nBitsLeft >>> 5] |= 0x80 << (24 - nBitsLeft % 32);
            dataWords[(((nBitsLeft + 64) >>> 9) << 4) + 14] = Math.floor(nBitsTotal / 0x100000000);
            dataWords[(((nBitsLeft + 64) >>> 9) << 4) + 15] = nBitsTotal;
            data.sigBytes = dataWords.length * 4;

            // Hash final blocks
            this._process();

            // Return final computed hash
            return this._hash;
        },

        clone: function () {
            var clone = Hasher.clone.call(this);
            clone._hash = this._hash.clone();

            return clone;
        }
    });

    /**
     * Shortcut function to the hasher's object interface.
     *
     * @param {WordArray|string} message The message to hash.
     *
     * @return {WordArray} The hash.
     *
     * @static
     *
     * @example
     *
     *     var hash = CryptoJS.SHA1('message');
     *     var hash = CryptoJS.SHA1(wordArray);
     */
    C.SHA1 = Hasher._createHelper(SHA1);

    /**
     * Shortcut function to the HMAC's object interface.
     *
     * @param {WordArray|string} message The message to hash.
     * @param {WordArray|string} key The secret key.
     *
     * @return {WordArray} The HMAC.
     *
     * @static
     *
     * @example
     *
     *     var hmac = CryptoJS.HmacSHA1(message, key);
     */
    C.HmacSHA1 = Hasher._createHmacHelper(SHA1);

    return C;
}(Math));

(function(ADL){
   ADL.verbs = {
      "answered" : {
         "id" : "http://adlnet.gov/expapi/verbs/answered",
         "display" : {"en-US" : "answered",
                      "es-ES" : "contestó"}
      },
      "asked" : {
         "id" : "http://adlnet.gov/expapi/verbs/asked",
         "display" : {"en-US" : "asked",
                      "es-ES" : "preguntó"}
      },
      "attempted" : {
         "id" : "http://adlnet.gov/expapi/verbs/attempted",
         "display" : {"en-US" : "attempted",
                      "es-ES" : "intentó"}
      },
      "attended" : {
         "id" : "http://adlnet.gov/expapi/verbs/attended",
         "display" : {"en-US" : "attended",
                      "es-ES" : "asistió"}
      },
      "commented" : {
         "id" : "http://adlnet.gov/expapi/verbs/commented",
         "display" : {"en-US" : "commented",
                      "es-ES" : "comentó"}
      },
      "completed" : {
         "id" : "http://adlnet.gov/expapi/verbs/completed",
         "display" : {"en-US" : "completed",
                      "es-ES" : "completó"}
      },
      "exited" : {
         "id" : "http://adlnet.gov/expapi/verbs/exited",
         "display" : {"en-US" : "exited",
                      "es-ES" : "salió"}
      },
      "experienced" : {
         "id" : "http://adlnet.gov/expapi/verbs/experienced",
         "display" : {"en-US" : "experienced",
                      "es-ES" : "experimentó"}
      },
      "failed" : {
         "id" : "http://adlnet.gov/expapi/verbs/failed",
         "display" : {"en-US" : "failed",
                      "es-ES" : "fracasó"}
      },
      "imported" : {
         "id" : "http://adlnet.gov/expapi/verbs/imported",
         "display" : {"en-US" : "imported",
                      "es-ES" : "importó"}
      },
      "initialized" : {
         "id" : "http://adlnet.gov/expapi/verbs/initialized",
         "display" : {"en-US" : "initialized",
                      "es-ES" : "inicializó"}
      },
      "interacted" : {
         "id" : "http://adlnet.gov/expapi/verbs/interacted",
         "display" : {"en-US" : "interacted",
                      "es-ES" : "interactuó"}
      },
      "launched" : {
         "id" : "http://adlnet.gov/expapi/verbs/launched",
         "display" : {"en-US" : "launched",
                      "es-ES" : "lanzó"}
      },
      "mastered" : {
         "id" : "http://adlnet.gov/expapi/verbs/mastered",
         "display" : {"en-US" : "mastered",
                      "es-ES" : "dominó"}
      },
      "passed" : {
         "id" : "http://adlnet.gov/expapi/verbs/passed",
         "display" : {"en-US" : "passed",
                      "es-ES" : "aprobó"}
      },
      "preferred" : {
         "id" : "http://adlnet.gov/expapi/verbs/preferred",
         "display" : {"en-US" : "preferred",
                      "es-ES" : "prefirió"}
      },
      "progressed" : {
         "id" : "http://adlnet.gov/expapi/verbs/progressed",
         "display" : {"en-US" : "progressed",
                      "es-ES" : "progresó"}
      },
      "registered" : {
         "id" : "http://adlnet.gov/expapi/verbs/registered",
         "display" : {"en-US" : "registered",
                      "es-ES" : "registró"}
      },
      "responded" : {
         "id" : "http://adlnet.gov/expapi/verbs/responded",
         "display" : {"en-US" : "responded",
                      "es-ES" : "respondió"}
      },
      "resumed" : {
         "id" : "http://adlnet.gov/expapi/verbs/resumed",
         "display" : {"en-US" : "resumed",
                      "es-ES" : "continuó"}
      },
      "scored" : {
         "id" : "http://adlnet.gov/expapi/verbs/scored",
         "display" : {"en-US" : "scored",
                      "es-ES" : "anotó"}
      },
      "shared" : {
         "id" : "http://adlnet.gov/expapi/verbs/shared",
         "display" : {"en-US" : "shared",
                      "es-ES" : "compartió"}
      },
      "suspended" : {
         "id" : "http://adlnet.gov/expapi/verbs/suspended",
         "display" : {"en-US" : "suspended",
                      "es-ES" : "aplazó"}
      },
      "terminated" : {
         "id" : "http://adlnet.gov/expapi/verbs/terminated",
         "display" : {"en-US" : "terminated",
                      "es-ES" : "terminó"}
      },
      "voided" : {
         "id" : "http://adlnet.gov/expapi/verbs/voided",
         "display" : {"en-US" : "voided",
                      "es-ES" : "anuló"}
      }
   };
}(window.ADL = window.ADL || {}));

// adds toISOString to date objects if not there
// from https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/toISOString
if ( !Date.prototype.toISOString ) {
  ( function() {
    
    function pad(number) {
      var r = String(number);
      if ( r.length === 1 ) {
        r = '0' + r;
      }
      return r;
    }
 
    Date.prototype.toISOString = function() {
      return this.getUTCFullYear()
        + '-' + pad( this.getUTCMonth() + 1 )
        + '-' + pad( this.getUTCDate() )
        + 'T' + pad( this.getUTCHours() )
        + ':' + pad( this.getUTCMinutes() )
        + ':' + pad( this.getUTCSeconds() )
        + '.' + String( (this.getUTCMilliseconds()/1000).toFixed(3) ).slice( 2, 5 )
        + 'Z';
    };
  
  }() );
}

// shim for old-style Base64 lib
function toBase64(text){
	if(CryptoJS && CryptoJS.enc.Base64) 
		return CryptoJS.enc.Base64.stringify(CryptoJS.enc.Latin1.parse(text));
	else
		return Base64.encode(text);
}

// shim for old-style crypto lib
function toSHA1(text){
	if(CryptoJS && CryptoJS.SHA1)
		return CryptoJS.SHA1(text).toString();
	else
		return Crypto.util.bytesToHex( Crypto.SHA1(text,{asBytes:true}) );
}

(function(ADL){
    log.debug = true;
    // config object used w/ url params to configure the lrs object
    // change these to match your lrs
    var Config = function()
    {
        var conf = {};
        conf['endpoint'] = "http://localhost:8000/xapi/";
        try
        {
            conf['auth'] = "Basic " + toBase64('tom:1234'); 
        }
        catch (e)
        {
            log("Exception in Config trying to encode auth: " + e);
        }

        // Statement defaults
        // conf["actor"] = {"mbox":"default@example.com"};
        // conf["registration"] =  ruuid();
        // conf["grouping"] = {"id":"ctxact:default/grouping"};
        // conf["activity_platform"] = "default platform";
        return conf
    }();

    /*
     * XAPIWrapper Constructor
     * config - object with a minimum of an endoint property
     * verifyxapiversion - boolean indicating whether to verify the 
     *                     version of the LRS is compatible with this
     *                     wrapper
     */
    XAPIWrapper = function(config, verifyxapiversion)
    {
        this.lrs = getLRSObject(config || {});
        if (this.lrs.user && this.lrs.password)
            updateAuth(this.lrs, this.lrs.user, this.lrs.password);
        this.base = getbase(this.lrs.endpoint);

        function getbase(url)
        {
            var l = document.createElement("a");
            l.href = url;
            if (l.protocol && l.host)
                return l.protocol + "//" + l.host;
            else
                ADL.XAPIWrapper.log("Couldn't create base url from endpoint: " + this.lrs.endpoint);
        }

        function updateAuth(obj, username, password){
            obj.auth = "Basic " + toBase64(username + ":" + password);
        }

        if (verifyxapiversion && testConfig.call(this))
        {
            window.ADL.XHR_request(this.lrs, this.lrs.endpoint+"about", "GET", null, null,
                function(r){
                    if(r.status == 200)
                    {
                        try
                        {
                            var lrsabout = JSON.parse(r.response);
                            var versionOK = false;
                            for (var idx in lrsabout.version)
                            {
                                if(lrsabout.version[idx] == ADL.XAPIWrapper.xapiVersion)
                                {
                                    versionOK = true;
                                    break;
                                }
                            }
                            if (!versionOK)
                            {
                                ADL.XAPIWrapper.log("The lrs version [" + lrsabout.version +"]"+
                                    " does not match this wrapper's XAPI version [" + ADL.XAPIWrapper.xapiVersion + "]");
                            }
                        }
                        catch(e)
                        {
                            ADL.XAPIWrapper.log("The response was not an about object")
                        }
                    }
                    else
                    {
                        ADL.XAPIWrapper.log("The request to get information about the LRS failed: " + r);
                    }
                });
        }

        this.searchParams = function(){
            var sp = {"format" : "exact"};
            return sp;
        };

        this.hash = function(tohash){
            if (!tohash) return null;
            try
            {
                return toSHA1(tohash);
            }
            catch(e)
            {
                ADL.XAPIWrapper.log("Error trying to hash -- " + e);
                return null;
            }
        };

        this.changeConfig = function(config){
            try
            {
                ADL.XAPIWrapper.log("updating lrs object with new configuration");
                this.lrs = mergeRecursive(this.lrs, config);
                if (config.user && config.password)
                    this.updateAuth(this.lrs, config.user, config.password);
                this.base = getbase(this.lrs.endpoint);
            }
            catch(e)
            {
                ADL.XAPIWrapper.log("error while changing configuration -- " + e);
            }
        };

        this.updateAuth = updateAuth;
    };

    // This wrapper is based on the Experience API Spec version:
    XAPIWrapper.prototype.xapiVersion = "1.0.1";

    /*
     * prepareStatement
     * Adds info from the lrs object to the statement, if available.
     * These values could be initialized from the Config object or from 
     * the url query string.
     * stmt - the statement object
     */
    XAPIWrapper.prototype.prepareStatement = function(stmt)
    {
        if(stmt.actor === undefined){
            stmt.actor = JSON.parse(this.lrs.actor);
        }
        else if(typeof stmt.actor === "string") {
            stmt.actor = JSON.parse(stmt.actor);
        }
        if (this.lrs.grouping || 
            this.lrs.registration || 
            this.lrs.activity_platform) {
            if (!stmt.context) {
                stmt.context = {};
            }
        }
        
        if (this.lrs.grouping) {
            if (!stmt.context.contextActivities) {
                stmt.context.contextActivities = {};
            }
            stmt.context.contextActivities.grouping = [{ id : this.lrs.grouping }];
        }
        if (this.lrs.registration) {
            stmt.context.registration = this.lrs.registration;
        }
        if (this.lrs.activity_platform) {
            stmt.context.platform = this.lrs.activity_platform;
        }
    };

    // tests the configuration of the lrs object
    XAPIWrapper.prototype.testConfig = testConfig;

    // writes to the console if available
    XAPIWrapper.prototype.log = log;

    /*
     * sendStatement
     * Send a single statement to the LRS. Makes a Javascript object 
     * with the statement id as 'id' available to the callback function. 
     * stmt - statement object to send
     * callback - function to be called after the LRS responds 
     *            to this request (makes the call asynchronous)
     *            * the function will be passed the XMLHttpRequest object
     *            * and an object with an id property assigned the id 
     *            * of the statement
     */
    XAPIWrapper.prototype.sendStatement = function(stmt, callback) 
    {
        if (this.testConfig())
        {
            this.prepareStatement(stmt);
            var id;
            if (stmt['id'])
            {
                id = stmt['id'];
            }
            else
            {
                id = ADL.ruuid();
                stmt['id'] = id;
            }
            var resp = ADL.XHR_request(this.lrs, this.lrs.endpoint+"statements", 
                "POST", JSON.stringify(stmt), this.lrs.auth, callback, {"id":id});
            if (!callback)
                return {"xhr":resp,
                        "id" :id};
        }
    };

    /*
     * sendStatements
     * Send a list of statements to the LRS.
     * stmtArray - the list of statement objects to send
     * callback - function to be called after the LRS responds 
     *            to this request (makes the call asynchronous)
     *            * the function will be passed the XMLHttpRequest object
     */
    XAPIWrapper.prototype.sendStatements = function(stmtArray, callback) 
    {
        if (this.testConfig())
        {
            for(var i in stmtArray)
            {
                this.prepareStatement(stmtArray[i]);
            }
            var resp = ADL.XHR_request(this.lrs,this.lrs.endpoint+"statements", 
                "POST", JSON.stringify(stmtArray), this.lrs.auth, callback);
            if (!callback)
            {
                return resp;
            }
        }
    };

    /*
     * getStatements
     * Get statement(s) based on the searchparams or more url.
     * searchparams - an ADL.XAPIWrapper.searchParams object of 
     *                key(search parameter)-value(parameter value) pairs. 
     *                Example:
     *                  var myparams = ADL.XAPIWrapper.searchParams();
     *                  myparams['verb'] = ADL.verbs.completed.id;
     *                  var completedStmts = ADL.XAPIWrapper.getStatements(myparams);
     * more - the more url found in the StatementResults object, if there are more 
     *        statements available based on your get statements request. Pass the 
     *        more url as this parameter to retrieve those statements.
     * callback - function to be called after the LRS responds 
     *            to this request (makes the call asynchronous)
     *            * the function will be passed the XMLHttpRequest object
     */
    XAPIWrapper.prototype.getStatements = function(searchparams, more, callback) 
    {
        if (this.testConfig())
        {    
            var url = this.lrs.endpoint + "statements";
            if (more)
            {
                url = this.base + more;
            }
            else
            {
                var urlparams = new Array();

                for (s in searchparams)
                {
                    urlparams.push(s + "=" + encodeURIComponent(searchparams[s]));
                }
                if (urlparams.length > 0)
                    url = url + "?" + urlparams.join("&");
            }

            var res = ADL.XHR_request(this.lrs,url, "GET", null, this.lrs.auth, callback);
            if(res === undefined || res.status == 404)
            {
                return null
            }
            
            try
            {
                return JSON.parse(res.response);
            }
            catch(e)
            {
                return res.response;
            }
        }
    };

    /*
     * getActivities
     * Gets the Activity object from the LRS.
     * activityid - the id of the Activity to get
     * callback - function to be called after the LRS responds 
     *            to this request (makes the call asynchronous)
     *            * the function will be passed the XMLHttpRequest object
     */
    XAPIWrapper.prototype.getActivities = function(activityid, callback)
    {
        if (this.testConfig())
        {
            var url = this.lrs.endpoint + "activities?activityId=<activityid>";
            url = url.replace('<activityid>', encodeURIComponent(activityid));

            var result = ADL.XHR_request(this.lrs, url, "GET", null, this.lrs.auth, callback, null, true);
            
            if(result === undefined || result.status == 404)
            {
                return null
            }
            
            try
            {
                return JSON.parse(result.response);
            }
            catch(e)
            {
                return result.response;
            }
        }
    };

    /*
     * sendState
     * Store activity state in the LRS
     * activityid - the id of the Activity this state is about
     * agent - the agent this Activity state is related to 
     * stateid - the id you want associated with this state
     * registration - (optional) the registraton id associated with this state
     * stateval - the state
     * matchHash - the hash of the state to replace or * to replace any
     * noneMatchHash - the hash of the current state or * to indicate no previous state
     * callback - function to be called after the LRS responds 
     *            to this request (makes the call asynchronous)
     *            * the function will be passed the XMLHttpRequest object
     */
    XAPIWrapper.prototype.sendState = function(activityid, agent, stateid, registration, stateval, matchHash, noneMatchHash, callback)
    {
        if (this.testConfig())
        {
            var url = this.lrs.endpoint + "activities/state?activityId=<activity ID>&agent=<agent>&stateId=<stateid>";
        
            url = url.replace('<activity ID>',encodeURIComponent(activityid));
            url = url.replace('<agent>',encodeURIComponent(JSON.stringify(agent)));
            url = url.replace('<stateid>',encodeURIComponent(stateid));

            if (registration) 
            {
                url += "&registration=" + encodeURIComponent(registration);
            }

            var headers = null;
            if(matchHash && noneMatchHash)
            {
                log("Can't have both If-Match and If-None-Match");
            }
            else if (matchHash)
            {
                headers = {"If-Match":'"'+matchHash+'"'};
            }
            else if (noneMatchHash)
            {
                headers = {"If-None-Match":'"'+noneMatchHash+'"'};
            }

            var method = "PUT";
            if (stateval)
            {
                if (stateval instanceof Array)
                {
                    stateval = JSON.stringify(stateval);
                    headers = headers || {};
                    headers["Content-Type"] ="application/json";
                }
                else if (stateval instanceof Object)
                {
                    stateval = JSON.stringify(stateval);
                    headers = headers || {};
                    headers["Content-Type"] ="application/json";
                    method = "POST";
                }
                else
                {
                    headers = headers || {};
                    headers["Content-Type"] ="application/octect-stream";
                }
            }
            else
            {
                this.log("No activity state was included.");
                return false;
            }
            //(lrs, url, method, data, auth, callback, callbackargs, ignore404, extraHeaders) 
            ADL.XHR_request(this.lrs, url, method, stateval, this.lrs.auth, callback, null, null, headers);
        }
    };

    /*
     * getState
     * Get activity state from the LRS
     * activityid - the id of the Activity this state is about
     * agent - the agent this Activity state is related to 
     * stateid - (optional - if not included, the response will be a list of stateids 
     *            associated with the activity and agent)
     *            the id of the state
     * registration - (optional) the registraton id associated with this state
     * since - date object telling the LRS to return objects newer than the date supplied
     * callback - function to be called after the LRS responds 
     *            to this request (makes the call asynchronous)
     *            * the function will be passed the XMLHttpRequest object
     */
    XAPIWrapper.prototype.getState = function(activityid, agent, stateid, registration, since, callback)
    {
        if (this.testConfig())
        {
            var url = this.lrs.endpoint + "activities/state?activityId=<activity ID>&agent=<agent>";
        
            url = url.replace('<activity ID>',encodeURIComponent(activityid));
            url = url.replace('<agent>',encodeURIComponent(JSON.stringify(agent)));
            
            if (stateid)
            {
                url += "&stateId=" + encodeURIComponent(stateid);
            }
            
            if (registration) 
            {
                url += "&registration=" + encodeURIComponent(registration);
            }

            if(since)
            {
                url += '&since=' + encodeURIComponent(since.toISOString());
            }
            
            var result = ADL.XHR_request(this.lrs, url, "GET", null, this.lrs.auth, callback, null, true);
            
            if(result === undefined || result.status == 404)
            {
                return null
            }
            
            try
            {
                return JSON.parse(result.response);
            }
            catch(e)
            {
                return result.response;
            }
        }
    };

    /*
     * sendActivityProfile
     * Store activity profile in the LRS
     * activityid - the id of the Activity this profile is about
     * profileid - the id you want associated with this profile
     * profileval - the profile
     * matchHash - the hash of the profile to replace or * to replace any
     * noneMatchHash - the hash of the current profile or * to indicate no previous profile
     * callback - function to be called after the LRS responds 
     *            to this request (makes the call asynchronous)
     *            * the function will be passed the XMLHttpRequest object
     */
    XAPIWrapper.prototype.sendActivityProfile = function(activityid, profileid, profileval, matchHash, noneMatchHash, callback) 
    {
        if (this.testConfig())
        {
            var url = this.lrs.endpoint + "activities/profile?activityId=<activity ID>&profileId=<profileid>";
            
            url = url.replace('<activity ID>',encodeURIComponent(activityid));
            url = url.replace('<profileid>',encodeURIComponent(profileid));
            
            var headers = null;
            if(matchHash && noneMatchHash)
            {
                log("Can't have both If-Match and If-None-Match");
            }
            else if (matchHash)
            {
                headers = {"If-Match":'"'+matchHash+'"'};
            }
            else if (noneMatchHash)
            {
                headers = {"If-None-Match":'"'+noneMatchHash+'"'};
            }

            var method = "PUT";
            if (profileval)
            {
                if (profileval instanceof Array)
                {
                    profileval = JSON.stringify(profileval);
                    headers = headers || {};
                    headers["Content-Type"] ="application/json";
                }
                else if (profileval instanceof Object)
                {
                    profileval = JSON.stringify(profileval);
                    headers = headers || {};
                    headers["Content-Type"] ="application/json";
                    method = "POST";
                }
                else
                {
                    headers = headers || {};
                    headers["Content-Type"] ="application/octect-stream";
                }
            }
            else
            {
                this.log("No activity profile was included.");
                return false;
            }

            ADL.XHR_request(this.lrs, url, method, profileval, this.lrs.auth, callback, null, false, headers);
        }
    };

    /*
     * getActivityProfile
     * Get activity profile from the LRS
     * activityid - the id of the Activity this profile is about
     * profileid - (optional - if not included, the response will be a list of profileids 
     *              associated with the activity)
     *              the id of the profile
     * since - date object telling the LRS to return objects newer than the date supplied
     * callback - function to be called after the LRS responds 
     *            to this request (makes the call asynchronous)
     *            * the function will be passed the XMLHttpRequest object
     */
    XAPIWrapper.prototype.getActivityProfile = function(activityid, profileid, since, callback) 
    {
        if (this.testConfig())
        {
            var url = this.lrs.endpoint + "activities/profile?activityId=<activity ID>";
            
            url = url.replace('<activity ID>',encodeURIComponent(activityid));
            
            if (profileid)
            {
                url += "&profileId=" + encodeURIComponent(profileid);
            }

            if(since)
            {
                url += '&since=' + encodeURIComponent(since.toISOString());
            }
            
            var result = ADL.XHR_request(this.lrs, url, "GET", null, this.lrs.auth, callback, null, true);
            
            if(result === undefined || result.status == 404)
            {
                return null
            }
            
            try
            {
                return JSON.parse(result.response);
            }
            catch(e)
            {
                return result.response;
            }
        }
    };

    /*
     * getAgents
     * Gets the Person object from the LRS based on an agent object.
     * The Person object may contain more information about an agent. 
     * See the xAPI Spec for details.
     * agent - the agent object to get a Person
     * callback - function to be called after the LRS responds 
     *            to this request (makes the call asynchronous)
     *            * the function will be passed the XMLHttpRequest object
     */
    XAPIWrapper.prototype.getAgents = function(agent, callback)
    {
        if (this.testConfig())
        {
            var url = this.lrs.endpoint + "agents?agent=<agent>";
            url = url.replace('<agent>', encodeURIComponent(JSON.stringify(agent)));

            var result = ADL.XHR_request(this.lrs, url, "GET", null, this.lrs.auth, callback, null, true);
            
            if(result === undefined || result.status == 404)
            {
                return null
            }
            
            try
            {
                return JSON.parse(result.response);
            }
            catch(e)
            {
                return result.response;
            }
        }
    };

    /*
     * sendAgentProfile
     * Store agent profile in the LRS
     * agent - the agent this profile is related to
     * profileid - the id you want associated with this profile
     * profileval - the profile
     * matchHash - the hash of the profile to replace or * to replace any
     * noneMatchHash - the hash of the current profile or * to indicate no previous profile
     * callback - function to be called after the LRS responds 
     *            to this request (makes the call asynchronous)
     *            * the function will be passed the XMLHttpRequest object
     */
    XAPIWrapper.prototype.sendAgentProfile = function(agent, profileid, profileval, matchHash, noneMatchHash, callback) 
    {
        if (this.testConfig())
        {
            var url = this.lrs.endpoint + "agents/profile?agent=<agent>&profileId=<profileid>";
            
            url = url.replace('<agent>',encodeURIComponent(JSON.stringify(agent)));
            url = url.replace('<profileid>',encodeURIComponent(profileid));
            
            var headers = null;
            if(matchHash && noneMatchHash)
            {
                log("Can't have both If-Match and If-None-Match");
            }
            else if (matchHash)
            {
                headers = {"If-Match":'"'+matchHash+'"'};
            }
            else if (noneMatchHash)
            {
                headers = {"If-None-Match":'"'+noneMatchHash+'"'};
            }

            var method = "PUT";
            if (profileval)
            {
                if (profileval instanceof Array)
                {
                    profileval = JSON.stringify(profileval);
                    headers = headers || {};
                    headers["Content-Type"] ="application/json";
                }
                else if (profileval instanceof Object)
                {
                    profileval = JSON.stringify(profileval);
                    headers = headers || {};
                    headers["Content-Type"] ="application/json";
                    method = "POST";
                }
                else
                {
                    headers = headers || {};
                    headers["Content-Type"] ="application/octect-stream";
                }
            }
            else
            {
                this.log("No agent profile was included.");
                return false;
            }

            ADL.XHR_request(this.lrs, url, method, profileval, this.lrs.auth, callback, null, false, headers);
        }
    };

    /*
     * getAgentProfile
     * Get agnet profile from the LRS
     * agent - the agent associated with this profile
     * profileid - (optional - if not included, the response will be a list of profileids 
     *              associated with the agent)
     *              the id of the profile
     * since - date object telling the LRS to return objects newer than the date supplied
     * callback - function to be called after the LRS responds 
     *            to this request (makes the call asynchronous)
     *            * the function will be passed the XMLHttpRequest object
     */
    XAPIWrapper.prototype.getAgentProfile = function(agent, profileid, since, callback) 
    {
        if (this.testConfig()){
            var url = this.lrs.endpoint + "agents/profile?agent=<agent>";
            
            url = url.replace('<agent>',encodeURIComponent(JSON.stringify(agent)));
            url = url.replace('<profileid>',encodeURIComponent(profileid));

            if (profileid)
            {
                url += "&profileId=" + encodeURIComponent(profileid);
            }

            if(since)
            {
                url += '&since=' + encodeURIComponent(since.toISOString());
            }
            
            var result = ADL.XHR_request(this.lrs, url, "GET", null, this.lrs.auth, callback, null, true);
            
            if(result === undefined || result.status == 404)
            {
                return null
            }
            
            try
            {
                return JSON.parse(result.response);
            }
            catch(e)
            {
                return result.response;
            }
        }
    };

    // tests the configuration of the lrs object
    function testConfig()
    {
        try
        {
            return this.lrs.endpoint != undefined && this.lrs.endpoint != "";
        }
        catch(e)
        {
            return false
        }
    }

    // outputs the message to the console if available
    function log(message) 
    {
        if (!log.debug) return false;
        try
        {
            console.log(message);
            return true;
        }
        catch(e){return false;}
    }

    // merges two object
    function mergeRecursive(obj1, obj2) 
    {
        for (var p in obj2) 
        {
            prop = obj2[p];
            console.log(p + " : " + prop);
            try 
            {
                // Property in destination object set; update its value.
                if ( obj2[p].constructor==Object ) 
                {
                    obj1[p] = mergeRecursive(obj1[p], obj2[p]);

                } 
                else 
                {
                  if (obj1 == undefined)
                  {
                    obj1 = new Object();
                  }
                    obj1[p] = obj2[p];
                } 
            } 
            catch(e) 
            {
              if (obj1 == undefined)
              {
                obj1 = new Object();
              }              
              // Property in destination object not set; create it and set its value.
              obj1[p] = obj2[p];
            }
        }

        return obj1;
    }

    // iniitializes an lrs object with settings from 
    // a config file and from the url query string
    function getLRSObject(config)
    {
        var lrsProps = ["endpoint","auth","actor","registration","activity_id", "grouping", "activity_platform"];
        var lrs = new Object();
        var qsVars, prop;
        
        qsVars = parseQueryString();
        if (qsVars !== undefined && Object.keys(qsVars).length !== 0) {
            for (var i = 0; i<lrsProps.length; i++){
                prop = lrsProps[i];
                if (qsVars[prop]){
                    lrs[prop] = qsVars[prop];
                    delete qsVars[prop];
                }
            }
            if (Object.keys(qsVars).length !== 0) {
              lrs.extended = qsVars;
            }

            lrs = mergeRecursive(config, lrs);
        }
        else {
            lrs = config;
        }
        
        return lrs;
    }

    // parses the params in the url query string
    function parseQueryString() 
    {
        var loc, qs, pairs, pair, ii, parsed;
        
        loc = window.location.href.split('?');
        if (loc.length === 2) {
            qs = loc[1];
            pairs = qs.split('&');
            parsed = {};
            for ( ii = 0; ii < pairs.length; ii++) {
                pair = pairs[ii].split('=');
                if (pair.length === 2 && pair[0]) {
                    parsed[pair[0]] = decodeURIComponent(pair[1]);
                }
            }
        }
        
        return parsed;
    }


    function delay() 
    {
        var xhr = new XMLHttpRequest();
        var url = window.location + '?forcenocache='+ADL.ruuid();
        xhr.open('GET', url, false);
        xhr.send(null);
    }

    /* 
     * ie_request
     * formats a request in a way that IE will allow
     * method - the http request method (ex: "PUT", "GET")
     * url - the url to the request (ex: ADL.XAPIWrapper.lrs.endpoint + "statements")
     * headers - (optional) headers to include in the request
     * data - (optional) the body of the request, if there is one
     */
    function ie_request(method, url, headers, data)
    {
        var newUrl = url;
        
        //Everything that was on query string goes into form vars
        var formData = new Array();
        var qsIndex = newUrl.indexOf('?');
        if(qsIndex > 0){
            formData.push(newUrl.substr(qsIndex+1));
            newUrl = newUrl.substr(0, qsIndex);
        }

        //Method has to go on querystring, and nothing else
        newUrl = newUrl + '?method=' + method;
        
        //Headers
        if(headers !== null){
            for(var headerName in headers){
                formData.push(headerName + "=" + encodeURIComponent(headers[headerName]));
            }
        }

        //The original data is repackaged as "content" form var
        if(data !== null){
            formData.push('content=' + encodeURIComponent(data));
        }
        
        return {
            "method":"POST",
            "url":newUrl,
            "headers":{},
            "data":formData.join("&")
        };
    }
    
    /*!
    Excerpt from: Math.uuid.js (v1.4)
    http://www.broofa.com
    mailto:robert@broofa.com
    Copyright (c) 2010 Robert Kieffer
    Dual licensed under the MIT and GPL licenses.
    */
    ADL.ruuid = function() 
    {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
                var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
                return v.toString(16);
        });
    };

    /*
     * dateFromISOString
     * parses an ISO string into a date object
     * isostr - the ISO string
     */
    ADL.dateFromISOString = function(isostr) 
    {
        var regexp = "([0-9]{4})(-([0-9]{2})(-([0-9]{2})" +
            "([T| ]([0-9]{2}):([0-9]{2})(:([0-9]{2})(\.([0-9]+))?)?" +
            "(Z|(([-+])([0-9]{2}):([0-9]{2})))?)?)?)?";
        var d = isostr.match(new RegExp(regexp));

        var offset = 0;
        var date = new Date(d[1], 0, 1);

        if (d[3]) { date.setMonth(d[3] - 1); }
        if (d[5]) { date.setDate(d[5]); }
        if (d[7]) { date.setHours(d[7]); }
        if (d[8]) { date.setMinutes(d[8]); }
        if (d[10]) { date.setSeconds(d[10]); }
        if (d[12]) { date.setMilliseconds(Number("0." + d[12]) * 1000); }
        if (d[14]) {
            offset = (Number(d[16]) * 60) + Number(d[17]);
            offset *= ((d[15] == '-') ? 1 : -1);
        }

        offset -= date.getTimezoneOffset();
        time = (Number(date) + (offset * 60 * 1000));

        var dateToReturn = new Date();
        dateToReturn.setTime(Number(time));
        return dateToReturn;
    };

    // Synchronous if callback is not provided (not recommended)
    /*
     * XHR_request
     * makes a request to a server (if possible, use functions provided in XAPIWrapper)
     * lrs - the lrs connection info, such as endpoint, auth, etc
     * url - the url of this request
     * method - the http request method
     * data - the payload
     * auth - the value for the Authorization header
     * callback - function to be called after the LRS responds 
     *            to this request (makes the call asynchronous)
     * callbackargs - (optional) additional javascript object to be passed to the callback function
     * ignore 404 - allow page not found errors to pass
     * extraHeaders - other header key-values to be added to this request
     */
    ADL.XHR_request = function(lrs, url, method, data, auth, callback, callbackargs, ignore404, extraHeaders) 
    {
        "use strict";
        
        var xhr,
            finished = false,
            xDomainRequest = false,
            ieXDomain = false,
            ieModeRequest,
            urlparts = url.toLowerCase().match(/^(.+):\/\/([^:\/]*):?(\d+)?(\/.*)?$/),
            location = window.location,
            urlPort,
            result,
            extended,
            prop,
            until;
 
        //Consolidate headers
        var headers = {};
        headers["Content-Type"] = "application/json";
        headers["Authorization"] = auth;
        headers['X-Experience-API-Version'] = ADL.XAPIWrapper.xapiVersion;
        if(extraHeaders !== null){
            for(var headerName in extraHeaders){
                headers[headerName] = extraHeaders[headerName];
            }
        }
        
        //See if this really is a cross domain
        xDomainRequest = (location.protocol.toLowerCase() !== urlparts[1] || location.hostname.toLowerCase() !== urlparts[2]);
        if (!xDomainRequest) {
            urlPort = (urlparts[3] === null ? ( urlparts[1] === 'http' ? '80' : '443') : urlparts[3]);
            xDomainRequest = (urlPort === location.port);
        }
        
        //If it's not cross domain or we're not using IE, use the usual XmlHttpRequest
        if (!xDomainRequest || typeof(XDomainRequest) === 'undefined') {
            xhr = new XMLHttpRequest();
            xhr.open(method, url, callback != null);
            for(var headerName in headers){
                xhr.setRequestHeader(headerName, headers[headerName]);
            }
        } 
        //Otherwise, use IE's XDomainRequest object
        else {
            ieXDomain = true;
            ieModeRequest = ie_request(method, url, headers, data);
            xhr = new XDomainRequest();
            xhr.open(ieModeRequest.method, ieModeRequest.url);
        }
        
        //Setup request callback
        function requestComplete() {
            if(!finished){
                // may be in sync or async mode, using XMLHttpRequest or IE XDomainRequest, onreadystatechange or
                // onload or both might fire depending upon browser, just covering all bases with event hooks and
                // using 'finished' flag to avoid triggering events multiple times
                finished = true;
                var notFoundOk = (ignore404 && xhr.status === 404);
                if (xhr.status === undefined || (xhr.status >= 200 && xhr.status < 400) || notFoundOk) {
                    if (callback) {
                        if(callbackargs){
                            callback(xhr, callbackargs);
                        }
                        else {
                            try {
                                var body = JSON.parse(xhr.responseText);
                                callback(xhr,body);
                            }
                            catch(e){
                                callback(xhr,xhr.responseText);
                            }
                        }
                    } else {
                        result = xhr;
                        return xhr;
                    }
                } else {
                    var warning;
                    try {
                        warning = "There was a problem communicating with the Learning Record Store. ( " 
                            + xhr.status + " | " + xhr.response+ " )" + url
                    } catch (ex) {
                        warning = ex.toString();
                    }
                    console.warn(warning);
                    ADL.xhrRequestOnError(xhr, method, url, callback, callbackargs);
                    //throw new Error("debugger");
                    result = xhr;
                    return xhr;
                }
            } else {
                return result;
            }
        };

        xhr.onreadystatechange = function () {
            if (xhr.readyState === 4) {
               return requestComplete();
            }
        };

        xhr.onload = requestComplete;
        xhr.onerror = requestComplete;
        //xhr.onerror =  ADL.xhrRequestOnError(xhr, method, url);

        xhr.send(ieXDomain ? ieModeRequest.data : data);
        
        if (!callback) {
            // synchronous
            if (ieXDomain) {
                // synchronous call in IE, with no asynchronous mode available.
                until = 1000 + new Date();
                while (new Date() < until && xhr.readyState !== 4 && !finished) {
                    delay();
                }
            }
            return requestComplete();
        }
    };

    /*
     * Holder for custom global error callback
     * xhr - xhr object or null
     * method - XMLHttpRequest request method
     * url - full endpoint url
     */
    ADL.xhrRequestOnError = function(xhr, method, url, callback, callbackargs){};

    ADL.XAPIWrapper = new XAPIWrapper(Config, false);

}(window.ADL = window.ADL || {}));

(function(ADL){

	function _getobj(obj, path){
		var parts = path.split('.');

		var part = parts[0];
		path = parts.slice(1).join('.');

		if( !obj[part] ){
			if( /\[\]$/.test(part) ){
				part = part.slice(0,-2);
				obj[part] = [];
			}
			else
				obj[part] = {};
		}

		if( !path )
			return obj[part];
		else
			return _getobj(obj[part], path);
	}

	/*******************************************************************************
	 * XAPIStatement - a convenience class to wrap statement objects
	 *
	 * This sub-API is supposed to make it easier to author valid xAPI statements
	 * by adding constructors and encouraging best practices. All objects in this
	 * API are fully JSON-compatible, so anything expecting an xAPI statement can
	 * take an improved statement and vice versa.
	 *
	 * A working knowledge of what exactly the LRS expects is still expected,
	 * but it's easier to map an 'I did this' statement to xAPI now.
	 *
	 * Tech note: All constructors also double as shallow clone functions. E.g.
	 *
	 * 	var activity1 = new Activity('A walk in the park');
	 * 	var activity2 = new Activity(activity1);
	 * 	var activity3 = new Activity(stmt_from_lrs.object);
	 *
	 *******************************************************************************/

	/*
	 * XAPIStatement
	 * A convenient JSON-compatible xAPI statement wrapper
	 * All args are optional, but the statement may not be complete or valid
	 * Can also pass an Agent IFI, Verb ID, and an Activity ID in lieu of these args
	 * actor - The Agent or Group committing the action described by the statement
	 * verb - The Verb for the action described by the statement
	 * object - The receiver of the action. An Agent, Group, Activity, SubStatement, or StatementRef
	 */
	var XAPIStatement = function(actor,verb,object)
	{

		// initialize

		// if first arg is an xapi statement, parse
		if( actor && actor.actor && actor.verb && actor.object ){
			var stmt = actor;
			for(var i in stmt){
				if(i != 'actor' && i != 'verb' && i != 'object')
					this[i] = stmt[i];
			}
			actor = stmt.actor;
			verb = stmt.verb;
			object = stmt.object;
		}
		
		if(actor){
			if( actor instanceof Agent )
				this.actor = actor;
			else if(actor.objectType === 'Agent' || !actor.objectType)
				this.actor = new Agent(actor);
			else if(actor.objectType === 'Group')
				this.actor = new Group(actor);
		}
		else this.actor = null;
		
		if(verb){
			if( verb instanceof Verb )
				this.verb = verb;
			else
				this.verb = new Verb(verb);
		}
		else this.verb = null;

		// decide what kind of object was passed
		if(object)
		{
			if( object.objectType === 'Activity' || !object.objectType ){
				if( object instanceof Activity )
					this.object = object;
				else
					this.object = new Activity(object);
			}
			else if( object.objectType === 'Agent' ){
				if( object instanceof Agent )
					this.object = object;
				else
					this.object = new Agent(object);
			}
			else if( object.objectType === 'Group' ){
				if( object instanceof Group )
					this.object = object;
				else
					this.object = new Group(object);
			}
			else if( object.objectType === 'StatementRef' ){
				if( object instanceof StatementRef )
					this.object = object;
				else
					this.object = new StatementRef(object);
			}
			else if( object.objectType === 'SubStatement' ){
				if( object instanceof SubStatement )
					this.object = object;
				else
					this.object = new SubStatement(object);
			}
			else this.object = null;
		}
		else this.object = null;


		this.generateId = function(){
			this.id = ADL.ruuid();
		};
	};

	XAPIStatement.prototype.toString = function(){
		return this.actor.toString() + " " + this.verb.toString() + " " + this.object.toString();
	};

	XAPIStatement.prototype.isValid = function(){
		return this.actor && this.actor.isValid() 
			&& this.verb && this.verb.isValid() 
			&& this.object && this.object.isValid();
	};

	XAPIStatement.prototype.generateRegistration = function(){
		_getobj(this,'context').registration = ADL.ruuid();
	};

	XAPIStatement.prototype.addParentActivity = function(activity){
		_getobj(this,'context.contextActivities.parent[]').push(new Activity(activity));
	};

	XAPIStatement.prototype.addGroupingActivity = function(activity){
		_getobj(this,'context.contextActivities.grouping[]').push(new Activity(activity));
	};

	XAPIStatement.prototype.addOtherContextActivity = function(activity){
		_getobj(this,'context.contextActivities.other[]').push(new Activity(activity));
	};

	
	/*
	 * Agent
	 * Provides an easy constructor for xAPI agent objects
	 * identifier - One of the Inverse Functional Identifiers specified in the spec.
	 *     That is, an email, a hashed email, an OpenID, or an account object.
	 *     See (https://github.com/adlnet/xAPI-Spec/blob/master/xAPI.md#inversefunctional)
	 * name - (optional) The natural-language name of the agent
	 */
	var Agent = function(identifier, name)
	{
		this.objectType = 'Agent';
		this.name = name;

		// figure out what type of identifier was given
		if( identifier && (identifier.mbox || identifier.mbox_sha1sum || identifier.openid || identifier.account) ){
			for(var i in identifier){
				this[i] = identifier[i];
			}
		}
		else if( /^mailto:/.test(identifier) ){
			this.mbox = identifier;
		}
		else if( /^[0-9a-f]{40}$/i.test(identifier) ){
			this.mbox_sha1sum = identifier;
		}
		else if( /^http[s]?:/.test(identifier) ){
			this.openid = identifier;
		}
		else if( identifier && identifier.homePage && identifier.name ){
			this.account = identifier;
		}
	};
	Agent.prototype.toString = function(){
		return this.name || this.mbox || this.openid || this.mbox_sha1sum || this.account.name;
	};
	Agent.prototype.isValid = function()
	{
		return this.mbox || this.mbox_sha1sum || this.openid
	    || (this.account.homePage && this.account.name)
	    || (this.objectType === 'Group' && this.member);
	};

	
	/*
	 * Group
	 * A type of agent, can contain multiple agents
	 * identifier - (optional if `members` specified) See Agent.
	 * members - (optional) An array of Agents describing the membership of the group
	 * name - (optional) The natural-language name of the agent
	 */
	var Group = function(identifier, members, name)
	{
		Agent.call(this, identifier, name);
		this.member = members;
		this.objectType = 'Group';
	};
	Group.prototype = new Agent;

	
	/*
	 * Verb
	 * Really only provides a convenient language map
	 * id - The IRI of the action taken
	 * description - (optional) An English-language description, or a Language Map
	 */
	var Verb = function(id, description)
	{
		// if passed a verb object then copy and return
		if( id && id.id ){
			for(var i in id){
				this[i] = id[i];
			}
			return;
		}

		// save id and build language map
		this.id = id;
		if(description)
		{
			if( typeof(description) === 'string' || description instanceof String ){
				this.display = {'en-US': description};
			}
			else {
				this.display = description;
			}
		}
	};
	Verb.prototype.toString = function(){
		if(this.display && (this.display['en-US'] || this.display['en']))
			return this.display['en-US'] || this.display['en'];
		else
			return this.id;
	};
	Verb.prototype.isValid = function(){
		return this.id;
	};

	
	/*
	 * Activity
	 * Describes an object that an agent interacts with
	 * id - The unique activity IRI
	 * name - An English-language identifier for the activity, or a Language Map
	 * description - An English-language description of the activity, or a Language Map
	 */
	var Activity = function(id, name, description)
	{
		// if first arg is activity, copy everything over
		if(id && id.id){
			var act = id;
			for(var i in act){
				this[i] = act[i];
			}
			return;
		}
		
		this.objectType = 'Activity';
		this.id = id;
		if( name || description )
		{
			this.definition = {};
			
			if( typeof(name) === 'string' || name instanceof String )
				this.definition.name = {'en-US': name};
			else if(name)
				this.definition.name = name;
			
			if( typeof(description) === 'string' || description instanceof String )
				this.definition.description = {'en-US': description};
			else if(description)
				this.definition.description = description;
		}
	};
	Activity.prototype.toString = function(){
		if(this.definition && this.definition.name && (this.definition.name['en-US'] || this.definition.name['en']))
			return this.definition.name['en-US'] || this.definition.name['en'];
		else
			return this.id;
	};
	Activity.prototype.isValid = function(){
		return this.id && (!this.objectType || this.objectType === 'Activity');
	};
	
	/*
	 * StatementRef
	 * An object that refers to a separate statement
	 * id - The UUID of another xAPI statement
	 */
	var StatementRef = function(id){
		if(id && id.id){
			for(var i in id){
				this[i] = id[i];
			}
		}
		else {
			this.objectType = 'StatementRef';
			this.id = id;
		}
	};
	StatementRef.prototype.toString = function(){
		return 'statement('+this.id+')';
	};
	StatementRef.prototype.isValid = function(){
		return this.id && this.objectType && this.objectType === 'StatementRef';
	};
	
	/*
	 * SubStatement
	 * A self-contained statement as the object of another statement
	 * See XAPIStatement for constructor details
	 */
	var SubStatement = function(actor, verb, object){
		XAPIStatement.call(this,actor,verb,object);
		this.objectType = 'SubStatement';

		delete this.id;
		delete this.stored;
		delete this.version;
		delete this.authority;
	};
	SubStatement.prototype = new XAPIStatement;
	SubStatement.prototype.toString = function(){
		return '"' + SubStatement.prototype.prototype.toString.call(this) + '"';
	};
	
	XAPIStatement.Agent = Agent;
	XAPIStatement.Group = Group;
	XAPIStatement.Verb = Verb;
	XAPIStatement.Activity = Activity;
	XAPIStatement.StatementRef = StatementRef;
	XAPIStatement.SubStatement = SubStatement;
	ADL.XAPIStatement = XAPIStatement;

}(window.ADL = window.ADL || {}));
