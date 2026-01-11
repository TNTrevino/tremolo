import { Box, Typography, FormControl, Select, MenuItem } from "@mui/material";
import {
	scaleOptions,
	octaveOptions,
} from "../../components/musical/MusicalOptions";

interface MusicalSettingsProps {
	scaleChoice: string;
	octaveChoice: string;
	onScaleChange: (scale: string) => void;
	onOctaveChange: (octave: string) => void;
}

export const MusicalSettings = ({
	scaleChoice,
	octaveChoice,
	onScaleChange,
	onOctaveChange,
}: MusicalSettingsProps) => {
	return (
		<>
			{/* Scale Dropdown */}
			<Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
				<Typography
					variant="caption"
					sx={{
						fontSize: "0.75rem",
					}}
				>
					scale:
				</Typography>
				<FormControl size="small">
					<Select
						value={scaleChoice}
						onChange={(e) => onScaleChange(e.target.value)}
						displayEmpty
						sx={{
							minWidth: 60,
							height: 31,
							fontSize: "0.8125rem",
							"& .MuiSelect-select": {
								px: 1,
								display: "flex",
								alignItems: "center",
							},
						}}
					>
						{scaleOptions.map((scale) => (
							<MenuItem key={scale.option} value={scale.option}>
								{scale.name}
							</MenuItem>
						))}
					</Select>
				</FormControl>
			</Box>

			{/* Octave Dropdown */}
			<Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
				<Typography
					variant="caption"
					sx={{
						fontSize: "0.75rem",
						lineHeight: 1,
					}}
				>
					octave:
				</Typography>
				<FormControl size="small">
					<Select
						value={octaveChoice}
						onChange={(e) => onOctaveChange(e.target.value)}
						displayEmpty
						sx={{
							minWidth: 50,
							height: 31,
							fontSize: "0.8125rem",
							"& .MuiSelect-select": {
								py: 0.5,
								px: 1,
								display: "flex",
								alignItems: "center",
							},
						}}
					>
						{octaveOptions.map((octave) => (
							<MenuItem key={octave.option} value={octave.option}>
								{octave.name}
							</MenuItem>
						))}
					</Select>
				</FormControl>
			</Box>
		</>
	);
};
