import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
import {createApi} from './server/api.mjs';
export default defineConfig({plugins:[react(),{name:'ecostream-local-api',configureServer(server){server.middlewares.use(createApi());},configurePreviewServer(server){server.middlewares.use(createApi());}}],server:{host:'127.0.0.1',port:5173},preview:{host:'127.0.0.1'}});

