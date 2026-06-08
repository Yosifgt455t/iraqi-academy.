import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';
import {defineConfig, loadEnv} from 'vite';

// Automatically detect and move Thmanyah Sans font files from root to public/fonts if uploaded to root
try {
  const fontsDir = path.resolve(__dirname, 'public/fonts');
  if (!fs.existsSync(fontsDir)) {
    fs.mkdirSync(fontsDir, { recursive: true });
  }
  const rootFiles = fs.readdirSync(__dirname);
  const fontFiles = rootFiles.filter(file => file.toLowerCase().endsWith('.otf') && file.toLowerCase().includes('thmanyah'));
  for (const file of fontFiles) {
    const srcPath = path.join(__dirname, file);
    const destPath = path.join(fontsDir, file);
    fs.renameSync(srcPath, destPath);
    console.log(`[Font Organizer] Moved ${file} to public/fonts/`);
  }
} catch (e) {
  console.error('[Font Organizer Error]', e);
}

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [react(), tailwindcss()],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.GEMINI_API_KEYS': JSON.stringify(env.GEMINI_API_KEYS),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
    },
    optimizeDeps: {
      include: ['pdfjs-dist', 'mammoth']
    }
  };
});
