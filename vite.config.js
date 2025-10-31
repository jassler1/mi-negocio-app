import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
// Importamos 'fs' para verificar si el archivo existe
import fs from 'fs';
// Importamos 'path' para construir la ruta al archivo
import path from 'path';

// Función personalizada para copiar el archivo _redirects antes de la compilación
const copyNetlifyRedirects = (root) => ({
  name: 'copy-netlify-redirects',
  writeBundle() {
    // Rutas
    const sourcePath = path.resolve(root, '_redirects');
    const destPath = path.resolve(root, 'dist', '_redirects');

    // Comprobamos si el archivo _redirects existe en la raíz
    if (fs.existsSync(sourcePath)) {
      try {
        // Aseguramos que la carpeta dist exista antes de copiar
        const distDir = path.resolve(root, 'dist');
        if (!fs.existsSync(distDir)) {
            fs.mkdirSync(distDir);
        }
        
        // Copiamos el archivo de _redirects de la raíz a la carpeta dist
        fs.copyFileSync(sourcePath, destPath);
        console.log('✅ Archivo _redirects copiado a dist/');
      } catch (error) {
        console.error('❌ Error al copiar _redirects:', error);
      }
    } else {
      console.log('Advertencia: _redirects no encontrado en la raíz. Si usa Netlify, su redirección puede fallar.');
    }
  }
});

export default defineConfig(({ mode }) => {
  const rootDir = process.cwd();

  return {
    plugins: [
        react(),
        // 🚨 Agregamos nuestro plugin para el copiado:
        // Nota: Solo lo copiamos si NO estamos en modo de desarrollo (cuando mode es 'production')
        mode === 'production' && copyNetlifyRedirects(rootDir)
    ].filter(Boolean), // Filtramos valores 'false' si mode no es 'production'
    
    // Configuración de la carpeta base (si se necesita, pero lo dejamos por defecto)
    // base: '/',
  };
});
