// AI-generated unit tests for components/layout/SiteHeader.tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import SiteHeader from "@/components/layout/SiteHeader";

describe("SiteHeader", () => {
  it("renders the site title with home link", () => {
    render(<SiteHeader />);
    const homeLink = screen.getByRole("link", { name: /pet center/i });
    expect(homeLink).toBeInTheDocument();
    expect(homeLink).toHaveAttribute("href", "/");
  });

  it("renders navigation items", () => {
    render(<SiteHeader />);
    const searchLink = screen.getByRole("link", { name: "智能搜索" });
    const publishLink = screen.getByRole("link", { name: "发布信息" });

    expect(searchLink).toBeInTheDocument();
    expect(searchLink).toHaveAttribute("href", "/search");

    expect(publishLink).toBeInTheDocument();
    expect(publishLink).toHaveAttribute("href", "/publish");
  });

  it("renders navigation with correct ARIA label", () => {
    render(<SiteHeader />);
    const nav = screen.getByRole("navigation", { name: "主导航" });
    expect(nav).toBeInTheDocument();
  });

  it("has sticky header styling", () => {
    const { container } = render(<SiteHeader />);
    const header = container.querySelector("header");
    expect(header).toHaveClass("sticky");
    expect(header).toHaveClass("top-0");
  });

  it("renders all navigation links in correct order", () => {
    render(<SiteHeader />);
    const links = screen.getAllByRole("link");
    
    // First link should be home
    expect(links[0]).toHaveTextContent(/pet center/i);
    expect(links[0]).toHaveAttribute("href", "/");

    // Navigation links
    expect(links[1]).toHaveTextContent("智能搜索");
    expect(links[2]).toHaveTextContent("发布信息");
  });
});
