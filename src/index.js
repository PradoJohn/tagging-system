import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css"; // Global styles
import App from "./App"; // Main App component
import { applyTheme, getInitialTheme } from "./theme";

// Set the theme before the first paint so the screen doesn't flash white
applyTheme(getInitialTheme());

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
