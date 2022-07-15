import { renderHook } from "@testing-library/react-hooks";
import { useSampleText } from "./use-sample-text";

const HookWrapper = () => useSampleText();

describe("useSampleText", () => {
  it("returns Hello World", () => {
    const { result } = renderHook(HookWrapper);
    expect(result.current).toEqual("Hello World");
  });
});
