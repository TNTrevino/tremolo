import { useState } from "react";
import { Music2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Card } from "@/components/ui/card";

const scales = [
	"C Major",
	"F Major",
	"Bb Major",
	"Eb Major",
	"Ab Major",
	"Db Major",
	"Gb Major",
	"G Major",
	"D Major",
	"A Major",
	"E Major",
	"B Major",
];

const sixteenthRhythms = [
	{ label: "1111", value: "1111" },
	{ label: "112", value: "112" },
	{ label: "121", value: "121" },
	{ label: "211", value: "211" },
	{ label: "0111", value: "0111" },
];

const eighthRhythms = [
	{ label: "11", value: "11" },
	{ label: "01", value: "01" },
	{ label: "10", value: "10" },
];

export function SheetMusicPage() {
	const [scale, setScale] = useState("C Major");
	const [octave, setOctave] = useState(4);
	const [selectedRhythm, setSelectedRhythm] = useState<string | null>(null);
	const [rhythmType, setRhythmType] = useState<"16th" | "8th" | null>(null);

	const handleGenerateMusic = (rhythm: string, type: "16th" | "8th") => {
		setSelectedRhythm(rhythm);
		setRhythmType(type);
	};

	return (
		<div className="min-h-screen py-8 px-4">
			<div className="container mx-auto max-w-5xl space-y-6">
				<div className="text-center space-y-2">
					<h1 className="text-4xl font-bold">Sheet Music Practice</h1>
					<p className="text-muted-foreground text-lg">
						Generate custom exercises with specific rhythms and scales
					</p>
				</div>

				{/* Sheet Music Display */}
				<Card className="p-12 min-h-[400px] flex items-center justify-center bg-gradient-to-br from-background to-muted/30">
					<div className="text-center space-y-6">
						{selectedRhythm ? (
							<>
								<div className="space-y-4">
									<div className="text-sm text-muted-foreground">
										Generated Sheet Music
									</div>
									<div className="flex justify-center gap-2 flex-wrap">
										{/* Simple visual representation of staff lines */}
										<div className="relative w-full max-w-2xl">
											<div className="space-y-3">
												{[...Array(5)].map((_, i) => (
													<div key={i} className="h-0.5 bg-foreground/20" />
												))}
											</div>
											<div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
												<div className="text-6xl font-bold text-primary flex items-center gap-4">
													<Music2 className="h-16 w-16" />
													<span className="text-2xl text-muted-foreground">
														{scale} • Octave {octave} •{" "}
														{rhythmType === "16th" ? "16th Notes" : "8th Notes"}{" "}
														({selectedRhythm})
													</span>
												</div>
											</div>
										</div>
									</div>
									<p className="text-sm text-muted-foreground max-w-xl mx-auto">
										In a real implementation, this would display rendered sheet
										music using a library like OpenSheetMusicDisplay. The music
										would be generated based on your selected scale, octave, and
										rhythm pattern.
									</p>
								</div>
							</>
						) : (
							<>
								<Music2 className="h-24 w-24 text-muted-foreground mx-auto" />
								<p className="text-lg text-muted-foreground">
									Select options below to generate sheet music
								</p>
							</>
						)}
					</div>
				</Card>

				{/* Controls */}
				<div className="space-y-4">
					<Card className="p-6">
						<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
							{/* Scale Selector */}
							<div className="space-y-2">
								<label htmlFor="scale-select" className="text-sm font-medium">
									Choose Scale
								</label>
								<Select
									id="scale-select"
									value={scale}
									onChange={(e) => setScale(e.target.value)}
								>
									{scales.map((s) => (
										<option key={s} value={s}>
											{s}
										</option>
									))}
								</Select>
							</div>

							{/* Octave Selector */}
							<div className="space-y-2">
								<label htmlFor="octave-select" className="text-sm font-medium">
									Choose Octave
								</label>
								<Select
									id="octave-select"
									value={octave.toString()}
									onChange={(e) => setOctave(Number(e.target.value))}
								>
									{[1, 2, 3, 4, 5, 6, 7, 8, 9].map((o) => (
										<option key={o} value={o}>
											Octave {o}
										</option>
									))}
								</Select>
							</div>
						</div>
					</Card>

					{/* Rhythm Selectors */}
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						{/* 16th Note Rhythms */}
						<Card className="p-6">
							<h3 className="text-lg font-bold mb-4">16th Note Rhythms</h3>
							<div className="space-y-2">
								{sixteenthRhythms.map((rhythm) => (
									<Button
										key={rhythm.value}
										variant={
											selectedRhythm === rhythm.value && rhythmType === "16th"
												? "default"
												: "outline"
										}
										onClick={() => handleGenerateMusic(rhythm.value, "16th")}
										className="w-full justify-start font-mono"
									>
										{rhythm.label}
									</Button>
								))}
							</div>
						</Card>

						{/* 8th Note Rhythms */}
						<Card className="p-6">
							<h3 className="text-lg font-bold mb-4">8th Note Rhythms</h3>
							<div className="space-y-2">
								{eighthRhythms.map((rhythm) => (
									<Button
										key={rhythm.value}
										variant={
											selectedRhythm === rhythm.value && rhythmType === "8th"
												? "default"
												: "outline"
										}
										onClick={() => handleGenerateMusic(rhythm.value, "8th")}
										className="w-full justify-start font-mono"
									>
										{rhythm.label}
									</Button>
								))}
							</div>
						</Card>
					</div>
				</div>

				{/* Info Card */}
				<Card className="p-6 bg-primary/5 border-primary/20">
					<div className="space-y-2">
						<h3 className="font-bold text-lg">How It Works</h3>
						<ul className="space-y-1 text-sm text-muted-foreground">
							<li>
								• Select a scale and octave to determine which notes will be
								used
							</li>
							<li>• Choose a rhythm pattern (16th or 8th note combinations)</li>
							<li>
								• The system generates random notes from your selected scale
								arranged in the chosen rhythm
							</li>
							<li>
								• Each generation creates a unique exercise - no memorization
								possible!
							</li>
							<li>• Perfect for sight-reading practice and UIL preparation</li>
						</ul>
					</div>
				</Card>
			</div>
		</div>
	);
}
