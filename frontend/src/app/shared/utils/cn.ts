import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Port of frontend-react/src/lib/utils.ts, verbatim.
 *
 * `clsx` flattens conditional class lists; `tailwind-merge` then drops
 * earlier Tailwind utilities that a later one overrides, which is what
 * lets a caller pass `class="h-14"` and win against a variant's `h-10`.
 */
export function cn(...inputs: ClassValue[]): string {
	return twMerge(clsx(inputs));
}
