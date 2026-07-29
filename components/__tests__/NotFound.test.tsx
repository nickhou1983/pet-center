// AI-generated unit tests for app/not-found.tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import NotFound from "@/app/not-found";

describe("NotFound (404 page)", () => {
  it("displays the 404 error code", () => {
    render(<NotFound />);
    expect(screen.getByText("404")).toBeInTheDocument();
  });

  it("displays the error title in Chinese", () => {
    render(<NotFound />);
    const title = screen.getByRole("heading", { level: 1 });
    expect(title).toHaveTextContent("没有找到这个页面");
  });

  it("displays helpful error message", () => {
    render(<NotFound />);
    const message = screen.getByText(/这条宠物信息可能已删除/i);
    expect(message).toBeInTheDocument();
    expect(message).toHaveTextContent("你可以返回首页重新搜索或发布信息");
  });

  it("renders a link to return to homepage", () => {
    render(<NotFound />);
    const homeLink = screen.getByRole("link", { name: "返回首页" });
    expect(homeLink).toBeInTheDocument();
    expect(homeLink).toHaveAttribute("href", "/");
  });

  it("uses semantic HTML with main and section elements", () => {
    const { container } = render(<NotFound />);
    const main = container.querySelector("main");
    const section = container.querySelector("section");
    
    expect(main).toBeInTheDocument();
    expect(section).toBeInTheDocument();
  });

  it("has centered layout styling", () => {
    const { container } = render(<NotFound />);
    const main = container.querySelector("main");
    expect(main).toHaveClass("flex");
    expect(main).toHaveClass("items-center");
    expect(main).toHaveClass("justify-center");
  });
});
