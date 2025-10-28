import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// If you deploy to GitHub Pages under /wishcraft-pwa/, uncomment:
// export default defineConfig({ base: "/wishcraft-pwa/", plugins: [react()] });

export default defineConfig({
  plugins: [react()],
});
