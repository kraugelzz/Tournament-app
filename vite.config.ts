import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// base must match the GitHub Pages subpath (repo name) so built asset URLs resolve.
export default defineConfig({ base: "/Tournament-app/", plugins: [react()] });
