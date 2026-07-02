// This file is AI-generated for testing the ImageUploader component (M5).
// It exercises the failure-prone branches of handleSelectFiles — the async
// /api/upload fetch, non-201 error handling, empty/unusable URL filtering, and
// remainingSlots slicing/limit math — plus the set-primary/remove reordering.

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import ImageUploader from "../publish/ImageUploader";

const makeFile = (name = "photo.png") =>
  new File(["data"], name, { type: "image/png" });

const getFileInput = (container: HTMLElement) =>
  container.querySelector('input[type="file"]') as HTMLInputElement;

const jsonResponse = (status: number, payload: unknown) => ({
  status,
  json: async () => payload,
});

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe("ImageUploader", () => {
  describe("success path", () => {
    it("uploads selected files and appends returned URLs via onChange", async () => {
      const onChange = vi.fn();
      fetchMock.mockResolvedValueOnce(
        jsonResponse(201, { files: [{ url: "https://cdn/a.png" }] }),
      );

      const { container } = render(
        <ImageUploader value={[]} onChange={onChange} />,
      );
      fireEvent.change(getFileInput(container), {
        target: { files: [makeFile()] },
      });

      await waitFor(() =>
        expect(onChange).toHaveBeenCalledWith(["https://cdn/a.png"]),
      );

      const [url, init] = fetchMock.mock.calls[0];
      expect(url).toBe("/api/upload");
      expect(init.method).toBe("POST");
      expect(init.body).toBeInstanceOf(FormData);
    });

    it("appends new URLs after existing ones instead of replacing them", async () => {
      const onChange = vi.fn();
      fetchMock.mockResolvedValueOnce(
        jsonResponse(201, { files: [{ url: "https://cdn/b.png" }] }),
      );

      const { container } = render(
        <ImageUploader value={["https://cdn/existing.png"]} onChange={onChange} />,
      );
      fireEvent.change(getFileInput(container), {
        target: { files: [makeFile()] },
      });

      await waitFor(() =>
        expect(onChange).toHaveBeenCalledWith([
          "https://cdn/existing.png",
          "https://cdn/b.png",
        ]),
      );
    });

    it("shows the spinning 上传中… state while the request is in flight", async () => {
      const onChange = vi.fn();
      let resolveFetch: (value: unknown) => void = () => {};
      fetchMock.mockReturnValueOnce(
        new Promise((resolve) => {
          resolveFetch = resolve;
        }),
      );

      const { container } = render(
        <ImageUploader value={[]} onChange={onChange} />,
      );
      fireEvent.change(getFileInput(container), {
        target: { files: [makeFile()] },
      });

      await waitFor(() =>
        expect(screen.getByRole("button", { name: /上传中/ })).toBeTruthy(),
      );

      resolveFetch(jsonResponse(201, { files: [{ url: "https://cdn/x.png" }] }));
      await waitFor(() => expect(onChange).toHaveBeenCalled());
    });
  });

  describe("non-201 error handling", () => {
    it("surfaces the server-provided error message and does not call onChange", async () => {
      const onChange = vi.fn();
      fetchMock.mockResolvedValueOnce(
        jsonResponse(400, { error: "文件太大，请压缩后重试。" }),
      );

      const { container } = render(
        <ImageUploader value={[]} onChange={onChange} />,
      );
      fireEvent.change(getFileInput(container), {
        target: { files: [makeFile()] },
      });

      await waitFor(() =>
        expect(screen.getByRole("alert").textContent).toContain(
          "文件太大，请压缩后重试。",
        ),
      );
      expect(onChange).not.toHaveBeenCalled();
    });

    it("falls back to the default message when the error body is unusable", async () => {
      const onChange = vi.fn();
      fetchMock.mockResolvedValueOnce({
        status: 500,
        json: async () => {
          throw new Error("invalid json");
        },
      });

      const { container } = render(
        <ImageUploader value={[]} onChange={onChange} />,
      );
      fireEvent.change(getFileInput(container), {
        target: { files: [makeFile()] },
      });

      await waitFor(() =>
        expect(screen.getByRole("alert").textContent).toContain(
          "图片上传失败，请稍后重试。",
        ),
      );
      expect(onChange).not.toHaveBeenCalled();
    });
  });

  describe("empty / unusable URL handling", () => {
    it("warns when a 201 response contains no files", async () => {
      const onChange = vi.fn();
      fetchMock.mockResolvedValueOnce(jsonResponse(201, { files: [] }));

      const { container } = render(
        <ImageUploader value={[]} onChange={onChange} />,
      );
      fireEvent.change(getFileInput(container), {
        target: { files: [makeFile()] },
      });

      await waitFor(() =>
        expect(screen.getByRole("alert").textContent).toContain(
          "未收到可用的图片地址",
        ),
      );
      expect(onChange).not.toHaveBeenCalled();
    });

    it("filters out non-string URLs and warns when nothing usable remains", async () => {
      const onChange = vi.fn();
      fetchMock.mockResolvedValueOnce(
        jsonResponse(201, { files: [{ url: 123 }, { filename: "no-url.png" }] }),
      );

      const { container } = render(
        <ImageUploader value={[]} onChange={onChange} />,
      );
      fireEvent.change(getFileInput(container), {
        target: { files: [makeFile()] },
      });

      await waitFor(() =>
        expect(screen.getByRole("alert").textContent).toContain(
          "未收到可用的图片地址",
        ),
      );
      expect(onChange).not.toHaveBeenCalled();
    });
  });

  describe("remainingSlots / limit math", () => {
    it("slices to the remaining slots and notes that extras were ignored", async () => {
      const onChange = vi.fn();
      const existing = Array.from({ length: 8 }, (_, i) => `e${i}.png`);
      fetchMock.mockResolvedValueOnce(
        jsonResponse(201, {
          files: [{ url: "n1.png" }, { url: "n2.png" }],
        }),
      );

      const { container } = render(
        <ImageUploader value={existing} onChange={onChange} maxFiles={10} />,
      );
      fireEvent.change(getFileInput(container), {
        target: { files: [makeFile("1"), makeFile("2"), makeFile("3")] },
      });

      await waitFor(() =>
        expect(onChange).toHaveBeenCalledWith([...existing, "n1.png", "n2.png"]),
      );
      // Only the 2 remaining slots' worth of files were sent, not all 3.
      const body = fetchMock.mock.calls[0][1].body as FormData;
      expect(body.getAll("files")).toHaveLength(2);
      expect(screen.getByText(/已自动忽略多余图片/)).toBeTruthy();
    });

    it("disables uploading once the gallery is full", () => {
      const onChange = vi.fn();
      const full = Array.from({ length: 10 }, (_, i) => `f${i}.png`);

      const { container } = render(
        <ImageUploader value={full} onChange={onChange} maxFiles={10} />,
      );

      expect(screen.getByRole("button", { name: /上传图片/ })).toBeDisabled();
      expect(getFileInput(container)).toBeDisabled();
      expect(screen.getByText(/已上传 10\/10 张/)).toBeTruthy();
    });
  });

  describe("network / early-return branches", () => {
    it("shows a network error when the request rejects", async () => {
      const onChange = vi.fn();
      fetchMock.mockRejectedValueOnce(new Error("network down"));

      const { container } = render(
        <ImageUploader value={[]} onChange={onChange} />,
      );
      fireEvent.change(getFileInput(container), {
        target: { files: [makeFile()] },
      });

      await waitFor(() =>
        expect(screen.getByRole("alert").textContent).toContain(
          "网络异常，图片上传失败",
        ),
      );
      expect(onChange).not.toHaveBeenCalled();
    });

    it("does nothing when no files are selected", () => {
      const onChange = vi.fn();
      const { container } = render(
        <ImageUploader value={[]} onChange={onChange} />,
      );
      fireEvent.change(getFileInput(container), { target: { files: [] } });

      expect(fetchMock).not.toHaveBeenCalled();
      expect(onChange).not.toHaveBeenCalled();
      expect(screen.queryByRole("alert")).toBeNull();
    });
  });

  describe("gallery reordering", () => {
    it("removes the selected image via onChange", () => {
      const onChange = vi.fn();
      render(
        <ImageUploader value={["a.png", "b.png", "c.png"]} onChange={onChange} />,
      );

      fireEvent.click(screen.getByLabelText("移除宠物照片 2"));
      expect(onChange).toHaveBeenCalledWith(["a.png", "c.png"]);
    });

    it("promotes a non-primary image to the front when 设为主图 is clicked", () => {
      const onChange = vi.fn();
      render(
        <ImageUploader value={["a.png", "b.png", "c.png"]} onChange={onChange} />,
      );

      // Index 0 shows the primary badge; buttons exist for index 1 and 2.
      const promoteButtons = screen.getAllByRole("button", { name: "设为主图" });
      fireEvent.click(promoteButtons[1]); // promotes "c.png"
      expect(onChange).toHaveBeenCalledWith(["c.png", "a.png", "b.png"]);
    });
  });
});
