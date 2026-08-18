import { defineConfig } from "vite";
import { miaodaDevPlugin } from "miaoda-sc-plugin";
import react from "@vitejs/plugin-react-swc";
import svgr from "vite-plugin-svgr";
import path from "path";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    miaodaDevPlugin(),
    svgr({
      svgrOptions: {
        icon: true,
        exportType: "named",
        namedExport: "ReactComponent",
      },
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    proxy: {
      '/gmicloud-api': {
        target: 'https://console.gmicloud.ai',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/gmicloud-api/, ''),
        secure: false,
      },
      '/dxkp-api': {
        target: 'https://ai.dxkp.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/dxkp-api/, ''),
        secure: false,
        configure: (proxy, _options) => {
          proxy.on('proxyReq', (proxyReq) => {
            proxyReq.removeHeader('origin');
            proxyReq.removeHeader('referer');
          });
        },
      },
      '/siliconflow-api': {
        target: 'https://api.siliconflow.cn',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/siliconflow-api/, ''),
        secure: false,
        configure: (proxy, _options) => {
          proxy.on('proxyReq', (proxyReq) => {
            proxyReq.removeHeader('origin');
            proxyReq.removeHeader('referer');
          });
        },
      },
    },
  },
});
