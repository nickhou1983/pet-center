"use client";

import { useRouter } from "next/navigation";
import { useState, type ChangeEvent, type FormEvent } from "react";

import ImageUploader from "@/components/publish/ImageUploader";
import {
  CATEGORY_LABELS,
  GENDER_LABELS,
  SIZE_LABELS,
  SPECIES_LABELS,
} from "@/lib/pet-labels";
import {
  createPetSchema,
  GENDERS,
  MAX_PHOTOS,
  PET_CATEGORIES,
  PET_SIZES,
  SPECIES,
  type PetCategoryValue,
} from "@/lib/pet-schema";

// Publish form (M5). Controlled component that mirrors `createPetSchema`: it
// validates on the client with the same schema the server uses, uploads photos
// via <ImageUploader/> (which POSTs to /api/upload), then submits the record as
// JSON to POST /api/pets. On success it redirects to the new pet's detail page.

type FieldErrors = Record<string, string[] | undefined>;

const INPUT_CLASS =
  "w-full rounded-lg border border-foreground/15 bg-transparent px-3 py-2 text-sm outline-none transition-colors focus:border-foreground/40";

/** Initial values for the free-text / select fields (all controlled strings). */
const INITIAL_FIELDS = {
  species: "",
  size: "",
  gender: "UNKNOWN",
  name: "",
  breed: "",
  color: "",
  age: "",
  region: "",
  description: "",
  contactName: "",
  contactPhone: "",
};

function FieldError({ messages }: { messages?: string[] }) {
  if (!messages || messages.length === 0) return null;
  return <p className="mt-1 text-xs text-red-600">{messages[0]}</p>;
}

function Label({ children, htmlFor }: { children: React.ReactNode; htmlFor?: string }) {
  return (
    <label htmlFor={htmlFor} className="mb-1 block text-sm font-medium text-foreground/80">
      {children}
    </label>
  );
}

export default function PublishForm() {
  const router = useRouter();
  const [category, setCategory] = useState<PetCategoryValue>("REGISTERED");
  const [fields, setFields] = useState(INITIAL_FIELDS);
  const [photos, setPhotos] = useState<string[]>([]);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [banner, setBanner] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const updateField =
    (key: keyof typeof INITIAL_FIELDS) =>
    (event: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setFields((prev) => ({ ...prev, [key]: event.target.value }));

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setBanner(null);
    setErrors({});

    const payload = {
      category,
      species: fields.species,
      size: fields.size || undefined,
      gender: fields.gender || undefined,
      name: fields.name,
      breed: fields.breed,
      color: fields.color,
      age: fields.age,
      region: fields.region,
      description: fields.description,
      contactName: fields.contactName,
      contactPhone: fields.contactPhone,
      photos,
    };

    const parsed = createPetSchema.safeParse(payload);
    if (!parsed.success) {
      setErrors(parsed.error.flatten().fieldErrors);
      setBanner("请检查表单中标红的字段。");
      return;
    }

    setSubmitting(true);
    // The first request may load the ~300MB CLIP model, so allow a generous
    // timeout before giving up.
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 120_000);

    try {
      const response = await fetch("/api/pets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
        signal: controller.signal,
      });
      const result = (await response.json().catch(() => null)) as
        | { id?: string; error?: string; fieldErrors?: FieldErrors }
        | null;

      if (response.status === 201 && result?.id) {
        // Keep the submit button disabled through the redirect. router.push is a
        // client-side navigation, so this form stays mounted until the detail
        // page loads; re-enabling here would let the user fire a duplicate POST.
        router.push(`/pets/${result.id}`);
        return;
      }

      if (response.status === 400 && result?.fieldErrors) {
        setErrors(result.fieldErrors);
        setBanner(result.error ?? "校验失败，请检查表单。");
      } else {
        setBanner(result?.error ?? "发布失败，请稍后重试。");
      }
      // Only re-enable on a failed submission so the user can retry.
      setSubmitting(false);
    } catch (error) {
      const timedOut = error instanceof DOMException && error.name === "AbortError";
      setBanner(
        timedOut
          ? "请求超时，请稍后重试（首次生成向量可能较慢）。"
          : "网络错误，请稍后重试。",
      );
      setSubmitting(false);
    } finally {
      clearTimeout(timer);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {banner ? (
        <p
          role="alert"
          className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-600"
        >
          {banner}
        </p>
      ) : null}

      {/* Category switch */}
      <fieldset>
        <Label>类别</Label>
        <div className="flex flex-wrap gap-2">
          {PET_CATEGORIES.map((value) => {
            const active = category === value;
            return (
              <button
                key={value}
                type="button"
                onClick={() => setCategory(value)}
                aria-pressed={active}
                className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                  active
                    ? "bg-foreground text-background"
                    : "border border-foreground/15 text-foreground/70 hover:border-foreground/30"
                }`}
              >
                {CATEGORY_LABELS[value]}
              </button>
            );
          })}
        </div>
      </fieldset>

      {/* Photos */}
      <fieldset>
        <Label>照片<span className="text-red-600"> *</span></Label>
        <p className="mb-3 text-xs text-foreground/50">
          第一张为主图，用于生成 AI 向量与相似度匹配。至少上传 1 张。
        </p>
        <ImageUploader
          value={photos}
          onChange={setPhotos}
          maxFiles={MAX_PHOTOS}
          disabled={submitting}
        />
        <FieldError messages={errors.photos} />
      </fieldset>

      {/* Attributes */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <div>
          <Label htmlFor="species">物种<span className="text-red-600"> *</span></Label>
          <select
            id="species"
            value={fields.species}
            onChange={updateField("species")}
            className={INPUT_CLASS}
          >
            <option value="">请选择物种</option>
            {SPECIES.map((value) => (
              <option key={value} value={value}>
                {SPECIES_LABELS[value]}
              </option>
            ))}
          </select>
          <FieldError messages={errors.species} />
        </div>

        <div>
          <Label htmlFor="breed">品种</Label>
          <input
            id="breed"
            value={fields.breed}
            onChange={updateField("breed")}
            placeholder="如：金毛、中华田园猫"
            className={INPUT_CLASS}
          />
          <FieldError messages={errors.breed} />
        </div>

        <div>
          <Label htmlFor="color">毛色</Label>
          <input
            id="color"
            value={fields.color}
            onChange={updateField("color")}
            placeholder="如：橘白、黑色"
            className={INPUT_CLASS}
          />
          <FieldError messages={errors.color} />
        </div>

        <div>
          <Label htmlFor="size">体型</Label>
          <select
            id="size"
            value={fields.size}
            onChange={updateField("size")}
            className={INPUT_CLASS}
          >
            <option value="">不限</option>
            {PET_SIZES.map((value) => (
              <option key={value} value={value}>
                {SIZE_LABELS[value]}
              </option>
            ))}
          </select>
          <FieldError messages={errors.size} />
        </div>

        <div>
          <Label htmlFor="gender">性别</Label>
          <select
            id="gender"
            value={fields.gender}
            onChange={updateField("gender")}
            className={INPUT_CLASS}
          >
            {GENDERS.map((value) => (
              <option key={value} value={value}>
                {GENDER_LABELS[value]}
              </option>
            ))}
          </select>
          <FieldError messages={errors.gender} />
        </div>

        <div>
          <Label htmlFor="age">年龄（岁）</Label>
          <input
            id="age"
            type="number"
            min={0}
            max={100}
            value={fields.age}
            onChange={updateField("age")}
            placeholder="如：3"
            className={INPUT_CLASS}
          />
          <FieldError messages={errors.age} />
        </div>

        <div>
          <Label htmlFor="region">地区</Label>
          <input
            id="region"
            value={fields.region}
            onChange={updateField("region")}
            placeholder="如：上海市浦东新区"
            className={INPUT_CLASS}
          />
          <FieldError messages={errors.region} />
        </div>

        <div>
          <Label htmlFor="name">名称</Label>
          <input
            id="name"
            value={fields.name}
            onChange={updateField("name")}
            placeholder="宠物名字（可选）"
            className={INPUT_CLASS}
          />
          <FieldError messages={errors.name} />
        </div>
      </div>

      {/* Description */}
      <div>
        <Label htmlFor="description">描述</Label>
        <textarea
          id="description"
          value={fields.description}
          onChange={updateField("description")}
          rows={4}
          placeholder="补充特征、走失/捡到地点与时间、性格等信息"
          className={INPUT_CLASS}
        />
        <FieldError messages={errors.description} />
      </div>

      {/* Contact */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <div>
          <Label htmlFor="contactName">联系人</Label>
          <input
            id="contactName"
            value={fields.contactName}
            onChange={updateField("contactName")}
            className={INPUT_CLASS}
          />
          <FieldError messages={errors.contactName} />
        </div>

        <div>
          <Label htmlFor="contactPhone">联系电话</Label>
          <input
            id="contactPhone"
            value={fields.contactPhone}
            onChange={updateField("contactPhone")}
            className={INPUT_CLASS}
          />
          <FieldError messages={errors.contactPhone} />
        </div>
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="inline-flex items-center gap-2 rounded-lg bg-foreground px-6 py-3 text-sm font-medium text-background transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {submitting ? (
          <>
            <span
              className="h-4 w-4 animate-spin rounded-full border-2 border-background/40 border-t-background"
              aria-hidden="true"
            />
            发布中…（首次生成向量可能较慢）
          </>
        ) : (
          "发布"
        )}
      </button>
    </form>
  );
}
