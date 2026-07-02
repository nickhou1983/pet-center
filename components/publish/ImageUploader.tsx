"use client";

/* eslint-disable @next/next/no-img-element */
import { useRef, useState, type ChangeEvent } from "react";

export interface ImageUploaderProps {
  value: string[];
  onChange: (urls: string[]) => void;
  maxFiles?: number;
  disabled?: boolean;
}

interface UploadedFile {
  url: string;
  filename: string;
  size: number;
  type: string;
}

interface UploadResponse {
  files?: UploadedFile[];
  error?: string;
}

const ACCEPTED_IMAGE_TYPES = "image/jpeg,image/png,image/webp";

function readUploadError(data: unknown) {
  if (
    data &&
    typeof data === "object" &&
    "error" in data &&
    typeof data.error === "string"
  ) {
    return data.error;
  }

  return "图片上传失败，请稍后重试。";
}

export default function ImageUploader({
  value,
  onChange,
  maxFiles = 10,
  disabled = false,
}: ImageUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");

  const remainingSlots = Math.max(maxFiles - value.length, 0);
  const uploadDisabled = disabled || uploading || remainingSlots === 0;

  const resetInput = () => {
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  };

  const handleSelectFiles = async (event: ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files ?? []);

    setError("");
    setNote("");

    if (selectedFiles.length === 0) {
      resetInput();
      return;
    }

    if (remainingSlots === 0) {
      setError(`最多只能上传 ${maxFiles} 张图片。`);
      resetInput();
      return;
    }

    const filesToUpload = selectedFiles.slice(0, remainingSlots);

    if (selectedFiles.length > remainingSlots) {
      setNote(`最多还能上传 ${remainingSlots} 张，已自动忽略多余图片。`);
    }

    const formData = new FormData();
    filesToUpload.forEach((file) => {
      formData.append("files", file);
    });

    setUploading(true);

    try {
      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      const data = (await response.json().catch(() => null)) as
        | UploadResponse
        | null;

      if (response.status !== 201) {
        setError(readUploadError(data));
        return;
      }

      const uploadedUrls =
        data?.files
          ?.map((file) => file.url)
          .filter((url): url is string => typeof url === "string") ?? [];

      if (uploadedUrls.length === 0) {
        setError("图片上传成功，但未收到可用的图片地址。");
        return;
      }

      onChange([...value, ...uploadedUrls]);
    } catch {
      setError("网络异常，图片上传失败，请稍后重试。");
    } finally {
      setUploading(false);
      resetInput();
    }
  };

  const handleRemove = (indexToRemove: number) => {
    onChange(value.filter((_, index) => index !== indexToRemove));
  };

  const handleSetPrimary = (indexToPromote: number) => {
    const selectedUrl = value[indexToPromote];
    onChange([
      selectedUrl,
      ...value.filter((_, index) => index !== indexToPromote),
    ]);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploadDisabled}
          className="inline-flex items-center gap-2 rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {uploading ? (
            <>
              <span
                className="h-4 w-4 animate-spin rounded-full border-2 border-background/40 border-t-background"
                aria-hidden="true"
              />
              上传中…
            </>
          ) : (
            "上传图片"
          )}
        </button>

        <span className="text-xs text-foreground/60">
          已上传 {value.length}/{maxFiles} 张
        </span>

        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED_IMAGE_TYPES}
          multiple
          disabled={uploadDisabled}
          onChange={handleSelectFiles}
          className="hidden"
        />
      </div>

      {note ? (
        <p className="rounded-lg border border-foreground/10 bg-foreground/5 px-3 py-2 text-sm text-foreground/70">
          {note}
        </p>
      ) : null}

      {error ? (
        <p role="alert" className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-600">
          {error}
        </p>
      ) : null}

      {value.length > 0 ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {value.map((url, index) => (
            <div
              key={`${url}-${index}`}
              className="group relative overflow-hidden rounded-xl border border-foreground/10 bg-foreground/5"
            >
              <img
                src={url}
                alt={`宠物照片 ${index + 1}`}
                className="aspect-square w-full object-cover"
              />

              {index === 0 ? (
                <span className="absolute left-2 top-2 rounded-full bg-foreground px-2 py-1 text-xs font-medium text-background">
                  主图
                </span>
              ) : null}

              <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 bg-background/90 p-2 opacity-100 backdrop-blur sm:opacity-0 sm:transition-opacity sm:group-hover:opacity-100">
                {index === 0 ? (
                  <span className="text-xs text-foreground/60">AI 匹配主图</span>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleSetPrimary(index)}
                    disabled={disabled || uploading}
                    className="rounded-md border border-foreground/10 px-2 py-1 text-xs font-medium text-foreground transition-colors hover:bg-foreground hover:text-background disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    设为主图
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => handleRemove(index)}
                  disabled={disabled || uploading}
                  aria-label={`移除宠物照片 ${index + 1}`}
                  className="rounded-full bg-foreground px-2 py-1 text-xs font-medium text-background transition-opacity hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
