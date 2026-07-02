// This file is AI-generated for testing the SearchForm component (M6). Covers
// rendering of the query inputs and filters, the "at least one of photo/description"
// guard (no request fired when empty), a successful description-only search
// (correct endpoint + JSON body, results rendered with score and detail link),
// and that fusion weight sliders only appear when both a photo and text exist.

import type { ReactNode } from "react";

import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import SearchForm from "../search/SearchForm";

// Render next/link as a plain anchor so result cards don't need the App Router
// context provider in the jsdom test environment.
vi.mock("next/link", () => ({
  default: ({ children, href }: { children: ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

function mockSearchResponse() {
  return {
    ok: true,
    status: 200,
    json: async () => ({
      mode: "text",
      weights: { image: 0, text: 1 },
      page: 1,
      pageSize: 20,
      total: 1,
      results: [
        {
          id: "pet-1",
          category: "REGISTERED",
          species: "CAT",
          size: null,
          gender: "UNKNOWN",
          name: "小花",
          breed: null,
          color: null,
          region: null,
          photos: ["/uploads/x.jpg"],
          score: 0.87,
          imageScore: null,
          textScore: 0.87,
        },
      ],
    }),
  };
}

describe("SearchForm", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    global.fetch = vi.fn();
  });

  it("renders the query inputs, attribute filters, and submit button", () => {
    render(<SearchForm />);

    expect(screen.getByLabelText(/描述/)).toBeTruthy();
    expect(screen.getByLabelText(/类别/)).toBeTruthy();
    expect(screen.getByLabelText(/物种/)).toBeTruthy();
    expect(screen.getByLabelText(/体型/)).toBeTruthy();
    expect(screen.getByLabelText(/性别/)).toBeTruthy();
    expect(screen.getByLabelText(/品种/)).toBeTruthy();
    expect(screen.getByLabelText(/毛色/)).toBeTruthy();
    expect(screen.getByLabelText(/地区/)).toBeTruthy();
    expect(screen.getByRole("button", { name: /搜索/ })).toBeTruthy();
  });

  it("defaults the category filter to 备案 (REGISTERED)", () => {
    render(<SearchForm />);
    const category = screen.getByLabelText(/类别/) as HTMLSelectElement;
    expect(category.value).toBe("REGISTERED");
  });

  it("does not show fusion weight sliders without both a photo and text", async () => {
    render(<SearchForm />);
    expect(screen.queryByLabelText(/图像权重/)).toBeNull();

    await userEvent.type(screen.getByLabelText(/描述/), "橘白色的小猫");
    // Text only (no photo) still keeps the sliders hidden.
    expect(screen.queryByLabelText(/图像权重/)).toBeNull();
  });

  it("blocks submitting with neither a photo nor a description", async () => {
    render(<SearchForm />);

    fireEvent.click(screen.getByRole("button", { name: /搜索/ }));

    await waitFor(() => expect(screen.getByRole("alert")).toBeInTheDocument());
    expect(screen.getByRole("alert").textContent).toMatch(/照片|描述/);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("submits a description-only search and renders scored result cards", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      mockSearchResponse(),
    );

    render(<SearchForm />);
    await userEvent.type(screen.getByLabelText(/描述/), "橘白色小猫");
    fireEvent.click(screen.getByRole("button", { name: /搜索/ }));

    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));

    const [url, init] = (global.fetch as ReturnType<typeof vi.fn>).mock
      .calls[0] as [string, RequestInit];
    expect(url).toBe("/api/search");
    expect(init.method).toBe("POST");

    const body = JSON.parse(init.body as string);
    expect(body.description).toBe("橘白色小猫");
    expect(body.photo).toBeUndefined();
    expect(body.page).toBe(1);
    expect(body.pageSize).toBe(20);

    // The result card renders the pet, its score, and a link to the detail page.
    await waitFor(() => expect(screen.getByText("小花")).toBeInTheDocument());
    expect(screen.getAllByText(/87%/).length).toBeGreaterThan(0);
    const link = screen.getByRole("link", { name: /小花/ });
    expect(link).toHaveAttribute("href", "/pets/pet-1");

    // A single-page result set shows no pagination controls.
    expect(screen.queryByRole("button", { name: "下一页" })).toBeNull();
  });
});
