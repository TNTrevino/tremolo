import { Directive } from "@angular/core";

/**
 * Port of frontend-react/src/shared/components/ui/label.tsx.
 *
 * An attribute directive so the host stays a native `<label>`: the parity
 * suite reaches every field through `getByLabel(...)`, which needs the
 * real element and its `for` attribute.
 */
@Directive({
	selector: "label[appLabel]",
	host: {
		class:
			"text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
	},
})
export class LabelDirective {}
