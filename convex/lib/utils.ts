/**
 * Convert a title string into a URL-friendly slug.
 *
 * - Lowercases the input
 * - Replaces non-alphanumeric runs with a single hyphen
 * - Strips leading/trailing hyphens
 */
export function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
