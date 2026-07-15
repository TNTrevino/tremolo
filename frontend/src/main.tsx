import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "@/App";
import "@fontsource-variable/inter";
import "@fontsource-variable/bricolage-grotesque";
import "./index.css";
import { initAccessibilityAudit } from "./lib/axe";

ReactDOM.createRoot(document.getElementById("root")!).render(
	<React.StrictMode>
		<App />
	</React.StrictMode>,
);

initAccessibilityAudit();
