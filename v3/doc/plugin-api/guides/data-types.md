# Data types

> **Applies to:** CODAP v3 · **Verified:** 2026-11-10

A plugin doesn't have to declare what kind of data it sends. Values go to CODAP as JavaScript
numbers or strings, and CODAP works out from the values themselves whether an attribute holds
numbers, dates, colors or categories. That decision controls how the attribute is graphed,
summarized and shown in the table. This chapter covers how CODAP makes it, which values count as
each type, and how an explicit `type` on the attribute overrides it.

## How CODAP decides an attribute's type

An attribute with no explicit `type` gets one from its current values. Empty values are ignored,
and the first rule that fits wins:

| Type | When |
|---|---|
| `numeric` | every value is a [number](#numbers) |
| `date` | every value is a [date](#dates) |
| `color` | every value is a [color](#colors) |
| `boundary` | every value is a map boundary, or the attribute's title is `boundary`, `boundaries`, `polygon` or `polygons` |
| `categorical` | anything else |

The decision is made again whenever the values change, so one non-numeric value added to a numeric
attribute makes it categorical, and removing it makes the attribute numeric again. An attribute
with no cases has no type yet, and one whose values are all empty is categorical.

The values themselves are kept as you sent them: deciding that an attribute is numeric doesn't
change the text of its values, and you can change the type without losing anything. See
[Known limitations](#known-limitations) for what `get` returns.

## Numbers

A number can be sent as a JavaScript number or as text. Text counts as a number when JavaScript's
`Number()` reads it as a finite number, after surrounding spaces are removed:

| Counts as a number | Doesn't |
|---|---|
| `12`, `"12"`, `"-3.5"`, `".5"`, `"+5"` | `"1,000"`, `"1,5"` — commas are neither thousands separators nor decimal points |
| `"1e3"` (1000) | `"$12"`, `"12 kg"` — text around the number |
| `"0x1F"` (31, read as hexadecimal) | `"Infinity"`, `"NaN"` |
| | `true`, `false` |

A period is always a decimal point. To have CODAP read numbers that are written with other text,
such as currency symbols or units, give the attribute the explicit type `numeric`; see
[An explicit type](#an-explicit-type).

A four-digit number such as `2016` is a number, not a date.

## Dates

Dates are sent as text. CODAP recognizes these forms, where a time is `h`, `h:mm`, `h:mm:ss` or
`h:mm:ss.sss` and may be followed by `AM` or `PM` (without them it is a 24-hour time):

| Form | Examples |
|---|---|
| ISO year and month, or date, with an optional time after `T` or a space | `2016-05`, `2016-05-22`, `2016-05-22 10:30`, `2016-05-22T10:30:00.000` |
| US month/day/year, two- or four-digit year, with an optional time | `5/22/2016`, `05/22/16`, `5/22/2016 3:15 PM`, `5/22/2016, 15:15` |
| Day, month name, year, with an optional time | `22 May 2016`, `22 May, 2016`, `22 Sep. 2016 10:30 pm` |
| Month name, optional day, year, optionally after the day of the week | `May 22, 2016`, `May 2016`, `Sunday, May 22, 2016` |
| The strings JavaScript's `Date` produces | `Sun May 22 2016 10:30:00 GMT-0400 (Eastern Daylight Time)`, `Sun, 22 May 2016 14:30:00 GMT` |
| The Unix `date` command's output | `Tue Jul  9 18:16:04 PDT 2019` |

Month names may be full or three-letter abbreviations, with or without a period, in any
capitalization. They are read in the language CODAP started in.

A two-digit year is in the 2000s if it is below 49 (`5/22/48` is 2048) and in the 1900s otherwise
(`5/22/49` is 1949); see [Known limitations](#known-limitations).

These are not dates: a time alone (`10:30`), a year alone (`2016`, which is a number), a day and
month name joined with hyphens (`22-May-2016`), and year-first dates with slashes, periods or
one-digit parts (`2016/05/22`, `2016.05.22`, `2016-5-22`).

### Time zones

A time is read in the user's time zone. An explicit numeric offset after the time is applied:
`-07:00` or `+0530`, or `GMT-0400` in a JavaScript `Date` string. `Z`, `GMT` alone and zone
abbreviations such as `PDT` are ignored, so `2016-05-22T10:30:00Z` is 10:30 in the user's time
zone, not 10:30 UTC. Offsets outside −12:00 to +14:00 are ignored too.

To send a moment in time unambiguously, send it with a numeric offset.

## Booleans

`true` and `false`, whether sent as booleans or as text, are categories like any other text: an
attribute holding them is `categorical`. See [Known limitations](#known-limitations) for what
reading one back returns.

## Colors

Text is a color when it is written in CSS color syntax:

- hexadecimal: `#ff0000`, and the short and alpha forms `#f00`, `#f00c` and `#ff0000cc`
- `rgb(255, 0, 0)` and `rgba(255, 0, 0, 0.5)`, including percentages and the space-separated
  form `rgb(255 0 0 / 50%)`
- `hsl(0, 100%, 50%)` and `hsla(0, 100%, 50%, 0.5)`

Letters may be upper or lower case. Color names such as `red` are not colors for this purpose; an
attribute holding them is categorical.

## An explicit type

Give an attribute a `type` when inference would get it wrong — zip codes that should be
categories rather than numbers, say. Set it with `create` or `update` on
[`attribute`](../resources/attribute.md#what-create-and-update-accept), which also lists the type
names each action accepts. An explicit type replaces inference completely and stays until it is
changed, whatever values are added later.

What changes with each type:

- **`numeric`**: CODAP reads a number out of text that isn't one. It takes the first number in
  the text, so `"$12.50"` is 12.5 and `"12 kg"` is 12. Commas are thousands separators
  (`"1,234"` is 1234), except where a comma can only be a decimal point (`"0,5"` and
  `"38,7223"`), or follows period-grouped thousands (`"1.234,56"` is 1234.56). Text with no number
  in it is treated as missing.
- **`categorical`**: numbers are treated as categories, so a graph shows one group per distinct
  value instead of a numeric axis.
- **`date`**: values are read as [dates](#dates).

`get` on `attribute` returns the explicit type when there is one, and `null` for an attribute
whose type is inferred; see [Known limitations](#known-limitations).

## Compared with v2

These are improvements on v2 that a plugin written for it could notice:

- **Colors are recognized in more forms.** v2 recognized only `rgb()`, `rgba()` with whole
  numbers, and six-digit hexadecimal (`#ff0000`). v2 also treated an attribute as colors when
  any of its values was a color and they weren't all numbers or dates; an attribute is now
  `color` only when all of its values are colors.
- **Numeric time zone offsets are applied.** v2 ignored every time zone in a date.
- **Decimal commas with the `numeric` type:** v2 removed the comma, so `"0,5"` was 5.

## Known limitations

**`get` on `attribute` returns the inferred type.** For an attribute with no explicit `type`,
`type` in the result is the type CODAP inferred, such as `numeric`, rather than `null`, so a
plugin can't tell an inferred type from one that was set. This is a known bug.

**A two-digit year of `49` is 2049, not 1949.** The years 2000–2048 and 1950–1999 are read as
described above. This is a known bug.

**A number sent as text reads back as a number.** CODAP keeps the text, but `get` on cases and
items, and searches, return the number it reads: an item created with `"12"` reads back as `12`,
`"0x1F"` as `31` and `"1e3"` as `1000`, and with the `numeric` type `"$12.50"` reads back as
`12.5`. v2 returned each value exactly as it was sent. This is a known bug.

**A boolean is stored as text.** A value sent as `true` reads back as the text `"true"`, and
searches compare it as text; see [`item`](../resources/item-by-id.md#known-limitations) and
[`caseSearch`](../resources/case-search.md#known-limitations). v2 kept the boolean. This is a known
bug.

## See also

- [`attribute`](../resources/attribute.md) for setting `type`, `precision` and the other
  attribute properties.
- [Terminology](../README.md#terminology) for attributes, cases and items.
