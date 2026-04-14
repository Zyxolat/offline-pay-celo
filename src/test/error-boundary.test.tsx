import "./setup";
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { RuntimeErrorBoundary } from "../components/ErrorBoundary";

const Bomb = () => {
  throw new Error("Boundary test explosion");
};

describe("RuntimeErrorBoundary", () => {
  it("shows a visible fallback instead of rendering a blank screen", () => {
    render(
      <RuntimeErrorBoundary scope="test" title="Test route failed">
        <Bomb />
      </RuntimeErrorBoundary>,
    );

    expect(screen.getByText(/app is running/i)).toBeInTheDocument();
    expect(screen.getByText(/boundary test explosion/i)).toBeInTheDocument();
    expect(screen.getByText(/test route failed/i)).toBeInTheDocument();
  });
});
