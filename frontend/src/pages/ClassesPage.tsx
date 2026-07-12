import { MyClassesView } from "@/features/classes/components/MyClassesView";

export function ClassesPage() {
	return (
		<div className="min-h-screen py-8 px-4">
			<div className="container mx-auto max-w-6xl">
				<MyClassesView />
			</div>
		</div>
	);
}
