import { types } from "mobx-state-tree";

type SpecialNumbers = "NaN" | "Infinity" | "-Infinity";

/**
 * This custom MST type handles NaN, Infinity, and -Infinity better than the built in
 * `type.number`
 * When NaN, Infinity, or -Infinity are stored in a `types.number` field,
 * JSON.stringify(getSnapshot(obj)) will turn these values into `null`.
 * This custom type turns those values into strings so they can be stored JSON.
 *
 * The typescript typing will only allow you to pass a number or "NaN", "Infinity", or "-Infinity"
 * as a value in a snapshot. However at runtime stringified numbers will be handled too.
 * Additionally if the value is null at runtime this will be turned in NaN.
 */
export const JsonNumber = types.custom<SpecialNumbers | number, number>({
  name: "StringifiedNumber",
  fromSnapshot(snapshot: SpecialNumbers | number, env?: any): number {
    // Handle legacy values. In some cases a user might want to customize
    // how null is handled. By default `Number(null)` returns 0
    // If you want null to be invalid, change getValidationMessage
    if (snapshot === null) {
      return NaN;
    }
    return Number(snapshot);
  },
  toSnapshot(value: number): SpecialNumbers | number {
    if (!isFinite(value)) {
      return value.toString() as SpecialNumbers;
    }
    return value;
  },
  isTargetType(value: string | number): boolean {
    return typeof value === "number";
  },
  getValidationMessage(snapshot: number | string): string {
    const parsed = Number(snapshot);
    if (isNaN(parsed) && snapshot !== "NaN") {
      return `'${snapshot}' can't be parsed as a number`;
    } else {
      return "";
    }
  }
});
