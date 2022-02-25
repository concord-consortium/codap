// ==========================================================================
//  DG.ColorUtilities
//
//  TinkerPlots-style color gradient and color transformation utility functions.
//  Ported from the TinkerPlots C++ source code.
//
//  Author:   Craig D. Miller
//
//  Copyright ©2011-13 Scientific Reasoning Research Institute,
//                  University of Massachusetts Amherst
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

/* global tinycolor */

/**
 @namespace Color gradient and color transformation utility functions
 */
DG.ColorUtilities = {
  // color modifiers for categorical gradients
  // probably best imbedded in a gradient function.
  kStartingHue: (2.0 / 3.0),      // shift hue so starting variable is blue
  kCatHueSpread: 0.8,          // Spread of hue for values of categorical variable. 1.0=entire rainbow
  kCatSaturation: (2.0 / 3.0),      // Categorical data: partial saturation fades colors so they look better
  kCatBrightness: 1.0,          // Categorical data: partial brightness fades colors so they look better
  kBrightnessDampenFactor: 1.0,    // dampen partially (1.0 = darker)
  kStandardMacGammaCorrection: (1 / 1.8),  // Finish partially-corrected MacOS gamma
  kStandardWinGammaCorrection: (1 / 2.5),  // assume uncorrected gamma

  // Photoshop "K" color values for Red, Yellow, Green, Aqua, Blue, Magenta
  // (hues 0,60,120,180,240,300,360; brightness & Saturation 100%)
  kBrightnessTable: [0.54, 0.05, 0.20, 0.15, 0.75, 0.46],
  kBrightnessTableMaxK: 0.75,  // Blue is darkest

  // standard colors
  kNoAttribCaseColor: '#A6CAF0',    //tp_CColor tp_CColorGradient::kNoVarCaseColor = kcp_kSkyBlueColor;
  //kNoAttribCaseSelectedColor : { colorString: 'red' } //tp_CColor tp_CColorGradient::kNoVarCaseSelectedColor = kcp_kRedColor;
  //kNoAttribFocusedCaseColor : { colorString: 'yellow' } // tp_CColor tp_CColorGradient::kNoVarFocusedCaseColor  = kcp_kYellowColor;
  kMissingValueCaseColor: '#A0A0A0', //tp_CColor tp_CColorGradient::kMissingValueCaseColor = kcp_kDarkGrayColor;
  kMapMissingValueCaseColor: '#ffffff01', //tp_CColor tp_CColorGradient::kMissingValueCaseColor = kcp_kDarkGrayColor;
  // kDefaultBorderColor: {colorString: 'black'},     // tp_CColor tp_CColorGradient::kDefaultBorderColor = kcp_kBlackColor;
  // tp_CColor tp_CColorGradient::kHasVarFocusedCaseBorderColor = kcp_kBlueColor;

  /*
   The following list of 20 colors are maximally visually distinct from each other.
   See http://eleanormaclure.files.wordpress.com/2011/03/colour-coding.pdf
   and https://stackoverflow.com/questions/470690/how-to-automatically-generate-n-distinct-colors

   The first seven are also visually distinct for people with defective color vision
    */
  kKellyColors: [
      '#FF6800', '#803E75', '#A6BDD7', '#FFB300',
      '#C10020', '#CEA262', '#817066', '#007D34',
      '#00538A', '#F13A13', '#53377A', '#FF8E00',
      '#B32851', '#F4C800', '#7F180D', '#93AA00',
      '#593315', '#232C16', '#FF7A5C', '#F6768E'
    ],


  /** Color class for use with Rafael view objects.
   @constructor
   */
  Color: function () {
    return {colorString: ""};    // {string} Rafael-compatible color value
  },

  /** rgbColor class for colors with a Red/Green/Blue color model for color manipulation.
   @constructor
   @extends DG.ColorUtilities.Color
   */
  rgbColor: function () {
    return {
      colorString: "",   // {string} Rafael-compatible color value
      r: 1, g: 1, b: 1 // {number} Red, Green, Blue color components in range [0-1] (black to white)
    };
  },

  isRGB: function( iColor) {
    return iColor && !SC.none(iColor.r) && !SC.none(iColor.g) && !SC.none(iColor.b);
  },

  /**
   * Used to validate color specification for a 'legend' that colors points by the attribute value.
   * We only allow this for rgb and hex specification of color. We disallow normal color words like 'red'
   * and 'blue' because they will occur frequently at places we don't wish to color points.
   * @param iColorString
   * @returns {boolean|*|null}
   */
  isColorSpecString: function( iValue) {
    if (!this._isColorRegex) {
      var tExp = '^(?:' + 'DG.Utilities.colorPattern'.loc() + ')$';
      this._isColorRegex = new RegExp(tExp, 'i');
    }
    return (typeof iValue === 'string' &&
              this._isColorRegex.test(iValue.toLowerCase().replace(/\s/g,'')));
  },

  /** hsbColor class for colors with Hue/Saturation/Brightness color model for color manipulation.
   @constructor
   @extends DG.ColorUtilities.Color
   */
  hsbColor: function () {
    return {
      colorString: "",   // {string} Rafael-compatible color value
      h: 1, s: 1, b: 1 // {number} Hue, Saturation, Brightness color components in range [0-1]
    };
  },

  isHSB: function( iColor) {
    return iColor && !SC.none(iColor.h) && !SC.none(iColor.s) && !SC.none(iColor.b);
  },

  /* --------- Notes on updating of DG case icon colors.

    if color attribute value has changed and...
    numeric value change => attribute stats range change ? update all case colors : update 1 case color
    category value change => attribute category list change ? update all case colors : update 1 case color

    if color attribute is in use and...
    if attribute inserted or deleted => update all attribute colors => update all case colors.

    ----------- */

  /**
   * calcAttributeColorFromIndex()
   *      Return a kelly color based on the given attribute index.
   * @param {number} attribIndex : 0+ integer
   * @param {number} attribCount : 1+ integer
   * @returns {string}
   */
  calcAttributeColorFromIndex: function (attribIndex, attribCount) {
    if( attribIndex === 0)
      return DG.PlotUtilities.kDefaultPointColor;
    else if(attribIndex < 0 || attribIndex >= attribCount)
      return this.kNoAttribCaseColor;
    else
      return this.kKellyColors[attribIndex % this.kKellyColors.length];
/*
    var tHue = attribIndex / attribCount;  // get hue in range [0.0-1.0]
    tHue += DG.ColorUtilities.kStartingHue;      // shift hue so starting variable is blue
    tHue -= Math.floor(tHue);      // convert back to range [0 - 1]
    var tSaturation = 1.0;
    var tBrightness = DG.ColorUtilities.dampenBrightnessByHue(1.0, tHue, DG.ColorUtilities.kBrightnessDampenFactor);
    var tAttribColor = DG.ColorUtilities.hsb_to_PlatformColor(tHue, tSaturation, tBrightness);
    return tAttribColor;
*/
  },

  /**
   * calcAttributeColor()
   *      Calculate the color assigned to a variable in a dataset, using
   *      the color attribute description.
   * @param {DG.AttributePlacementDescription} iColorAttributeDescription
   * @returns {string}
   */
  calcAttributeColor: function (iColorAttributeDescription) {

    // get the stored attribute color
    var tCollectionClient = iColorAttributeDescription.get('collectionClient'),
        tAttribute = iColorAttributeDescription.get('attribute'),
        tCategoryMap = tAttribute && tAttribute.get('categoryMap'),
        tColor = DG.ColorUtilities.getAttributeColorFromColorMap(tCategoryMap);

    // else compute the color from the attribute's position in the collection
    if (!tColor) {
      DG.assert(tAttribute !== DG.Analysis.kNullAttribute);
      var tAttributeName = tAttribute.get('name'),
          tAttributeIndex = tCollectionClient.getAttributeIndexByName(tAttributeName),
          tAttributeCount = tCollectionClient.getAttributeCount();
      tColor = DG.ColorUtilities.calcAttributeColorFromIndex(tAttributeIndex, tAttributeCount);
    }

    return tColor;
  },

  /***************************************************************************
   * calcCaseColor()
   *      Calculate a case color from the case value and color attribute
   *      description.
   * @param iCaseValue {number or string or null}
   * @param {DG.AttributePlacementDescription} iColorAttributeDescription
   * @param {DG.ColorUtilities.Color} Color to be used if there is no color attribute
   * @returns {DG.ColorUtilities.Color}
   */
  calcCaseColor: function (iCaseValue, iColorAttributeDescription, iNoAttrColor, iQuantileValues) {

    // TODO: store common parameters such as attribute color so we don't need to recalc for every case.
    var newColor = null,
        tAttribute = iColorAttributeDescription.get('attribute'),
        tAttributeColor = tAttribute && DG.ColorUtilities.calcAttributeColor(iColorAttributeDescription);

    if (tAttribute === DG.Analysis.kNullAttribute) {
      newColor = iNoAttrColor || DG.ColorUtilities.kNoAttribCaseColor;
    } else if (SC.empty(iCaseValue)) {
      newColor = DG.ColorUtilities.kMissingValueCaseColor;
    } else {
      // we have an attribute and non-missing case value, now get stored or computed color
      var tAttributeType = iColorAttributeDescription.get('attributeType'),
          tIsNumeric = iColorAttributeDescription.get('isNumeric'),
          tCategoryMap = tAttribute.get('categoryMap');
      switch (tAttributeType) {
        case DG.Analysis.EAttributeType.eCategorical:
          // get color from attribute's color map, or set to null
          newColor = DG.ColorUtilities.getCategoryColorFromColorMap(tCategoryMap, iCaseValue);
          break;
        case DG.Analysis.EAttributeType.eColor:
          var tCaseColor = tinycolor(iCaseValue);
          if (tCaseColor.isValid())
            newColor = tCaseColor.toString();
          break;
        case DG.Analysis.EAttributeType.eNumeric:
        case DG.Analysis.EAttributeType.eDateTime:
          if (SC.isArray(iQuantileValues)) {
            var tFoundIndex = -1,
                tNumQuantiles = iQuantileValues.length - 1,
                tMinMax = {min: 0, max: 1},
                tSpectrumEnds = this.getAttributeColorSpectrumEndsFromColorMap(tCategoryMap, tAttributeColor);
            iQuantileValues.forEach(function (iQV, iIndex) {
              if (iIndex <= tNumQuantiles) {
                if (iQV <= iCaseValue && iCaseValue <= iQuantileValues[iIndex + 1])
                  tFoundIndex = iIndex;
              }
            });
            newColor = this.calcGradientColor(tMinMax, tSpectrumEnds.low, tSpectrumEnds.high, (tFoundIndex + 1) / tNumQuantiles);
          }
          break;
      }
      if (!newColor) {
        // calculate color using TinkerPlots color-space algorithm
        newColor = tIsNumeric ?
            DG.ColorUtilities.calcContinuousColor(
                iColorAttributeDescription.get('minMax'), tAttributeColor, iCaseValue) :
            DG.ColorUtilities.calcCategoryColor(
                iColorAttributeDescription.get('attributeStats'), tAttributeColor, iCaseValue);
      }
    }
    return newColor;
  },

  /**
   * @param iColorMap  {} object with category values as keys, color string as values.
   * @param iCaseValue  {number or string or null}
   * @returns {DG.ColorUtilities.Color}
   */
  getCategoryColorFromColorMap: function (iColorMap, iCaseValue) {
    if (iColorMap) {
      var tColorValue = iColorMap[iCaseValue] || '#000000';
      if (typeof tColorValue === 'string') {
        tColorValue = {colorString: tColorValue};    // {string} Rafael-compatible color value
      }
      return tColorValue;
    }
    return null;
  },

  /**
   * @param iColorMap  {} object with 'attribute-color' as the color key (see below).
   * @returns {DG.ColorUtilities.Color}
   */
  getAttributeColorFromColorMap: function (iColorMap) {
    if (iColorMap) {
      var tColorValue = iColorMap['attribute-color'];
      if (typeof tColorValue === 'string') {
        return DG.ColorUtilities.rgbColorString_to_PlatformColor(tColorValue, true);    // {string} Rafael-compatible color value, with HSB components
      }
    }
    return null;
  },

  /**
   * @param iColorMap  {} object with 'stroke-color' as the color key (see below).
   * @returns {DG.ColorUtilities.Color}
   */
  getStrokeColorFromColorMap: function (iColorMap) {
    return iColorMap ? iColorMap['stroke-color'] : null;
  },

  /**
   * @param iColorMap  {} object with 'attribute-color' as the color key (see below).
   * @returns {DG.ColorUtilities.Color}
   */
  getAttributeColorSpectrumEndsFromColorMap: function (iColorMap, iAttrColor) {
    var tEnds = {},
        tLow, tHigh;
    if (iColorMap) {
      tLow = iColorMap['low-attribute-color'] || 'rgb(255,255,255)';
      tHigh = iColorMap['high-attribute-color'] || iColorMap['attribute-color'] || iAttrColor;
      if (typeof tLow === 'string') {
        tLow = DG.ColorUtilities.rgbColorString_to_PlatformColor(tLow);
      }
      if (typeof tHigh === 'string') {
        tHigh = DG.ColorUtilities.rgbColorString_to_PlatformColor(tHigh);
      }
      else if(this.isHSB( tHigh))
      {
        tHigh = Raphael.hsb2rgb( tHigh.h, tHigh.s, tHigh.b);
        tHigh.colorString = tHigh.colorString || 'rgb(%@,%@,%@)'.fmt(tHigh.r, tHigh.g, tHigh.b);
        tHigh.r /= 255;
        tHigh.g /= 255;
        tHigh.b /= 255;
      }
      tEnds = {low: tLow, high: tHigh};
    }
    return tEnds;
  },

  /**
   * calcContinuousColor()
   *      Calculate the icon fill color for this numeric value of a continuous
   *      variable.  Creates a gradient from white for the lowest numeric value,
   *      to the attribute color for the highest numeric value. Returns the
   *      missing value color for any non-numeric case values.
   * @param {DG.AttributeStats} iMinMax
   * @param {DG.ColorUtilities.hsbColor} iAttributeColor
   * @param iCaseValue
   * @returns {DG.ColorUtilities.Color}
   */
  calcContinuousColor: function (iMinMax, iAttributeColor, iCaseValue) {

    var tCaseColor = DG.ColorUtilities.kMissingValueCaseColor,
        tRange = iMinMax.max - iMinMax.min,
        tHue = iAttributeColor.h,  // break color into components
        tSaturation = iAttributeColor.s,
        tBrightness = iAttributeColor.b,
        tScale;

    // if we have a valid numeric range and case value along that range
    if (DG.isFinite(tRange) && DG.isFinite(iCaseValue)) {
      //KCP_ASSERT( Compare::inRange( iCaseValue, iVarStats.GetMin(), iVarStats.GetMax() ));
      // adjust saturation and brightness along gradient
      tScale = (tRange > 0) ? ((iCaseValue - iMinMax.min) / tRange) : 1;
      tSaturation *= tScale;
      tBrightness = DG.ColorUtilities.gammaCorrect(1.0 - ((1.0 - tBrightness) * tScale));
      tCaseColor = DG.ColorUtilities.hsb_to_PlatformColor(tHue, tSaturation, tBrightness);
    }
    return tCaseColor;
  },

  /**
   * calcGradientColor()
   *      Calculate the icon fill color for this numeric value of a continuous
   *      variable.  Creates a gradient from iColor1 for the lowest numeric value,
   *      to iColor2 for the highest numeric value. Returns the
   *      missing value color for any non-numeric case values.
   * @param {DG.AttributeStats} iMinMax
   * @param {DG.ColorUtilities.rgbColor} iColor1
   * @param {DG.ColorUtilities.rgbColor} iColor2
   * @param iCaseValue
   * @returns {DG.ColorUtilities.Color}
   */
  calcGradientColor: function (iMinMax, iColor1, iColor2, iCaseValue) {
    var tCaseColor = DG.ColorUtilities.kMissingValueCaseColor,
        tRange = iMinMax.max - iMinMax.min;
    // if we have a valid numeric range and case value along that range
    // Todo: consider interpolating with hsb instead of rgb
    if (DG.isFinite(tRange) && DG.isFinite(iCaseValue) && this.isRGB( iColor1) && this.isRGB( iColor2)) {
      var tScale = Math.max( 0, Math.min( 1, (iCaseValue - iMinMax.min) / tRange)),
          tRed = iColor1.r + tScale * (iColor2.r - iColor1.r),
          tGreen = iColor1.g + tScale * (iColor2.g - iColor1.g),
          tBlue = iColor1.b + tScale * (iColor2.b - iColor1.b);
      tCaseColor = DG.ColorUtilities.rgb_to_PlatformColor(tRed, tGreen, tBlue);
    }
    return tCaseColor;
  },

  /**
   * CalcCategoryColor()
   *      Calculate the icon fill color for this category value of a categorical
   *      variable.  Creates a gradient of hues, one per category value.
   *      Returns the missing value color for any non-numeric case values.
   * @param {DG.AttributeStats} iAttributeStats
   * @param {DG.ColorUtilities.hsbColor} iAttributeColor
   * @param iCaseValue
   * @returns {DG.ColorUtilities.Color}
   */
  calcCategoryColor: function (iAttributeStats, iAttributeColor, iCaseValue) {
    var tCategoryIndex = iAttributeStats.cellNameToCellNumber(iCaseValue),
        tNumColors = DG.ColorUtilities.kKellyColors.length;
    return { colorString: DG.ColorUtilities.kKellyColors[ tCategoryIndex % tNumColors] };
  },

  /**
   * hsb_to_PlatformColor()
   *      convert a color in Hue, Saturation, Brightness (HSB) color space, range [0-1],
   *      to a Rafael-compatible color value.
   *
   *      Note: we are using hsb_to_rgb() for color conversions instead of the Rafael "hsb()"
   *      colorString, to give the same colors as TinkerPlots, because Rafael's color conversions
   *      are slightly different, and thus hard to compare and verify.
   * @param tHue
   * @param tSaturation
   * @param tBrightness
   * @returns {DG.ColorUtilities.hsbColor}
   */
  hsb_to_PlatformColor: function (tHue, tSaturation, tBrightness) {

    return {
      h: tHue,
      s: tSaturation,
      b: tBrightness,
      //colorString : ("hsb(" + tHue + "," + tSaturation + "," + tBrightness + ")")
      colorString: DG.ColorUtilities.hsb_to_rgb(tHue, tSaturation, tBrightness)
    };
  },

  /**
   * rgb_to_PlatformColor()
   *      convert a color in Red, Green, Blue (RGB) color space, range [0-1],
   *      to a Rafael/SVG-compatible color string (rgb values in range [0-255].
   * @param red
   * @param green
   * @param blue
   * @returns {string} Rafael-compatible RGB color string.
   */
  rgb_to_PlatformColor: function (red, green, blue) {
    // note: although SVG 'Interface RGBColor' says float is OK, not all libraries work
    // correctly unless values are integer. (E.g. Leaflet)

    return this.rgb_to_hex( red, green, blue);
  },

  /**
   * rgb_to_hex()
   *      convert a color in Red, Green, Blue (RGB) color space, range [0-1],
   *      to a hex string.
   * @param red
   * @param green
   * @param blue
   * @returns {string} #hhhhhh
   */
  rgb_to_hex: function (red, green, blue) {

    function componentToHex(c) {
      var hex = (Math.round( c * 255)).toString(16);
      return hex.length === 1 ? "0" + hex : hex;
    }

    return "#" + componentToHex(red) + componentToHex(green) + componentToHex(blue);
  },

  /**
   * hsb_to_rgb()
   *      Converts from Hue, Saturation, and Value color representation
   *      to Red, Green, Blue color representation.  From Foley & Van Dam, page 616.
   * @param {number} hue           number in range [0-1]
   * @param {number} saturation    number in range [0-1]
   * @param {number} brightness    number in range [0-1]
   * @returns {string} Rafael-compatible RGB color string.
   */
  hsb_to_rgb: function (hue, saturation, brightness) {
    var i,        // int
        f, p, q, t,    // float
        tPlatformColor; // color string

    if (saturation === 0) {
      tPlatformColor = DG.ColorUtilities.rgb_to_PlatformColor(brightness, brightness, brightness);
    }
    else {
      f = (hue >= 1.0) ? 0 : (hue * 6.0);
      i = Math.floor(f);
      f = f - i;    // fractional part of hue
      p = brightness * (1 - saturation);
      q = brightness * (1 - (saturation * f));
      t = brightness * (1 - (saturation * (1 - f)));

      switch (i) {
        case 0:
          tPlatformColor = DG.ColorUtilities.rgb_to_PlatformColor(brightness, t, p);
          break;
        case 1:
          tPlatformColor = DG.ColorUtilities.rgb_to_PlatformColor(q, brightness, p);
          break;
        case 2:
          tPlatformColor = DG.ColorUtilities.rgb_to_PlatformColor(p, brightness, t);
          break;
        case 3:
          tPlatformColor = DG.ColorUtilities.rgb_to_PlatformColor(p, q, brightness);
          break;
        case 4:
          tPlatformColor = DG.ColorUtilities.rgb_to_PlatformColor(t, p, brightness);
          break;
        case 5:
          tPlatformColor = DG.ColorUtilities.rgb_to_PlatformColor(brightness, p, q);
          break;
      }
    }
    return tPlatformColor;
  },

  /**
   * gammaCorrect()
   *      Adjusts gradient from black (0.0) to white (1.0) with
   *      a power function to compensate for non-linear brightness
   *      of monitors.  Standard monitor gamma correction value is 1 / 2.5,
   *      MacOS provides partial gamma correction of 1 / 1.4, requiring
   *      an addition gamma of 1 / 1.8.
   * @param {number} value in range [0-1]
   * @returns {number} corrected value in range [0-1]
   */
  gammaCorrect: function (value) {
    return Math.pow(value, DG.ColorUtilities.kStandardMacGammaCorrection);
  },

  /**
   * dampenBrightnessByHue()

   Dampen the brightness of a color to make different hues more uniform
   in perceived color.  For example blues (hue = 0.6) at full brightness
   (1.0) are much darker than yellows, so we dampen the brightness of
   yellows to make color gradients across the hues more uniform
   (we can't make blue brighter). Similarly, all hues are dampened in
   proportion to the relative brightness of the darkest hue.

   Because color dampening produces muddy (dark) colors, the caller can
   pass in a dampen factor in range [0.0 - 1.0] to reduce the dampening effect.
   0 = no dampening, 1 = 100% of table values, 0.75 = 75% dampening.

   * @param {number} iOldBrightness
   * @param {number} iConstHue
   * @param {number} iDampenFactor
   */
  dampenBrightnessByHue: function (iOldBrightness, iConstHue, iDampenFactor) {

    // get nearest values in brightness table
    var kBrightnessTable = DG.ColorUtilities.kBrightnessTable,
        kMaxK = DG.ColorUtilities.kBrightnessTableMaxK,
        kTableSize = kBrightnessTable.length,
        tHueIndex = iConstHue * kTableSize,
        tLower = Math.floor(tHueIndex),
        tUpper = Math.ceil(tHueIndex),
        tLowerFraction = (tLower < tUpper) ? tUpper - tHueIndex : 1.0,
        tUpperFraction = tHueIndex - tLower,
        tKValue,
        tDampenFraction;

    tLower = tLower % kTableSize; // probably not needed
    tUpper = tUpper % kTableSize; // upper can wrap around to zero (colors are in a circle).
    //KCP_ASSERT( Compare::inRange( tLower, kTableSize ));
    //KCP_ASSERT( Compare::inRange( tUpper, kTableSize ));
    //KCP_ASSERT( Compare::close( tLowerFraction + tUpperFraction, 1.0 ));

    // interpolate between K values
    tKValue = kBrightnessTable[tLower] * tLowerFraction + kBrightnessTable[tUpper] * tUpperFraction;

    // convert to amount to dampen (zero for darkest hue)
    tDampenFraction = 1 - (( kMaxK - tKValue ) * iDampenFactor);

    return ( iOldBrightness * tDampenFraction );
  },

  /**
   *
   * Return a color string representing a color darker than the given one where iFactor
   * determines the amount of darkening.
   *
   * @param iColor {String}
   * @param iFactor {Number}
   * @return {String}
   */

  darker: function (iColorString, iFactor) {
//  tStrokeColor = DG.color(iColorString).darker(DG.PlotUtilities.kStrokeDarkerFactor ).color;
    var tColor = DG.color(iColorString).darker(iFactor).color;
    return tColor;
  },

  /**
   * Convert an SVC/Rafael color string to a DG color object.
   * @param iColor
   * @param iWantHSB
   * @return {DG.ColorUtilities.rgbColor}  The color object with r,g,b components from [0-1], or optionally h,s,b components.
   *
   * NOTE: for now we use 'parseColor' to implement this:
   * parseColor
   * Copyright 2011 THEtheChad Elliott
   * Released under the MIT and GPL licenses.
   * Parse hex/rgb{a} color syntax.
   * from https://gist.github.com/1297590
   *
   * We have the option of using 'RGBColor':
   *   A class to parse color values
   *   author Stoyan Stefanov <sstoo@gmail.com>
   *   link   http://www.phpied.com/rgb-color-parser-in-javascript/
   *   license Use it if you like it
   *   Example use:
   * var color = new RGBColor('darkblue');
   if (color.ok) { // 'ok' is true when the parsing was a success
            // alert channels
            alert(color.r + ', ' + color.g + ', ' + color.b);
            // alert HEX and RGB
            alert(color.toHex());
            alert(color.toRGB());
        }
   *
   * BEST use SC.color when we update to Sproutcore 1.9
   * see http://docs.sproutcore.com/#doc=SC.Color&method=.KEYWORDS&src=false
   *
   */
  rgbColorString_to_PlatformColor: function (iColor, iWantHSB) {

    // Allow assignments as comparisons
    /* eslint no-cond-assign: "off" */
    /* jshint boss:true */

    // convert color name to hex color
    var cache,
        color = DG.ColorUtilities.colorNameToHexColor(iColor);

    // Checks for 6 digit hex and converts string to integer
    if (cache = /^#([\da-fA-F]{2})([\da-fA-F]{2})([\da-fA-F]{2})/.exec(color))
      cache = [parseInt(cache[1], 16), parseInt(cache[2], 16), parseInt(cache[3], 16)];

    // Checks for 3 digit hex and converts string to integer
    else if (cache = /^#([\da-fA-F])([\da-fA-F])([\da-fA-F])/.exec(color))
      cache = [parseInt(cache[1], 16) * 17, parseInt(cache[2], 16) * 17, parseInt(cache[3], 16) * 17];

    // Checks for rgba and converts string to
    // integer/float using unary + operator to save bytes
    else if (cache = /^rgba\(([\d]+),([\d]+),([\d]+),([\d]+|[\d]*.[\d]+)\)/.exec(color))
      cache = [+cache[1], +cache[2], +cache[3], +cache[4]];

    // Checks for rgb and converts string to
    // integer/float using unary + operator to save bytes
    else if (cache = /^rgb\(([\d]+),([\d]+),([\d]+)\)/.exec(color))
      cache = [+cache[1], +cache[2], +cache[3]];

    // Otherwise throw an exception to make debugging easier
    else throw new Error(color + ' is not supported by parseColor');

    // Performs RGBA conversion by default
    //if( isNaN(cache[3])) { cache[3] = 1; }
    // Adds or removes 4th value based on rgba support
    // Support is flipped twice to prevent erros if
    // it's not defined
    /* return cache.slice(0,3 + !!$.support.rgba); */

    // return new object with color components and original color string,
    // like hsb_to_PlatformColor()
    var newColor = {
      r: cache[0] / 255,
      g: cache[1] / 255,
      b: cache[2] / 255,
      colorString: iColor
    };
    if (iWantHSB) {
      var newHSB = Raphael.rgb2hsb(newColor.r, newColor.g, newColor.b);
      newColor.h = newHSB.h;
      newColor.s = newHSB.s;
      newColor.b = newHSB.b;
    }
    return newColor;
  },

  /**
   * Convert an SVC/Rafael color name to the equivalent hex color.
   *
   * Based on RGBColor() by Stoyan Stefanov <sstoo@gmail.com>
   * http://www.phpied.com/rgb-color-parser-in-javascript/
   *
   * @param color_string
   * @return {String} String of form #rrggbb, hex colors if match found.
   */
  colorNameToHexColor: function (color_string) {
    var tPrefix = '';
    // strip any leading #, remove spaces, make lower case
    if (color_string.charAt(0) === '#') { // remove # if any
      color_string = color_string.substr(1, 6);
      tPrefix = '#';
    }
    color_string = color_string.replace(/ /g, '');
    color_string = color_string.toLowerCase();

    // try simple matches
    if (DG.ColorUtilities.simpleColorNames.hasOwnProperty(color_string)) {
      color_string = DG.ColorUtilities.simpleColorNames[color_string];
      tPrefix = '#';
    }
    color_string = tPrefix + color_string; // add back in the prefix

    return color_string;
  },

  /**
   * SVG color names (compatible with rafael/css/w3c/svg),
   * from http://www.phpied.com/rgb-color-parser-in-javascript/
   * see also http://www.w3.org/TR/css3-color/#svg-color
   * @type {Object}
   */
  simpleColorNames: {
    aliceblue: 'f0f8ff',
    antiquewhite: 'faebd7',
    aqua: '00ffff',
    aquamarine: '7fffd4',
    azure: 'f0ffff',
    beige: 'f5f5dc',
    bisque: 'ffe4c4',
    black: '000000',
    blanchedalmond: 'ffebcd',
    blue: '0000ff',
    blueviolet: '8a2be2',
    brown: 'a52a2a',
    burlywood: 'deb887',
    cadetblue: '5f9ea0',
    chartreuse: '7fff00',
    chocolate: 'd2691e',
    coral: 'ff7f50',
    cornflowerblue: '6495ed',
    cornsilk: 'fff8dc',
    crimson: 'dc143c',
    cyan: '00ffff',
    darkblue: '00008b',
    darkcyan: '008b8b',
    darkgoldenrod: 'b8860b',
    darkgray: 'a9a9a9',
    darkgreen: '006400',
    darkkhaki: 'bdb76b',
    darkmagenta: '8b008b',
    darkolivegreen: '556b2f',
    darkorange: 'ff8c00',
    darkorchid: '9932cc',
    darkred: '8b0000',
    darksalmon: 'e9967a',
    darkseagreen: '8fbc8f',
    darkslateblue: '483d8b',
    darkslategray: '2f4f4f',
    darkturquoise: '00ced1',
    darkviolet: '9400d3',
    deeppink: 'ff1493',
    deepskyblue: '00bfff',
    dimgray: '696969',
    dodgerblue: '1e90ff',
    feldspar: 'd19275',
    firebrick: 'b22222',
    floralwhite: 'fffaf0',
    forestgreen: '228b22',
    fuchsia: 'ff00ff',
    gainsboro: 'dcdcdc',
    ghostwhite: 'f8f8ff',
    gold: 'ffd700',
    goldenrod: 'daa520',
    gray: '808080',
    green: '008000',
    greenyellow: 'adff2f',
    honeydew: 'f0fff0',
    hotpink: 'ff69b4',
    indianred: 'cd5c5c',
    indigo: '4b0082',
    ivory: 'fffff0',
    khaki: 'f0e68c',
    lavender: 'e6e6fa',
    lavenderblush: 'fff0f5',
    lawngreen: '7cfc00',
    lemonchiffon: 'fffacd',
    lightblue: 'add8e6',
    lightcoral: 'f08080',
    lightcyan: 'e0ffff',
    lightgoldenrodyellow: 'fafad2',
    lightgrey: 'd3d3d3',
    lightgreen: '90ee90',
    lightpink: 'ffb6c1',
    lightsalmon: 'ffa07a',
    lightseagreen: '20b2aa',
    lightskyblue: '87cefa',
    lightslateblue: '8470ff',
    lightslategray: '778899',
    lightsteelblue: 'b0c4de',
    lightyellow: 'ffffe0',
    lime: '00ff00',
    limegreen: '32cd32',
    linen: 'faf0e6',
    magenta: 'ff00ff',
    maroon: '800000',
    mediumaquamarine: '66cdaa',
    mediumblue: '0000cd',
    mediumorchid: 'ba55d3',
    mediumpurple: '9370d8',
    mediumseagreen: '3cb371',
    mediumslateblue: '7b68ee',
    mediumspringgreen: '00fa9a',
    mediumturquoise: '48d1cc',
    mediumvioletred: 'c71585',
    midnightblue: '191970',
    mintcream: 'f5fffa',
    mistyrose: 'ffe4e1',
    moccasin: 'ffe4b5',
    navajowhite: 'ffdead',
    navy: '000080',
    oldlace: 'fdf5e6',
    olive: '808000',
    olivedrab: '6b8e23',
    orange: 'ffa500',
    orangered: 'ff4500',
    orchid: 'da70d6',
    palegoldenrod: 'eee8aa',
    palegreen: '98fb98',
    paleturquoise: 'afeeee',
    palevioletred: 'd87093',
    papayawhip: 'ffefd5',
    peachpuff: 'ffdab9',
    peru: 'cd853f',
    pink: 'ffc0cb',
    plum: 'dda0dd',
    powderblue: 'b0e0e6',
    purple: '800080',
    red: 'ff0000',
    rosybrown: 'bc8f8f',
    royalblue: '4169e1',
    saddlebrown: '8b4513',
    salmon: 'fa8072',
    sandybrown: 'f4a460',
    seagreen: '2e8b57',
    seashell: 'fff5ee',
    sienna: 'a0522d',
    silver: 'c0c0c0',
    skyblue: '87ceeb',
    slateblue: '6a5acd',
    slategray: '708090',
    snow: 'fffafa',
    springgreen: '00ff7f',
    steelblue: '4682b4',
    tan: 'd2b48c',
    teal: '008080',
    thistle: 'd8bfd8',
    tomato: 'ff6347',
    turquoise: '40e0d0',
    violet: 'ee82ee',
    violetred: 'd02090',
    wheat: 'f5deb3',
    white: 'ffffff',
    whitesmoke: 'f5f5f5',
    yellow: 'ffff00',
    yellowgreen: '9acd32'
  }
};

DG.isColorSpecString = DG.ColorUtilities.isColorSpecString;
