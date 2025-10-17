import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import "@uppy/core/css/style.css";
import "@uppy/dashboard/css/style.css";

createRoot(document.getElementById("root")!).render(<App />);
