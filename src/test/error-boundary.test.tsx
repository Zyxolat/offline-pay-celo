import "./setup";
import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { RuntimeErrorBoundary } from "../components/ErrorBoundary";

const Bomb = () => {
  throw new Error("Boundary test explosion");
};

describe("RuntimeErrorBoundary", () => {
  it("shows a visible fallback instead of rendering a blank screen", () => {
    const view = render(
      <RuntimeErrorBoundary scope="test" title="Test route failed">
        <Bomb />
      </RuntimeErrorBoundary>,
    );

    expect(view.getByText(/app is running/i)).toBeInTheDocument();
    expect(view.getByText(/boundary test explosion/i)).toBeInTheDocument();
    expect(view.getByText(/test route failed/i)).toBeInTheDocument();
  });
});
