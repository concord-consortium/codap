/**
 * Taken from Mike Bostock's Protovis project <http://mbostock.github.io/protovis/>. Thank you!
 *
 * Abstract; see an implementing class.
 *
 * @class Represents an abstract text formatter and parser. A <i>format</i> is a
 * function that converts an object of a given type, such as a <tt>Date</tt>, to
 * a human-readable string representation. The format may also have a
 * {@link #parse} method for converting a string representation back to the
 * given object type.
 *
 * <p>Because formats are themselves functions, they can be used directly as
 * mark properties. For example, if the data associated with a label are dates,
 * a date format can be used as label text:
 *
 * <pre>    .text(DG.Format.date("%m/%d/%y"))</pre>
 *
 * And as with scales, if the format is used in multiple places, it can be
 * convenient to declare it as a global variable and then reference it from the
 * appropriate property functions. For example, if the data has a <tt>date</tt>
 * attribute, and <tt>format</tt> references a given date format:
 *
 * <pre>    .text(function(d) format(d.date))</pre>
 *
 * Similarly, to parse a string into a date:
 *
 * <pre>var date = format.parse("4/30/2010");</pre>
 *
 * Not all format implementations support parsing. See the implementing class
 * for details.
 *
 * @see DG.Format.date
 * @see DG.Format.number
 * @see DG.Format.time
 */
DG.Format = {};

/**
 * Formats the specified object, returning the string representation.
 *
 * @function
 * @name DG.Format.prototype.format
 * @param {object} x the object to format.
 * @returns {string} the formatted string.
 */

/**
 * Parses the specified string, returning the object representation.
 *
 * @function
 * @name DG.Format.prototype.parse
 * @param {string} x the string to parse.
 * @returns {object} the parsed object.
 */

/**
 * @private Given a string that may be used as part of a regular expression,
 * this methods returns an appropriately quoted version of the specified string,
 * with any special characters escaped.
 *
 * @param {string} s a string to quote.
 * @returns {string} the quoted string.
 */
DG.Format.re = function(s) {
  return s.replace(/[\\\^\$\*\+\?\[\]\(\)\.\{\}]/g, "\\$&");
};

/**
 * @private Optionally pads the specified string <i>s</i> so that it is at least
 * <i>n</i> characters long, using the padding character <i>c</i>.
 *
 * @param {string} c the padding character.
 * @param {number} n the minimum string length.
 * @param {string} s the string to pad.
 * @returns {string} the padded string.
 */
DG.Format.pad = function(c, n, s) {
  var m = n - String(s).length;
  return (m < 1) ? s : new Array(m + 1).join(c) + s;
};
/**
 * Constructs a new date format with the specified string pattern.
 *
 * @class The format string is in the same format expected by the
 * <tt>strftime</tt> function in C. The following conversion specifications are
 * supported:<ul>
 *
 * <li>%a - abbreviated weekday name.</li>
 * <li>%A - full weekday name.</li>
 * <li>%b - abbreviated month names.</li>
 * <li>%B - full month names.</li>
 * <li>%c - locale's appropriate date and time.</li>
 * <li>%C - century number.</li>
 * <li>%d - day of month [01,31] (zero padded).</li>
 * <li>%D - same as %m/%d/%y.</li>
 * <li>%e - day of month [ 1,31] (space padded).</li>
 * <li>%h - same as %b.</li>
 * <li>%H - hour (24-hour clock) [00,23] (zero padded).</li>
 * <li>%I - hour (12-hour clock) [01,12] (zero padded).</li>
 * <li>%m - month number [01,12] (zero padded).</li>
 * <li>%M - minute [0,59] (zero padded).</li>
 * <li>%n - newline character.</li>
 * <li>%p - locale's equivalent of a.m. or p.m.</li>
 * <li>%r - same as %I:%M:%S %p.</li>
 * <li>%R - same as %H:%M.</li>
 * <li>%S - second [00,61] (zero padded).</li>
 * <li>%t - tab character.</li>
 * <li>%T - same as %H:%M:%S.</li>
 * <li>%x - same as %m/%d/%y.</li>
 * <li>%X - same as %I:%M:%S %p.</li>
 * <li>%y - year with century [00,99] (zero padded).</li>
 * <li>%Y - year including century.</li>
 * <li>%% - %.</li>
 *
 * </ul>The following conversion specifications are currently <i>unsupported</i>
 * for formatting:<ul>
 *
 * <li>%j - day number [1,366].</li>
 * <li>%u - weekday number [1,7].</li>
 * <li>%U - week number [00,53].</li>
 * <li>%V - week number [01,53].</li>
 * <li>%w - weekday number [0,6].</li>
 * <li>%W - week number [00,53].</li>
 * <li>%Z - timezone name or abbreviation.</li>
 *
 * </ul>In addition, the following conversion specifications are currently
 * <i>unsupported</i> for parsing:<ul>
 *
 * <li>%a - day of week, either abbreviated or full name.</li>
 * <li>%A - same as %a.</li>
 * <li>%c - locale's appropriate date and time.</li>
 * <li>%C - century number.</li>
 * <li>%D - same as %m/%d/%y.</li>
 * <li>%I - hour (12-hour clock) [1,12].</li>
 * <li>%n - any white space.</li>
 * <li>%p - locale's equivalent of a.m. or p.m.</li>
 * <li>%r - same as %I:%M:%S %p.</li>
 * <li>%R - same as %H:%M.</li>
 * <li>%t - same as %n.</li>
 * <li>%T - same as %H:%M:%S.</li>
 * <li>%x - locale's equivalent to %m/%d/%y.</li>
 * <li>%X - locale's equivalent to %I:%M:%S %p.</li>
 *
 * </ul>
 *
 * @see <a
 * href="http://www.opengroup.org/onlinepubs/007908799/xsh/strftime.html">strftime</a>
 * documentation.
 * @see <a
 * href="http://www.opengroup.org/onlinepubs/007908799/xsh/strptime.html">strptime</a>
 * documentation.
 * @extends DG.Format
 * @param {string} pattern the format pattern.
 */
DG.Format.date = function(pattern) {
  var pad = DG.Format.pad;

  /** @private */
  function format(d) {
    return pattern.replace(/%[a-zA-Z0-9]/g, function(s) {
      var h, w;
      switch (s) {
        case '%a': return [
          "Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"
        ][d.getDay()];
        case '%A': return [
          "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday",
          "Saturday"
        ][d.getDay()];
        case '%h':
        case '%b': return [
          "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep",
          "Oct", "Nov", "Dec"
        ][d.getMonth()];
        case '%B': return [
          "January", "February", "March", "April", "May", "June", "July",
          "August", "September", "October", "November", "December"
        ][d.getMonth()];
        case '%c': return d.toLocaleString();
        case '%C': return pad("0", 2, Math.floor(d.getFullYear() / 100) % 100);
        case '%d': return pad("0", 2, d.getDate());
        case '%x':
        case '%D': return pad("0", 2, d.getMonth() + 1)
            + "/" + pad("0", 2, d.getDate())
            + "/" + pad("0", 2, d.getFullYear() % 100);
        case '%e': return pad(" ", 2, d.getDate());
        case '%H': return pad("0", 2, d.getHours());
        case '%I': {
          h = d.getHours() % 12;
          return h ? pad("0", 2, h) : 12;
        }
        // TODO %j: day of year as a decimal number [001,366]
        case '%m': return pad("0", 2, d.getMonth() + 1);
        case '%M': return pad("0", 2, d.getMinutes());
        case '%n': return "\n";
        case '%p': return d.getHours() < 12 ? "AM" : "PM";
        case '%T':
        case '%X':
        case '%r': {
          h = d.getHours() % 12;
          return (h ? pad("0", 2, h) : 12)
              + ":" + pad("0", 2, d.getMinutes())
              + ":" + pad("0", 2, d.getSeconds())
              + " " + (d.getHours() < 12 ? "AM" : "PM");
        }
        case '%R': return pad("0", 2, d.getHours()) + ":" + pad("0", 2, d.getMinutes());
        case '%S': return pad("0", 2, d.getSeconds());
        case '%Q': return pad("0", 3, d.getMilliseconds());
        case '%t': return "\t";
        case '%u': {
          w = d.getDay();
          return w ? w : 1;
        }
        // TODO %U: week number (sunday first day) [00,53]
        // TODO %V: week number (monday first day) [01,53] ... with weirdness
        case '%w': return d.getDay();
        // TODO %W: week number (monday first day) [00,53] ... with weirdness
        case '%y': return pad("0", 2, d.getFullYear() % 100);
        case '%Y': return d.getFullYear();
        // TODO %Z: timezone name or abbreviation
        case '%%': return "%";
      }
      return s;
    });
  }

  /**
   * Converts a date to a string using the associated formatting pattern.
   *
   * @function
   * @name DG.Format.date.prototype.format
   * @param {Date} date a date to format.
   * @returns {string} the formatted date as a string.
   */
  format.format = format;

  /**
   * Parses a date from a string using the associated formatting pattern.
   *
   * @function
   * @name DG.Format.date.prototype.parse
   * @param {string} s the string to parse as a date.
   * @returns {Date} the parsed date.
   */
  format.parse = function(s) {
    var year = 1970, month = 0, date = 1, hour = 0, minute = 0, second = 0;
    var fields = [function() {}];

    /* Register callbacks for each field in the format pattern. */
    var re = DG.Format.re(pattern).replace(/%[a-zA-Z0-9]/g, function(s) {
      switch (s) {
        // TODO %a: day of week, either abbreviated or full name
        // TODO %A: same as %a
        case '%b': {
          fields.push(function(x) { month = {
            Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5, Jul: 6, Aug: 7,
            Sep: 8, Oct: 9, Nov: 10, Dec: 11
          }[x]; });
          return "([A-Za-z]+)";
        }
        case '%h':
        case '%B': {
          fields.push(function(x) { month = {
            January: 0, February: 1, March: 2, April: 3, May: 4, June: 5,
            July: 6, August: 7, September: 8, October: 9, November: 10,
            December: 11
          }[x]; });
          return "([A-Za-z]+)";
        }
        // TODO %c: locale's appropriate date and time
        // TODO %C: century number[0,99]
        case '%e':
        case '%d': {
          fields.push(function(x) { date = x; });
          return "([0-9]+)";
        }
        // TODO %D: same as %m/%d/%y
        case '%I':
        case '%H': {
          fields.push(function(x) { hour = x; });
          return "([0-9]+)";
        }
        // TODO %j: day number [1,366]
        case '%m': {
          fields.push(function(x) { month = x - 1; });
          return "([0-9]+)";
        }
        case '%M': {
          fields.push(function(x) { minute = x; });
          return "([0-9]+)";
        }
        // TODO %n: any white space
        // TODO %p: locale's equivalent of a.m. or p.m.
        case '%p': { // TODO this is a hack
          fields.push(function(x) {
            if (hour === 12) {
              if (x === "am") hour = 0;
            } else if (x === "pm") {
              hour = Number(hour) + 12;
            }
          });
          return "(am|pm)";
        }
        // TODO %r: %I:%M:%S %p
        // TODO %R: %H:%M
        case '%S': {
          fields.push(function(x) { second = x; });
          return "([0-9]+)";
        }
        // TODO %t: any white space
        // TODO %T: %H:%M:%S
        // TODO %U: week number [00,53]
        // TODO %w: weekday [0,6]
        // TODO %W: week number [00, 53]
        // TODO %x: locale date (%m/%d/%y)
        // TODO %X: locale time (%I:%M:%S %p)
        case '%y': {
          fields.push(function(x) {
            x = Number(x);
            year = x + (((0 <= x) && (x < 69)) ? 2000
                : (((x >= 69) && (x < 100) ? 1900 : 0)));
          });
          return "([0-9]+)";
        }
        case '%Y': {
          fields.push(function(x) { year = x; });
          return "([0-9]+)";
        }
        case '%%': {
          fields.push(function() {});
          return "%";
        }
      }
      return s;
    });

    var match = s.match(re);
    if (match) match.forEach(function(m, i) { fields[i](m); });
    return new Date(year, month, date, hour, minute, second);
  };

  return format;
};
/**
 * Returns a time format of the given type, either "short" or "long".
 *
 * @class Represents a time format, converting between a <tt>number</tt>
 * representing a duration in milliseconds, and a <tt>string</tt>. Two types of
 * time formats are supported: "short" and "long". The <i>short</i> format type
 * returns a string such as "3.3 days" or "12.1 minutes", while the <i>long</i>
 * format returns "13:04:12" or similar.
 *
 * @extends DG.Format
 * @param {string} type the type; "short" or "long".
 */
DG.Format.time = function(type) {
  var pad = DG.Format.pad;

  /*
   * MILLISECONDS = 1
   * SECONDS = 1e3
   * MINUTES = 6e4
   * HOURS = 36e5
   * DAYS = 864e5
   * WEEKS = 6048e5
   * MONTHS = 2592e6
   * YEARS = 31536e6
   */

  /** @private */
  function format(t) {
    function toInt(fl) {
      /* eslint no-bitwise: "off" */
      /* jshint ignore: start */
      return fl >> 0; // bit-shift zero places: converts to 32 bit int
      /* jshint ignore: end */
    }
    t = Number(t); // force conversion from Date
    switch (type) {
      case "short": {
        if (t >= 31536e6) {
          return (t / 31536e6).toFixed(1) + " years";
        } else if (t >= 6048e5) {
          return (t / 6048e5).toFixed(1) + " weeks";
        } else if (t >= 864e5) {
          return (t / 864e5).toFixed(1) + " days";
        } else if (t >= 36e5) {
          return (t / 36e5).toFixed(1) + " hours";
        } else if (t >= 6e4) {
          return (t / 6e4).toFixed(1) + " minutes";
        }
        return (t / 1e3).toFixed(1) + " seconds";
      }
      case "long": {
        var a = [],
            s = toInt((t % 6e4) / 1e3),
            m = toInt((t % 36e5) / 6e4);
        a.push(pad("0", 2, s));
        if (t >= 36e5) {
          var h = toInt((t % 864e5) / 36e5);
          a.push(pad("0", 2, m));
          if (t >= 864e5) {
            a.push(pad("0", 2, h));
            a.push(Math.floor(t / 864e5).toFixed());
          } else {
            a.push(h.toFixed());
          }
        } else {
          a.push(m.toFixed());
        }
        return a.reverse().join(":");
      }
    }
  }

  /**
   * Formats the specified time, returning the string representation.
   *
   * @function
   * @name DG.Format.time.prototype.format
   * @param {number} t the duration in milliseconds. May also be a <tt>Date</tt>.
   * @returns {string} the formatted string.
   */
  format.format = format;

  /**
   * Parses the specified string, returning the time in milliseconds.
   *
   * @function
   * @name DG.Format.time.prototype.parse
   * @param {string} s a formatted string.
   * @returns {number} the parsed duration in milliseconds.
   */
  format.parse = function(s) {
    var re, a, t, f, u;
    switch (type) {
      case "short": {
        re = /([0-9,.]+)\s*([a-z]+)/g;
        t = 0;
        a = re.exec(s);
        while (a) {
          f = parseFloat(a[0].replace(",", ""));
          u = 0;
          switch (a[2].toLowerCase()) {
            case "year": case "years": u = 31536e6; break;
            case "week": case "weeks": u = 6048e5; break;
            case "day": case "days": u = 864e5; break;
            case "hour": case "hours": u = 36e5; break;
            case "minute": case "minutes": u = 6e4; break;
            case "second": case "seconds": u = 1e3; break;
          }
          t += f * u;
          a = re.exec(s);
        }
        return t;
      }
      case "long": {
        a = s.replace(",", "").split(":").reverse();
        t = 0;
        if (a.length) t += parseFloat(a[0]) * 1e3;
        if (a.length > 1) t += parseFloat(a[1]) * 6e4;
        if (a.length > 2) t += parseFloat(a[2]) * 36e5;
        if (a.length > 3) t += parseFloat(a[3]) * 864e5;
        return t;
      }
    }
  };

  return format;
};
/**
 * Returns a default number format.
 *
 * @class Represents a number format, converting between a <tt>number</tt> and a
 * <tt>string</tt>. This class allows numbers to be formatted with variable
 * precision (both for the integral and fractional part of the number), optional
 * thousands grouping, and optional padding. The thousands (",") and decimal
 * (".") separator can be customized.
 *
 * @returns {DG.Format.number} a number format.
 */
DG.Format.number = function() {
  var mini = 0, // default minimum integer digits
      maxi = Infinity, // default maximum integer digits
      mins = 0, // mini, including group separators
      minf = 0, // default minimum fraction digits
      maxf = 0, // default maximum fraction digits
      maxk = 1, // 10^maxf
      padi = "0", // default integer pad
      padf = "0", // default fraction pad
      padg = true, // whether group separator affects integer padding
      decimal = ".", // default decimal separator
      group = ",", // default group separator
      np = "\u2212", // default negative prefix
      ns = ""; // default negative suffix

  /** @private */
  function format(x) {
    /* Round the fractional part, and split on decimal separator. */
    if (Infinity > maxf) x = Math.round(x * maxk) / maxk;
    var s = String(Math.abs(x)).split(".");

    /* Pad, truncate and group the integral part. */
    var i = s[0];
    if (i.length > maxi) i = i.substring(i.length - maxi);
    if (padg && (i.length < mini)) i = new Array(mini - i.length + 1).join(padi) + i;
    if (i.length > 3) i = i.replace(/\B(?=(?:\d{3})+(?!\d))/g, group);
    if (!padg && (i.length < mins)) i = new Array(mins - i.length + 1).join(padi) + i;
    s[0] = x < 0 ? np + i + ns : i;

    /* Pad the fractional part. */
    var f = s[1] || "";
    if (f.length < minf) s[1] = f + new Array(minf - f.length + 1).join(padf);

    return s.join(decimal);
  }

  /**
   * @function
   * @name DG.Format.number.prototype.format
   * @param {number} x
   * @returns {string}
   */
  format.format = format;

  /**
   * Parses the specified string as a number. Before parsing, leading and
   * trailing padding is removed. Group separators are also removed, and the
   * decimal separator is replaced with the standard point ("."). The integer
   * part is truncated per the maximum integer digits, and the fraction part is
   * rounded per the maximum fraction digits.
   *
   * @function
   * @name DG.Format.number.prototype.parse
   * @param {string} x the string to parse.
   * @returns {number} the parsed number.
   */
  format.parse = function(x) {
    var re = DG.Format.re;

    /* Remove leading and trailing padding. Split on the decimal separator. */
    var s = String(x)
        .replace(new RegExp("^(" + re(padi) + ")*"), "")
        .replace(new RegExp("(" + re(padf) + ")*$"), "")
        .split(decimal);

    /* Remove grouping and truncate the integral part. */
    var i = s[0].replace(new RegExp(re(group), "g"), "");
    if (i.length > maxi) i = i.substring(i.length - maxi);

    /* Round the fractional part. */
    var f = s[1] ? Number("0." + s[1]) : 0;
    if (Infinity > maxf) f = Math.round(f * maxk) / maxk;

    return Math.round(i) + f;
  };

  /**
   * Sets or gets the minimum and maximum number of integer digits. This
   * controls the number of decimal digits to display before the decimal
   * separator for the integral part of the number. If the number of digits is
   * smaller than the minimum, the digits are padded; if the number of digits is
   * larger, the digits are truncated, showing only the lower-order digits. The
   * default range is [0, Infinity].
   *
   * <p>If only one argument is specified to this method, this value is used as
   * both the minimum and maximum number. If no arguments are specified, a
   * two-element array is returned containing the minimum and the maximum.
   *
   * @function
   * @name DG.Format.number.prototype.integerDigits
   * @param {number} [min] the minimum integer digits.
   * @param {number} [max] the maximum integer digits.
   * @returns {DG.Format.number} <tt>this</tt>, or the current integer digits.
   */
  format.integerDigits = function(min, max) {
    if (arguments.length) {
      mini = Number(min);
      maxi = (arguments.length > 1) ? Number(max) : mini;
      mins = mini + Math.floor(mini / 3) * group.length;
      return this;
    }
    return [mini, maxi];
  };

  /**
   * Sets or gets the minimum and maximum number of fraction digits. The
   * controls the number of decimal digits to display after the decimal
   * separator for the fractional part of the number. If the number of digits is
   * smaller than the minimum, the digits are padded; if the number of digits is
   * larger, the fractional part is rounded, showing only the higher-order
   * digits. The default range is [0, 0].
   *
   * <p>If only one argument is specified to this method, this value is used as
   * both the minimum and maximum number. If no arguments are specified, a
   * two-element array is returned containing the minimum and the maximum.
   *
   * @function
   * @name DG.Format.number.prototype.fractionDigits
   * @param {number} [min] the minimum fraction digits.
   * @param {number} [max] the maximum fraction digits.
   * @returns {DG.Format.number} <tt>this</tt>, or the current fraction digits.
   */
  format.fractionDigits = function(min, max) {
    if (arguments.length) {
      minf = Number(min);
      maxf = (arguments.length > 1) ? Number(max) : minf;
      maxk = Math.pow(10, maxf);
      return this;
    }
    return [minf, maxf];
  };

  /**
   * Sets or gets the character used to pad the integer part. The integer pad is
   * used when the number of integer digits is smaller than the minimum. The
   * default pad character is "0" (zero).
   *
   * @param {string} [x] the new pad character.
   * @returns {DG.Format.number} <tt>this</tt> or the current pad character.
   */
  format.integerPad = function(x) {
    if (arguments.length) {
      padi = String(x);
      padg = /\d/.test(padi);
      return this;
    }
    return padi;
  };

  /**
   * Sets or gets the character used to pad the fration part. The fraction pad
   * is used when the number of fraction digits is smaller than the minimum. The
   * default pad character is "0" (zero).
   *
   * @param {string} [x] the new pad character.
   * @returns {DG.Format.number} <tt>this</tt> or the current pad character.
   */
  format.fractionPad = function(x) {
    if (arguments.length) {
      padf = String(x);
      return this;
    }
    return padf;
  };

  /**
   * Sets or gets the character used as the decimal point, separating the
   * integer and fraction parts of the number. The default decimal point is ".".
   *
   * @param {string} [x] the new decimal separator.
   * @returns {DG.Format.number} <tt>this</tt> or the current decimal separator.
   */
  format.decimal = function(x) {
    if (arguments.length) {
      decimal = String(x);
      return this;
    }
    return decimal;
  };

  /**
   * Sets or gets the character used as the group separator, grouping integer
   * digits by thousands. The default decimal point is ",". Grouping can be
   * disabled by using "" for the separator.
   *
   * @param {string} [x] the new group separator.
   * @returns {DG.Format.number} <tt>this</tt> or the current group separator.
   */
  format.group = function(x) {
    if (arguments.length) {
      group = x ? String(x) : "";
      mins = mini + Math.floor(mini / 3) * group.length;
      return this;
    }
    return group;
  };

  /**
   * Sets or gets the negative prefix and suffix. The default negative prefix is
   * "&minus;", and the default negative suffix is the empty string.
   *
   * @param {string} [x] the negative prefix.
   * @param {string} [y] the negative suffix.
   * @returns {DG.Format.number} <tt>this</tt> or the current negative format.
   */
  format.negativeAffix = function(x, y) {
    if (arguments.length) {
      np = String(x || "");
      ns = String(y || "");
      return this;
    }
    return [np, ns];
  };

  return format;
};
