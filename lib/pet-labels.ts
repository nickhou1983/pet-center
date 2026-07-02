import type {
  GenderValue,
  PetCategoryValue,
  PetSizeValue,
  SpeciesValue,
} from "./pet-schema";

// Chinese display labels for the Pet enums. Shared by the publish form and the
// detail page so the two never diverge. Client-safe (only depends on the enum
// value types from pet-schema).

export const CATEGORY_LABELS: Record<PetCategoryValue, string> = {
  REGISTERED: "备案",
  LOST: "走失",
  FOUND: "捡到",
  ADOPTION: "领养",
};

export const SPECIES_LABELS: Record<SpeciesValue, string> = {
  DOG: "狗",
  CAT: "猫",
  OTHER: "其他",
};

export const SIZE_LABELS: Record<PetSizeValue, string> = {
  SMALL: "小型",
  MEDIUM: "中型",
  LARGE: "大型",
};

export const GENDER_LABELS: Record<GenderValue, string> = {
  MALE: "雄性",
  FEMALE: "雌性",
  UNKNOWN: "未知",
};

/** Status values mirror the Prisma `PetStatus` enum. */
export const STATUS_LABELS: Record<string, string> = {
  ACTIVE: "进行中",
  RESOLVED: "已解决",
  ARCHIVED: "已归档",
};
