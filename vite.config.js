import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  
  // CORRECCIÓN CLAVE: Se elimina 'root' para que Vite busque 'index.html' en la carpeta D:/Negocio, 
  // ya que tu archivo 'index.html' está en la raíz del proyecto, no dentro de 'Public'.
  // Si 'root' no se especifica, usa el directorio actual.
  // root: './Public', 
  
  server: {
    host: true,
  },
  
  build: {
    // La salida 'dist' se mantiene, pero ahora se creará en D:/Negocio/dist
    outDir: 'dist', 
    assetsDir: 'assets',
  },

  resolve: {
    alias: {
      // CORRECCIÓN: El alias @ debe apuntar directamente a './src', ya que está en la raíz del proyecto.
      '@': path.resolve(__dirname, './src'),
    },
  },
});
