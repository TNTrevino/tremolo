import { TextField, InputAdornment, IconButton } from "@mui/material";
import { Visibility, VisibilityOff } from "@mui/icons-material";

interface PasswordFieldProps {
	id: string;
	label: string;
	value: string;
	onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
	onBlur?: () => void;
	error?: string;
	showPassword: boolean;
	onToggleVisibility: () => void;
	disabled?: boolean;
	autoComplete?: string;
	sx?: object;
	required?: boolean;
}

export const PasswordField = ({
	id,
	label,
	value,
	onChange,
	onBlur,
	error,
	showPassword,
	onToggleVisibility,
	disabled = false,
	autoComplete = "current-password",
	sx = {},
	required = false,
}: PasswordFieldProps) => {
	const handleMouseDown = (e: React.MouseEvent<HTMLButtonElement>) => {
		e.preventDefault();
	};

	return (
		<TextField
			fullWidth
			id={id}
			label={label}
			name={id}
			type={showPassword ? "text" : "password"}
			autoComplete={autoComplete}
			value={value}
			onChange={onChange}
			onBlur={onBlur}
			error={!!error}
			helperText={error}
			disabled={disabled}
			required={required}
			slotProps={{
				input: {
					endAdornment: (
						<InputAdornment position="end">
							<IconButton
								aria-label="toggle password visibility"
								onClick={onToggleVisibility}
								onMouseDown={handleMouseDown}
								edge="end"
								disabled={disabled}
							>
								{showPassword ? <VisibilityOff /> : <Visibility />}
							</IconButton>
						</InputAdornment>
					),
				},
			}}
			sx={sx}
		/>
	);
};
