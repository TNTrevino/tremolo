import { Directive } from "@angular/core";

/**
 * Port of frontend-react/src/shared/components/ui/skeleton.tsx: an
 * animated placeholder block. Size and shape come from the caller's own
 * classes, e.g. `<div appSkeleton class="h-24 w-full"></div>`.
 */
@Directive({
	selector: "[appSkeleton]",
	host: { class: "animate-pulse rounded-md bg-muted" },
})
export class SkeletonDirective {}
