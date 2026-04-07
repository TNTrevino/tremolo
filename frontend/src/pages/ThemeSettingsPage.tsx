import { useState } from "react";
import { Palette, Plus, Pencil, Trash2, Copy } from "lucide-react";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
	CardDescription,
} from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { ThemePresetCard } from "@/features/color-scheme/components/ThemePresetCard";
import { ThemeEditor } from "@/features/color-scheme/components/ThemeEditor";
import { ThemePreview } from "@/features/color-scheme/components/ThemePreview";
import {
	useColorSchemes,
	useCreateColorScheme,
	useUpdateColorScheme,
	useDeleteColorScheme,
	useSetActiveScheme,
} from "@/shared/hooks/queries/useColorSchemeQuery";
import { useColorSchemeStore } from "@/stores/colorScheme.store";
import type {
	ColorSchemeColors,
	ColorSchemeResponse,
} from "@/services/api/types";
import { useToast } from "@/shared/hooks/useToast";

type EditorMode = "hidden" | "create" | "edit";

export function ThemeSettingsPage() {
	const { data: schemes = [], isLoading: schemesLoading } = useColorSchemes();
	const createMutation = useCreateColorScheme();
	const updateMutation = useUpdateColorScheme();
	const deleteMutation = useDeleteColorScheme();
	const setActiveMutation = useSetActiveScheme();
	const { activeScheme } = useColorSchemeStore();
	const { showSuccess, showError } = useToast();

	const [editorMode, setEditorMode] = useState<EditorMode>("hidden");
	const [editingScheme, setEditingScheme] =
		useState<ColorSchemeResponse | null>(null);
	const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

	const presetSchemes = schemes.filter((s) => s.is_preset);
	const customSchemes = schemes.filter((s) => !s.is_preset);

	const handleActivate = (schemeId: number) => {
		setActiveMutation.mutate(
			{ scheme_id: schemeId },
			{
				onSuccess: () => showSuccess("Theme activated"),
				onError: () => showError("Failed to activate theme"),
			},
		);
	};

	const handleCreate = (
		name: string,
		isDark: boolean,
		colors: ColorSchemeColors,
	) => {
		createMutation.mutate(
			{ name, is_dark: isDark, colors },
			{
				onSuccess: () => {
					showSuccess("Theme created");
					setEditorMode("hidden");
					setEditingScheme(null);
				},
				onError: () => showError("Failed to create theme"),
			},
		);
	};

	const handleUpdate = (
		name: string,
		isDark: boolean,
		colors: ColorSchemeColors,
	) => {
		if (!editingScheme) return;
		updateMutation.mutate(
			{ id: editingScheme.id, req: { name, is_dark: isDark, colors } },
			{
				onSuccess: () => {
					showSuccess("Theme updated");
					setEditorMode("hidden");
					setEditingScheme(null);
				},
				onError: () => showError("Failed to update theme"),
			},
		);
	};

	const handleDelete = (id: number) => {
		deleteMutation.mutate(id, {
			onSuccess: () => {
				showSuccess("Theme deleted");
				setDeleteConfirmId(null);
			},
			onError: () => showError("Failed to delete theme"),
		});
	};

	const handleEdit = (scheme: ColorSchemeResponse) => {
		setEditingScheme(scheme);
		setEditorMode("edit");
	};

	const handleDuplicate = (scheme: ColorSchemeResponse) => {
		setEditingScheme({
			...scheme,
			name: `Copy of ${scheme.name}`,
			id: 0,
		});
		setEditorMode("create");
	};

	const handleCancel = () => {
		setEditorMode("hidden");
		setEditingScheme(null);
	};

	return (
		<div className="min-h-screen py-8 px-4">
			<div className="container mx-auto max-w-4xl space-y-6">
				{/* Title */}
				<div className="text-center space-y-2">
					<h1 className="text-4xl font-bold">Theme Settings</h1>
					<p className="text-muted-foreground text-lg">
						Customize the look and feel of your workspace
					</p>
				</div>

				{/* Preset Themes */}
				<Card className="shadow-lg">
					<CardHeader>
						<div className="flex items-center gap-3">
							<div className="rounded-lg bg-primary/10 p-2">
								<Palette className="h-6 w-6 text-primary" />
							</div>
							<div>
								<CardTitle>Preset Themes</CardTitle>
								<CardDescription>
									Choose from built-in light and dark themes
								</CardDescription>
							</div>
						</div>
					</CardHeader>
					<CardContent>
						{schemesLoading ? (
							<p className="text-sm text-muted-foreground">Loading themes...</p>
						) : presetSchemes.length === 0 ? (
							<p className="text-sm text-muted-foreground">
								No preset themes available.
							</p>
						) : (
							<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
								{presetSchemes.map((scheme) => (
									<ThemePresetCard
										key={scheme.id}
										scheme={scheme}
										isActive={activeScheme?.id === scheme.id}
										onActivate={() => handleActivate(scheme.id)}
									/>
								))}
							</div>
						)}
					</CardContent>
				</Card>

				{/* Custom Themes */}
				<Card className="shadow-lg">
					<CardHeader>
						<div className="flex items-center justify-between">
							<div className="flex items-center gap-3">
								<div className="rounded-lg bg-accent/10 p-2">
									<Palette className="h-6 w-6 text-accent" />
								</div>
								<div>
									<CardTitle>Custom Themes</CardTitle>
									<CardDescription>
										Create and manage your own themes
									</CardDescription>
								</div>
							</div>
							{editorMode === "hidden" && (
								<Button
									onClick={() => {
										setEditingScheme(null);
										setEditorMode("create");
									}}
								>
									<Plus className="mr-2 h-4 w-4" />
									Create New Theme
								</Button>
							)}
						</div>
					</CardHeader>
					<CardContent>
						{customSchemes.length === 0 ? (
							<p className="text-sm text-muted-foreground">
								You haven&apos;t created any custom themes yet.
							</p>
						) : (
							<div className="space-y-4">
								{customSchemes.map((scheme) => (
									<div
										key={scheme.id}
										className="flex items-center gap-4 rounded-lg border border-border p-4"
									>
										<ThemePreview colors={scheme.colors} />
										<div className="flex-1 min-w-0">
											<div className="font-medium text-foreground">
												{scheme.name}
											</div>
											<div className="text-xs text-muted-foreground">
												{scheme.is_dark ? "Dark" : "Light"} theme
											</div>
											{activeScheme?.id === scheme.id && (
												<span className="mt-1 inline-block rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
													Active
												</span>
											)}
										</div>
										<div className="flex items-center gap-2">
											{activeScheme?.id !== scheme.id && (
												<Button
													variant="outline"
													size="sm"
													onClick={() => handleActivate(scheme.id)}
												>
													Activate
												</Button>
											)}
											<Button
												variant="outline"
												size="sm"
												onClick={() => handleEdit(scheme)}
												title="Edit"
											>
												<Pencil className="h-4 w-4" />
											</Button>
											<Button
												variant="outline"
												size="sm"
												onClick={() => handleDuplicate(scheme)}
												title="Duplicate"
											>
												<Copy className="h-4 w-4" />
											</Button>
											{deleteConfirmId === scheme.id ? (
												<div className="flex items-center gap-1">
													<Button
														variant="destructive"
														size="sm"
														onClick={() => handleDelete(scheme.id)}
														disabled={deleteMutation.isPending}
													>
														Confirm
													</Button>
													<Button
														variant="outline"
														size="sm"
														onClick={() => setDeleteConfirmId(null)}
													>
														Cancel
													</Button>
												</div>
											) : (
												<Button
													variant="outline"
													size="sm"
													onClick={() => setDeleteConfirmId(scheme.id)}
													title="Delete"
												>
													<Trash2 className="h-4 w-4" />
												</Button>
											)}
										</div>
									</div>
								))}
							</div>
						)}
					</CardContent>
				</Card>

				{/* Theme Editor */}
				{editorMode !== "hidden" && (
					<ThemeEditor
						initialName={editingScheme?.name}
						initialIsDark={editingScheme?.is_dark}
						initialColors={editingScheme?.colors}
						onSave={editorMode === "edit" ? handleUpdate : handleCreate}
						onCancel={handleCancel}
						isLoading={createMutation.isPending || updateMutation.isPending}
					/>
				)}
			</div>
		</div>
	);
}
