import "@tanstack/query-core";

declare module "@tanstack/query-core" {
	interface Register {
		queryMeta: {
			suppressErrorToast?: boolean;
			errorTitle?: string;
		};
		mutationMeta: {
			suppressErrorToast?: boolean;
			errorTitle?: string;
		};
	}
}
