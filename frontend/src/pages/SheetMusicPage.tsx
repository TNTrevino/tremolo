import { useState } from "react";
import { Music2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { SheetMusicDisplay } from "@/features/sheet-music/components";
import { musicService } from "@/services/api";
import { getErrorMessage } from "@/shared/utils/error.utils";

// Scale options with their corresponding tonic values
const scales = [
	{ label: "C Major", tonic: "C" },
	{ label: "F Major", tonic: "F" },
	{ label: "Bb Major", tonic: "B-" },
	{ label: "Eb Major", tonic: "E-" },
	{ label: "Ab Major", tonic: "A-" },
	{ label: "Db Major", tonic: "D-" },
	{ label: "Gb Major", tonic: "G-" },
	{ label: "G Major", tonic: "G" },
	{ label: "D Major", tonic: "D" },
	{ label: "A Major", tonic: "A" },
	{ label: "E Major", tonic: "E" },
	{ label: "B Major", tonic: "B" },
];

const octaves = [3, 4, 5];

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
	const [scaleIndex, setScaleIndex] = useState(0); // Index into scales array
	const [octave, setOctave] = useState(4);
	const [selectedRhythm, setSelectedRhythm] = useState<string | null>(null);
	const [rhythmType, setRhythmType] = useState<8 | 16 | null>(null);
	const [musicXml, setMusicXml] = useState<string>("");
	const [isGenerating, setIsGenerating] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const currentScale = scales[scaleIndex];

	const handleGenerateMary = () => {
		if (!currentScale) return;
		setIsGenerating(true);
		setError(null);

		musicService
			.generateMary({
				tonic: currentScale.tonic,
				octave: octave,
			})
			.then((xml) => {
				setMusicXml(xml);
				setSelectedRhythm(null);
				setRhythmType(null);
			})
		.catch((err) => {
			setError(getErrorMessage(err));
			})
			.finally(() => {
				setIsGenerating(false);
			});
	};

	const handleGenerateRhythm = (rhythm: string, type: 8 | 16) => {
		if (!currentScale) return;
		setIsGenerating(true);
		setError(null);
		setSelectedRhythm(rhythm);
		setRhythmType(type);

		musicService
			.generateRandom({
				rhythm: rhythm,
				rhythmType: type,
				tonic: currentScale.tonic,
			})
			.then((xml) => {
				setMusicXml(xml);
			})
		.catch((err) => {
			setError(getErrorMessage(err));
			})
			.finally(() => {
				setIsGenerating(false);
			});
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
				{musicXml ? (
					<SheetMusicDisplay
						musicXml={musicXml}
						onError={(err) => setError(err.message)}
					/>
				) : (
					<Card className="p-12 min-h-[400px] flex items-center justify-center bg-gradient-to-br from-background to-muted/30">
						<div className="text-center space-y-6">
							{error ? (
								<div className="space-y-4">
									<div className="text-destructive font-semibold">
										Error: {error}
									</div>
									<p className="text-sm text-muted-foreground">
										Please try again with different options
									</p>
								</div>
							) : isGenerating ? (
								<div className="space-y-4">
									<div className="animate-spin mx-auto">
										<Music2 className="h-16 w-16 text-primary" />
									</div>
									<p className="text-lg text-muted-foreground">
										Generating music...
									</p>
								</div>
							) : (
								<>
									<Music2 className="h-24 w-24 text-muted-foreground mx-auto" />
									<p className="text-lg text-muted-foreground">
										Select options below and click a button to generate sheet
										music
									</p>
								</>
							)}
						</div>
					</Card>
				)}

				{/* Controls */}
				<div className="space-y-4">
					<Card className="p-6">
						<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
							{/* Scale Selector */}
							<div className="space-y-2">
								<label htmlFor="scale-select" className="text-sm font-medium">
									Choose Scale
								</label>
								<Select
									id="scale-select"
									value={scaleIndex.toString()}
									onChange={(e) => setScaleIndex(Number(e.target.value))}
								>
									{scales.map((s, index) => (
										<option key={index} value={index}>
											{s.label}
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
									{octaves.map((o) => (
										<option key={o} value={o}>
											Octave {o}
										</option>
									))}
								</Select>
							</div>

							{/* Generate Mary Button */}
							<div className="space-y-2">
								<span className="text-sm font-medium block">
									Generate Exercise
								</span>
								<Button
									onClick={handleGenerateMary}
									disabled={isGenerating}
									className="w-full"
								>
									Generate Mary
								</Button>
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
											selectedRhythm === rhythm.value && rhythmType === 16
												? "default"
												: "outline"
										}
										onClick={() => handleGenerateRhythm(rhythm.value, 16)}
										disabled={isGenerating}
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
											selectedRhythm === rhythm.value && rhythmType === 8
												? "default"
												: "outline"
										}
										onClick={() => handleGenerateRhythm(rhythm.value, 8)}
										disabled={isGenerating}
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
