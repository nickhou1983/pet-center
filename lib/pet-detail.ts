// Presentation helpers for the pet detail page (app/pets/[id]/page.tsx).
// Extracted into an importable module so the logic can be unit-tested directly
// instead of being re-implemented inline in the test file.

export function isPresent(value: string | number | null | undefined): boolean {
  return value !== null && value !== undefined && value !== "";
}

/**
 * Formats a pet's age for display. Returns `${age} 岁` for any concrete number
 * (including 0), or null when the age is absent so callers can omit the row.
 */
export function formatAge(age: number | null | undefined): string | null {
  return age !== null && age !== undefined ? `${age} 岁` : null;
}

/**
 * Builds the detail page title. Uses the pet's name when set; otherwise joins
 * the category and species labels with " · ", skipping any empty labels. Mirrors
 * `pet.name ?? [categoryLabel, speciesLabel].filter(Boolean).join(" · ")`, so an
 * explicit empty-string name intentionally yields an empty title (?? only falls
 * back on null/undefined).
 */
export function buildDetailTitle(
  name: string | null | undefined,
  categoryLabel: string | undefined,
  speciesLabel: string | undefined,
): string {
  return name ?? [categoryLabel, speciesLabel].filter(Boolean).join(" · ");
}
