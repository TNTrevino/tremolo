import { useState, useRef } from "react";
import { Upload, Music2, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export function ConverterPage() {
	const [uploadedFile, setUploadedFile] = useState<File | null>(null);
	const [isProcessing, setIsProcessing] = useState(false);
	const fileInputRef = useRef<HTMLInputElement>(null);

	const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
		const file = event.target.files?.[0];
		if (file) {
			setIsProcessing(true);
			// Simulate processing
			setTimeout(() => {
				setUploadedFile(file);
				setIsProcessing(false);
			}, 1000);
		}
	};

	const handleButtonClick = () => {
		fileInputRef.current?.click();
	};

	return (
		<div className="min-h-screen py-8 px-4">
			<div className="container mx-auto max-w-4xl space-y-6">
				<div className="text-center space-y-2">
					<h1 className="text-4xl font-bold">Sheet Music Converter</h1>
					<p className="text-muted-foreground text-lg">
						Upload and preview MusicXML files
					</p>
				</div>

				{/* Preview Area */}
				<Card className="p-12 min-h-[400px] flex items-center justify-center bg-gradient-to-br from-background to-muted/30">
					<div className="text-center space-y-6">
						{uploadedFile ? (
							<>
								<div className="space-y-4">
									<div className="flex justify-center">
										<div className="rounded-lg bg-primary/10 p-4">
											<FileText className="h-16 w-16 text-primary" />
										</div>
									</div>
									<div className="space-y-2">
										<h3 className="text-xl font-bold">
											File Uploaded Successfully
										</h3>
										<p className="text-muted-foreground">
											Viewing:{" "}
											<span className="font-medium">{uploadedFile.name}</span>
										</p>
									</div>
									{/* Simple visual representation */}
									<div className="relative w-full max-w-2xl mx-auto">
										<div className="space-y-3 p-8">
											{[...Array(5)].map((_, i) => (
												<div key={i} className="h-0.5 bg-foreground/20" />
											))}
										</div>
										<div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
											<Music2 className="h-24 w-24 text-primary/30" />
										</div>
									</div>
									<p className="text-sm text-muted-foreground max-w-md mx-auto">
										In a real implementation, this would render the actual sheet
										music from your MusicXML file using a library like
										OpenSheetMusicDisplay.
									</p>
								</div>
							</>
						) : (
							<>
								<div className="flex justify-center">
									<div className="rounded-lg bg-muted/50 p-6">
										<Upload className="h-24 w-24 text-muted-foreground" />
									</div>
								</div>
								<div className="space-y-2">
									<h3 className="text-xl font-bold">No File Selected</h3>
									<p className="text-muted-foreground">
										Click the button below to upload sheet music
									</p>
								</div>
							</>
						)}
					</div>
				</Card>

				{/* Upload Button */}
				<div className="text-center">
					<input
						ref={fileInputRef}
						type="file"
						accept=".xml,.musicxml,.mxl"
						onChange={handleFileUpload}
						className="hidden"
					/>
					<Button
						size="lg"
						onClick={handleButtonClick}
						loading={isProcessing}
						className="min-w-64"
					>
						<Upload className="mr-2 h-5 w-5" />
						{uploadedFile ? "Upload Different File" : "Upload Sheet Music"}
					</Button>
				</div>

				{/* Info Cards */}
				<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
					<Card className="p-6 bg-primary/5 border-primary/20">
						<div className="space-y-2">
							<h3 className="font-bold text-lg">Supported Formats</h3>
							<ul className="space-y-1 text-sm text-muted-foreground">
								<li>• .xml - MusicXML files</li>
								<li>• .musicxml - MusicXML files</li>
								<li>• .mxl - Compressed MusicXML</li>
							</ul>
						</div>
					</Card>

					<Card className="p-6 bg-accent/5 border-accent/20">
						<div className="space-y-2">
							<h3 className="font-bold text-lg">Use Cases</h3>
							<ul className="space-y-1 text-sm text-muted-foreground">
								<li>• Preview exercises from teachers</li>
								<li>• Convert digital sheet music</li>
								<li>• Check file compatibility</li>
								<li>• Quick viewing before practice</li>
							</ul>
						</div>
					</Card>
				</div>
			</div>
		</div>
	);
}
