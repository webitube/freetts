import { defineConfig } from 'vite'

export default defineConfig({
  // This is the important part for GitHub Pages!
  // It ensures assets are loaded from /repository-name/assets/
  base: '/freetts_dist/', 
})