import React from "react";
import { Text } from "./text";
import { render, screen } from "@testing-library/react";

describe("Text component", () => {
  it("renders provided text", () => {
    render(<Text text="Hello CODAP3!"/>);
    expect(screen.getByText("Hello CODAP3!")).toBeDefined();
  });
});
