import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: { // Optional: Keep server config if you had specific needs
    port: 5174, // Ensure this matches the port you expect
    // host: true, // Uncomment if needed for network access
  },
  // Ensure root points to the correct directory if your index.html isn't in the root
  // root: './', 
  build: {
    // Optional: Configure build output if needed
    // outDir: 'dist'
  }
});
