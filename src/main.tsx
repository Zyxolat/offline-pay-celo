import { createRoot } from "react-dom/client";
import "./index.css";

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Root element not found");
}

console.log("[main] Root element found");

const renderMountFallback = (error: unknown) => {
  const message = error instanceof Error ? error.message : String(error ?? "Unknown mount error");

  console.error("[main] Failed to mount app", error);

  const shell = document.createElement("div");
  shell.className = "runtime-error-shell";

  const card = document.createElement("div");
  card.className = "runtime-error-card glass-card";

  const label = document.createElement("p");
  label.className = "runtime-error-label";
  label.textContent = "Mount Error";

  const status = document.createElement("div");
  status.className = "runtime-error-status";
  status.textContent = "App is running";

  const title = document.createElement("h1");
  title.className = "runtime-error-title font-display";
  title.textContent = "App failed to mount";

  const description = document.createElement("p");
  description.className = "runtime-error-copy";
  description.textContent = "React could not finish mounting the root component. The error is shown below.";

  const pre = document.createElement("pre");
  pre.className = "runtime-error-message";
  pre.textContent = message;

  card.append(label, status, title, description, pre);
  shell.append(card);
  rootElement.replaceChildren(shell);
};

console.log("[main] App mounting...");

const root = createRoot(rootElement);

const mountApp = async () => {
  try {
    const { default: App } = await import("./App.tsx");
    console.log("[main] App module loaded");
    root.render(<App />);
  } catch (error) {
    renderMountFallback(error);
  }
};

void mountApp();
