import { useState, useRef } from "react";
import { Upload, AlertCircle } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Card } from "@/shared/components/ui/card";
import { Input } from "@/shared/components/ui/input";
import { getErrorMessage } from "@/shared/utils/error.utils";
import { logger } from "@/lib/logger";
import { SheetMusicDisplay } from "@/features/sheet-music/components/SheetMusicDisplay";

export function ConverterPage() {
	const [musicXml, setMusicXml] = useState<string>("");
	const [uploadedFileName, setUploadedFileName] = useState<string>("");
	const [isProcessing, setIsProcessing] = useState(false);
	const [error, setError] = useState<string>("");
	const fileInputRef = useRef<HTMLInputElement>(null);

	const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
		const file = event.target.files?.[0];

		// Reset error state
		setError("");

		if (!file) {
			return;
		}

		// Validate file type
		const validExtensions = [".xml", ".musicxml", ".mxl"];
		const fileName = file.name.toLowerCase();
		const isValidExtension = validExtensions.some((ext) =>
			fileName.endsWith(ext),
		);

		if (!isValidExtension) {
			setError(
				"Invalid file type. Please upload a MusicXML file (.xml, .musicxml, or .mxl)",
			);
			return;
		}

		// Read the file
		setIsProcessing(true);
		const reader = new FileReader();

		reader.onload = (e) => {
			try {
				const xmlContent = e.target?.result as string;

				// Basic validation - check if content looks like XML
				if (!xmlContent || !xmlContent.trim().startsWith("<?xml")) {
					setError(
						"Invalid file format. The file does not appear to be a valid XML file.",
					);
					setIsProcessing(false);
					return;
				}

				// Check if it contains MusicXML elements
				if (
					!xmlContent.includes("score-partwise") &&
					!xmlContent.includes("score-timewise")
				) {
					setError(
						"Invalid MusicXML file. The file does not contain required MusicXML elements.",
					);
					setIsProcessing(false);
					return;
				}

				// Success - set the music XML and filename
				setMusicXml(xmlContent);
				setUploadedFileName(file.name);
				setIsProcessing(false);
			} catch (err) {
				logger.error("Failed to read uploaded file", err);
				setError(`Error reading file: ${getErrorMessage(err)}`);
				setIsProcessing(false);
			}
		};

		reader.onerror = (event) => {
			logger.error("FileReader error", event);
			setError("Failed to read the file. Please try again.");
			setIsProcessing(false);
		};

		reader.readAsText(file);
	};

	const handleButtonClick = () => {
		fileInputRef.current?.click();
	};

	const handleRenderError = (renderError: Error) => {
		logger.error("Failed to render sheet music", renderError);
		setError(`Failed to render sheet music: ${getErrorMessage(renderError)}`);
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

				{/* File Upload Section */}
				<Card className="p-6">
					<div className="space-y-4">
						<div>
							<h2 className="text-lg font-semibold mb-2">
								Select a MusicXML file
							</h2>
							<p className="text-sm text-muted-foreground mb-4">
								Choose a .xml, .musicxml, or .mxl file to preview
							</p>
						</div>

						<div className="flex flex-col sm:flex-row gap-4 items-start">
							<Input
								ref={fileInputRef}
								type="file"
								accept=".xml,.musicxml,.mxl"
								onChange={handleFileUpload}
								className="flex-1"
								error={error}
							/>
							<Button
								size="lg"
								onClick={handleButtonClick}
								disabled={isProcessing}
								className="w-full sm:w-auto"
							>
								<Upload className="mr-2 h-5 w-5" />
								{isProcessing ? "Processing..." : "Browse Files"}
							</Button>
						</div>

						{/* Error Display */}
						{error && (
							<div className="bg-destructive/10 border-2 border-destructive/50 rounded-lg p-4">
								<div className="flex items-start gap-3">
									<AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
									<div className="flex-1">
										<h3 className="font-semibold text-destructive mb-1">
											Upload Error
										</h3>
										<p className="text-sm text-destructive/80">{error}</p>
									</div>
								</div>
							</div>
						)}

						{/* File Info */}
						{uploadedFileName && !error && (
							<div className="bg-primary/10 border-2 border-primary/20 rounded-lg p-4">
								<div className="flex items-center gap-2">
									<Upload className="h-5 w-5 text-primary" />
									<p className="text-sm font-medium">
										Uploaded:{" "}
										<span className="text-primary">{uploadedFileName}</span>
									</p>
								</div>
							</div>
						)}
					</div>
				</Card>

				{/* Sheet Music Display Section */}
				{musicXml && !error && (
					<div>
						<h2 className="text-lg font-semibold mb-4">Preview</h2>
						<SheetMusicDisplay
							musicXml={musicXml}
							onError={handleRenderError}
						/>
					</div>
				)}

				{/* Empty State - Only show when no file uploaded */}
				{!musicXml && !error && (
					<Card className="p-12 min-h-[300px] flex items-center justify-center bg-gradient-to-br from-background to-muted/30">
						<div className="text-center space-y-4">
							<div className="flex justify-center">
								<div className="rounded-lg bg-muted/50 p-6">
									<Upload className="h-16 w-16 text-muted-foreground" />
								</div>
							</div>
							<div className="space-y-2">
								<h3 className="text-xl font-bold">No File Selected</h3>
								<p className="text-muted-foreground">
									Upload a MusicXML file to see the sheet music preview
								</p>
							</div>
						</div>
					</Card>
				)}

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
