// This file is AI-generated for testing the ResultCard component (M6).
// Covers rendering of pet thumbnails, category/species tags, score badges,
// per-modality image/text scores, and links to the pet detail page.

import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import type { ReactNode } from "react";

import ResultCard, { scorePercent, type SearchResult } from "../search/ResultCard";

// Mock next/link to avoid requiring App Router context.
vi.mock("next/link", () => ({
  default: ({ children, href }: { children: ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

const mockResult: SearchResult = {
  id: "pet-123",
  category: "REGISTERED",
  species: "CAT",
  size: "SMALL",
  gender: "FEMALE",
  name: "小花",
  breed: "橘猫",
  color: "橘白色",
  region: "上海",
  photos: ["/uploads/cat1.jpg"],
  score: 0.876,
  imageScore: 0.85,
  textScore: 0.9,
};

describe("scorePercent", () => {
  it("formats a score as a whole-number percentage", () => {
    expect(scorePercent(0.876)).toBe("88%");
    expect(scorePercent(0.5)).toBe("50%");
    expect(scorePercent(0.123)).toBe("12%");
    expect(scorePercent(0.999)).toBe("100%");
  });

  it("rounds down with < 0.5", () => {
    expect(scorePercent(0.124)).toBe("12%");
  });

  it("rounds up with >= 0.5", () => {
    expect(scorePercent(0.125)).toBe("13%");
  });
});

describe("ResultCard", () => {
  it("renders the pet thumbnail with cover image", () => {
    render(<ResultCard result={mockResult} />);
    const img = screen.getByAltText(/小花.*照片/);
    expect(img).toHaveAttribute("src", "/uploads/cat1.jpg");
  });

  it("displays the main score badge with percentage", () => {
    render(<ResultCard result={mockResult} />);
    expect(screen.getByText(/匹配.*88%/)).toBeInTheDocument();
  });

  it("shows category and species labels as tags", () => {
    render(<ResultCard result={mockResult} />);
    expect(screen.getByText("备案")).toBeInTheDocument(); // Category label
    expect(screen.getByText("猫")).toBeInTheDocument(); // Species label
  });

  it("displays the pet name as the title", () => {
    render(<ResultCard result={mockResult} />);
    expect(screen.getByRole("link")).toHaveTextContent("小花");
  });

  it("shows metadata (breed, color, size, region) in the footer", () => {
    render(<ResultCard result={mockResult} />);
    expect(screen.getByText(/橘猫.*橘白色.*小体型.*上海/)).toBeInTheDocument();
  });

  it("uses category+species label as fallback when name is null", () => {
    const resultNoName: SearchResult = {
      ...mockResult,
      name: null,
    };
    render(<ResultCard result={resultNoName} />);
    expect(screen.getByRole("link")).toHaveTextContent("备案 · 猫");
  });

  it("links to the pet's detail page", () => {
    render(<ResultCard result={mockResult} />);
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "/pets/pet-123");
  });

  it("displays per-modality scores for fusion queries", () => {
    render(<ResultCard result={mockResult} />);
    expect(screen.getByText(/图搜.*85%/)).toBeInTheDocument();
    expect(screen.getByText(/文搜.*90%/)).toBeInTheDocument();
  });

  it("hides per-modality scores when both are null (single-modality search)", () => {
    const resultNoScores: SearchResult = {
      ...mockResult,
      imageScore: null,
      textScore: null,
    };
    render(<ResultCard result={resultNoScores} />);
    expect(screen.queryByText(/图搜/)).not.toBeInTheDocument();
    expect(screen.queryByText(/文搜/)).not.toBeInTheDocument();
  });

  it("shows only image score when text score is null", () => {
    const resultImageOnly: SearchResult = {
      ...mockResult,
      textScore: null,
    };
    render(<ResultCard result={resultImageOnly} />);
    expect(screen.getByText(/图搜.*85%/)).toBeInTheDocument();
    expect(screen.queryByText(/文搜/)).not.toBeInTheDocument();
  });

  it("shows a placeholder when photos array is empty", () => {
    const resultNoPhotos: SearchResult = {
      ...mockResult,
      photos: [],
    };
    render(<ResultCard result={resultNoPhotos} />);
    expect(screen.getByText("暂无照片")).toBeInTheDocument();
  });

  it("filters out empty metadata fields (null or falsy)", () => {
    const resultPartialMeta: SearchResult = {
      ...mockResult,
      breed: null,
      color: "",
      region: null,
    };
    render(<ResultCard result={resultPartialMeta} />);
    // Only size should be shown since others are null/empty.
    expect(screen.getByText(/小体型/)).toBeInTheDocument();
    expect(screen.queryByText("橘猫")).not.toBeInTheDocument();
  });
});
