import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { PageHeader } from "@/components/page-header";

describe("PageHeader", () => {
  it("renders the title as a heading", () => {
    render(<PageHeader title="Ringkasan" />);
    expect(screen.getByRole("heading", { name: "Ringkasan" })).toBeTruthy();
  });
  it("renders the description when provided", () => {
    render(<PageHeader title="Brand" description="Kelola brand" />);
    expect(screen.getByText("Kelola brand")).toBeTruthy();
  });
  it("renders an actions slot when provided", () => {
    render(<PageHeader title="X" actions={<button>Tambah</button>} />);
    expect(screen.getByRole("button", { name: "Tambah" })).toBeTruthy();
  });
});
