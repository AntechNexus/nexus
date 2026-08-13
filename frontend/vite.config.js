import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
/**
 * Vite Configuration File
 * 
 * This configuration initializes the Vite bundler with specific plugins tailored for this project.
 * It leverages the `@vitejs/plugin-react` plugin to enable fast refresh and JSX compilation for React.
 * Additionally, it incorporates `@tailwindcss/vite` to process Tailwind CSS seamlessly within the Vite build pipeline.
 * The resulting configuration optimizes both the development server experience and the final production build process.
 * 
 * @returns {Object} The finalized Vite configuration object.
 */
export default defineConfig({
  plugins: [react(), tailwindcss()],
})
