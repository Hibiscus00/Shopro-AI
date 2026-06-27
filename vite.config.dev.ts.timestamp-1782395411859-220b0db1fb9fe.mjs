// vite.config.dev.ts
import * as vite from "file:///E:/Code/AI/Start/Web/Shopai/Shopro%20AI/node_modules/.pnpm/vite@5.4.21_@types+node@22.19.21/node_modules/vite/dist/node/index.js";
import { defineConfig, loadConfigFromFile } from "file:///E:/Code/AI/Start/Web/Shopai/Shopro%20AI/node_modules/.pnpm/vite@5.4.21_@types+node@22.19.21/node_modules/vite/dist/node/index.js";
import path from "path";
import {
  makeTagger,
  injectedGuiListenerPlugin,
  injectOnErrorPlugin,
  monitorPlugin
} from "file:///E:/Code/AI/Start/Web/Shopai/Shopro%20AI/node_modules/.pnpm/miaoda-sc-plugin@1.0.62_vite@5.4.21_@types+node@22.19.21_/node_modules/miaoda-sc-plugin/dist/index.js";
var __vite_injected_original_dirname = "E:\\Code\\AI\\Start\\Web\\Shopai\\Shopro AI";
var vite_config_dev_default = defineConfig(async () => {
  const env = { command: "serve", mode: "development" };
  const configFile = path.resolve(__vite_injected_original_dirname, "vite.config.ts");
  const result = await loadConfigFromFile(env, configFile);
  const userConfig = result?.config;
  const viteVersionInfo = {
    version: vite.version,
    rollupVersion: vite.rollupVersion ?? null,
    rolldownVersion: vite.rolldownVersion ?? null,
    isRolldownVite: "rolldownVersion" in vite
  };
  return {
    ...userConfig,
    define: {
      __VITE_INFO__: JSON.stringify(viteVersionInfo),
      ...userConfig?.define || {}
    },
    // 将 Vite 缓存目录设置为项目本地目录，避免在 /workspace/node_modules/ 下创建
    cacheDir: path.resolve(__vite_injected_original_dirname, "node_modules/.vite"),
    server: {
      ...userConfig?.server || {},
      warmup: { clientFiles: ["./src/main.tsx"] }
    },
    plugins: [
      makeTagger(),
      injectedGuiListenerPlugin({
        path: "https://resource-static.cdn.bcebos.com/common/v2/injected.js"
      }),
      injectOnErrorPlugin(),
      ...userConfig?.plugins || [],
      {
        name: "hmr-toggle",
        configureServer(server) {
          let hmrEnabled = true;
          const _send = server.ws.send;
          server.ws.send = (payload) => {
            if (hmrEnabled) {
              return _send.call(server.ws, payload);
            } else {
              console.log("[HMR disabled] skipped payload:", payload.type);
            }
          };
          server.middlewares.use("/innerapi/v1/sourcecode/__hmr_off", (req, res) => {
            hmrEnabled = false;
            let body = {
              status: 0,
              msg: "HMR disabled"
            };
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify(body));
          });
          server.middlewares.use("/innerapi/v1/sourcecode/__hmr_on", (req, res) => {
            hmrEnabled = true;
            let body = {
              status: 0,
              msg: "HMR enabled"
            };
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify(body));
          });
          server.middlewares.use("/innerapi/v1/sourcecode/__hmr_reload", (req, res) => {
            if (hmrEnabled) {
              server.ws.send({
                type: "full-reload",
                path: "*"
                // 整页刷新
              });
            }
            res.statusCode = 200;
            let body = {
              status: 0,
              msg: "Manual full reload triggered"
            };
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify(body));
          });
        },
        load(id) {
          if (id === "virtual:after-update") {
            return `
        if (import.meta.hot) {
          import.meta.hot.on('vite:afterUpdate', () => {
            window.postMessage(
              {
                type: 'editor-update'
              },
              '*'
            );
          });
        }
      `;
          }
        },
        transformIndexHtml(html) {
          return {
            html,
            tags: [
              {
                tag: "script",
                attrs: {
                  type: "module",
                  src: "/@id/virtual:after-update"
                },
                injectTo: "body"
              }
            ]
          };
        }
      },
      ,
      monitorPlugin(
        {
          scriptSrc: "https://resource-static.cdn.bcebos.com/sentry/browser.sentry.min.js",
          sentryDsn: "https://e3c07b90fcb5207f333d50ac24a99d3e@sentry.miaoda.cn/233",
          environment: "undefined",
          appId: "app-bnjgmg2jpu6a"
        }
      )
    ]
  };
});
export {
  vite_config_dev_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcuZGV2LnRzIl0sCiAgInNvdXJjZXNDb250ZW50IjogWyJjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZGlybmFtZSA9IFwiRTpcXFxcQ29kZVxcXFxBSVxcXFxTdGFydFxcXFxXZWJcXFxcU2hvcGFpXFxcXFNob3BybyBBSVwiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9maWxlbmFtZSA9IFwiRTpcXFxcQ29kZVxcXFxBSVxcXFxTdGFydFxcXFxXZWJcXFxcU2hvcGFpXFxcXFNob3BybyBBSVxcXFx2aXRlLmNvbmZpZy5kZXYudHNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfaW1wb3J0X21ldGFfdXJsID0gXCJmaWxlOi8vL0U6L0NvZGUvQUkvU3RhcnQvV2ViL1Nob3BhaS9TaG9wcm8lMjBBSS92aXRlLmNvbmZpZy5kZXYudHNcIjtcbiAgICBpbXBvcnQgKiBhcyB2aXRlIGZyb20gJ3ZpdGUnO1xuICAgIGltcG9ydCB7IGRlZmluZUNvbmZpZywgbG9hZENvbmZpZ0Zyb21GaWxlIH0gZnJvbSBcInZpdGVcIjtcbiAgICBpbXBvcnQgdHlwZSB7IFBsdWdpbiwgQ29uZmlnRW52IH0gZnJvbSBcInZpdGVcIjtcbiAgICBpbXBvcnQgdGFpbHdpbmRjc3MgZnJvbSBcInRhaWx3aW5kY3NzXCI7XG4gICAgaW1wb3J0IGF1dG9wcmVmaXhlciBmcm9tIFwiYXV0b3ByZWZpeGVyXCI7XG4gICAgaW1wb3J0IGZzIGZyb20gXCJmcy9wcm9taXNlc1wiO1xuICAgIGltcG9ydCBwYXRoIGZyb20gXCJwYXRoXCI7XG4gICAgaW1wb3J0IHtcbiAgICAgIG1ha2VUYWdnZXIsXG4gICAgICBpbmplY3RlZEd1aUxpc3RlbmVyUGx1Z2luLFxuICAgICAgaW5qZWN0T25FcnJvclBsdWdpbixcbiAgICAgIG1vbml0b3JQbHVnaW5cbiAgICB9IGZyb20gXCJtaWFvZGEtc2MtcGx1Z2luXCI7XG5cbiAgICBleHBvcnQgZGVmYXVsdCBkZWZpbmVDb25maWcoYXN5bmMgKCkgPT4ge1xuICAgICAgY29uc3QgZW52OiBDb25maWdFbnYgPSB7IGNvbW1hbmQ6IFwic2VydmVcIiwgbW9kZTogXCJkZXZlbG9wbWVudFwiIH07XG4gICAgICBjb25zdCBjb25maWdGaWxlID0gcGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgXCJ2aXRlLmNvbmZpZy50c1wiKTtcbiAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IGxvYWRDb25maWdGcm9tRmlsZShlbnYsIGNvbmZpZ0ZpbGUpO1xuICAgICAgY29uc3QgdXNlckNvbmZpZyA9IHJlc3VsdD8uY29uZmlnO1xuXG4gICAgICBjb25zdCB2aXRlVmVyc2lvbkluZm8gPSB7XG4gICAgICAgIHZlcnNpb246IHZpdGUudmVyc2lvbixcbiAgICAgICAgcm9sbHVwVmVyc2lvbjogKHZpdGUgYXMgYW55KS5yb2xsdXBWZXJzaW9uID8/IG51bGwsXG4gICAgICAgIHJvbGxkb3duVmVyc2lvbjogKHZpdGUgYXMgYW55KS5yb2xsZG93blZlcnNpb24gPz8gbnVsbCxcbiAgICAgICAgaXNSb2xsZG93blZpdGU6ICdyb2xsZG93blZlcnNpb24nIGluIHZpdGVcbiAgICAgIH07XG5cbiAgICAgIHJldHVybiB7XG4gICAgICAgIC4uLnVzZXJDb25maWcsXG4gICAgICAgIGRlZmluZToge1xuICAgICAgICAgIF9fVklURV9JTkZPX186IEpTT04uc3RyaW5naWZ5KHZpdGVWZXJzaW9uSW5mbyksXG4gICAgICAgICAgLi4uKHVzZXJDb25maWc/LmRlZmluZSB8fCB7fSlcbiAgICAgICAgfSxcbiAgICAgICAgLy8gXHU1QzA2IFZpdGUgXHU3RjEzXHU1QjU4XHU3NkVFXHU1RjU1XHU4QkJFXHU3RjZFXHU0RTNBXHU5ODc5XHU3NkVFXHU2NzJDXHU1NzMwXHU3NkVFXHU1RjU1XHVGRjBDXHU5MDdGXHU1MTREXHU1NzI4IC93b3Jrc3BhY2Uvbm9kZV9tb2R1bGVzLyBcdTRFMEJcdTUyMUJcdTVFRkFcbiAgICAgICAgY2FjaGVEaXI6IHBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsIFwibm9kZV9tb2R1bGVzLy52aXRlXCIpLFxuICAgICAgICBzZXJ2ZXI6IHtcbiAgICAgICAgICAuLi4odXNlckNvbmZpZz8uc2VydmVyIHx8IHt9KSxcbiAgICAgICAgICB3YXJtdXA6IHsgY2xpZW50RmlsZXM6IFtcIi4vc3JjL21haW4udHN4XCJdIH1cbiAgICAgICAgfSxcbiAgICAgICAgcGx1Z2luczogW1xuICAgICAgICAgIG1ha2VUYWdnZXIoKSxcbiAgICAgICAgICBpbmplY3RlZEd1aUxpc3RlbmVyUGx1Z2luKHtcbiAgICAgICAgICAgIHBhdGg6ICdodHRwczovL3Jlc291cmNlLXN0YXRpYy5jZG4uYmNlYm9zLmNvbS9jb21tb24vdjIvaW5qZWN0ZWQuanMnXG4gICAgICAgICAgfSksXG4gICAgICAgICAgaW5qZWN0T25FcnJvclBsdWdpbigpLFxuICAgICAgICAgIC4uLih1c2VyQ29uZmlnPy5wbHVnaW5zIHx8IFtdKSxcbiAgICAgICAgICBcbntcbiAgbmFtZTogJ2htci10b2dnbGUnLFxuICBjb25maWd1cmVTZXJ2ZXIoc2VydmVyKSB7XG4gICAgbGV0IGhtckVuYWJsZWQgPSB0cnVlO1xuXG4gICAgLy8gXHU1MzA1XHU4OEM1XHU1MzlGXHU2NzY1XHU3Njg0IHNlbmQgXHU2NUI5XHU2Q0Q1XG4gICAgY29uc3QgX3NlbmQgPSBzZXJ2ZXIud3Muc2VuZDtcbiAgICBzZXJ2ZXIud3Muc2VuZCA9IChwYXlsb2FkKSA9PiB7XG4gICAgICBpZiAoaG1yRW5hYmxlZCkge1xuICAgICAgICByZXR1cm4gX3NlbmQuY2FsbChzZXJ2ZXIud3MsIHBheWxvYWQpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgY29uc29sZS5sb2coJ1tITVIgZGlzYWJsZWRdIHNraXBwZWQgcGF5bG9hZDonLCBwYXlsb2FkLnR5cGUpO1xuICAgICAgfVxuICAgIH07XG5cbiAgICAvLyBcdTYzRDBcdTRGOUJcdTYzQTVcdTUzRTNcdTUyMDdcdTYzNjIgSE1SXG4gICAgc2VydmVyLm1pZGRsZXdhcmVzLnVzZSgnL2lubmVyYXBpL3YxL3NvdXJjZWNvZGUvX19obXJfb2ZmJywgKHJlcSwgcmVzKSA9PiB7XG4gICAgICBobXJFbmFibGVkID0gZmFsc2U7XG4gICAgICBsZXQgYm9keSA9IHtcbiAgICAgICAgICBzdGF0dXM6IDAsXG4gICAgICAgICAgbXNnOiAnSE1SIGRpc2FibGVkJ1xuICAgICAgfTtcbiAgICAgIHJlcy5zZXRIZWFkZXIoJ0NvbnRlbnQtVHlwZScsICdhcHBsaWNhdGlvbi9qc29uJyk7XG4gICAgICByZXMuZW5kKEpTT04uc3RyaW5naWZ5KGJvZHkpKTtcbiAgICB9KTtcblxuICAgIHNlcnZlci5taWRkbGV3YXJlcy51c2UoJy9pbm5lcmFwaS92MS9zb3VyY2Vjb2RlL19faG1yX29uJywgKHJlcSwgcmVzKSA9PiB7XG4gICAgICBobXJFbmFibGVkID0gdHJ1ZTtcbiAgICAgIGxldCBib2R5ID0ge1xuICAgICAgICAgIHN0YXR1czogMCxcbiAgICAgICAgICBtc2c6ICdITVIgZW5hYmxlZCdcbiAgICAgIH07XG4gICAgICByZXMuc2V0SGVhZGVyKCdDb250ZW50LVR5cGUnLCAnYXBwbGljYXRpb24vanNvbicpO1xuICAgICAgcmVzLmVuZChKU09OLnN0cmluZ2lmeShib2R5KSk7XG4gICAgfSk7XG5cbiAgICAvLyBcdTZDRThcdTUxOENcdTRFMDBcdTRFMkEgSFRUUCBBUElcdUZGMENcdTc1MjhcdTY3NjVcdTYyNEJcdTUyQThcdTg5RTZcdTUzRDFcdTRFMDBcdTZCMjFcdTY1NzRcdTRGNTNcdTUyMzdcdTY1QjBcbiAgICBzZXJ2ZXIubWlkZGxld2FyZXMudXNlKCcvaW5uZXJhcGkvdjEvc291cmNlY29kZS9fX2htcl9yZWxvYWQnLCAocmVxLCByZXMpID0+IHtcbiAgICAgIGlmIChobXJFbmFibGVkKSB7XG4gICAgICAgIHNlcnZlci53cy5zZW5kKHtcbiAgICAgICAgICB0eXBlOiAnZnVsbC1yZWxvYWQnLFxuICAgICAgICAgIHBhdGg6ICcqJywgLy8gXHU2NTc0XHU5ODc1XHU1MjM3XHU2NUIwXG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgICAgcmVzLnN0YXR1c0NvZGUgPSAyMDA7XG4gICAgICBsZXQgYm9keSA9IHtcbiAgICAgICAgICBzdGF0dXM6IDAsXG4gICAgICAgICAgbXNnOiAnTWFudWFsIGZ1bGwgcmVsb2FkIHRyaWdnZXJlZCdcbiAgICAgIH07XG4gICAgICByZXMuc2V0SGVhZGVyKCdDb250ZW50LVR5cGUnLCAnYXBwbGljYXRpb24vanNvbicpO1xuICAgICAgcmVzLmVuZChKU09OLnN0cmluZ2lmeShib2R5KSk7XG4gICAgfSk7XG4gIH0sXG4gIGxvYWQoaWQpIHtcbiAgICBpZiAoaWQgPT09ICd2aXJ0dWFsOmFmdGVyLXVwZGF0ZScpIHtcbiAgICAgIHJldHVybiBgXG4gICAgICAgIGlmIChpbXBvcnQubWV0YS5ob3QpIHtcbiAgICAgICAgICBpbXBvcnQubWV0YS5ob3Qub24oJ3ZpdGU6YWZ0ZXJVcGRhdGUnLCAoKSA9PiB7XG4gICAgICAgICAgICB3aW5kb3cucG9zdE1lc3NhZ2UoXG4gICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICB0eXBlOiAnZWRpdG9yLXVwZGF0ZSdcbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgJyonXG4gICAgICAgICAgICApO1xuICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICBgO1xuICAgIH1cbiAgfSxcbiAgdHJhbnNmb3JtSW5kZXhIdG1sKGh0bWwpIHtcbiAgICByZXR1cm4ge1xuICAgICAgaHRtbCxcbiAgICAgIHRhZ3M6IFtcbiAgICAgICAge1xuICAgICAgICAgIHRhZzogJ3NjcmlwdCcsXG4gICAgICAgICAgYXR0cnM6IHtcbiAgICAgICAgICAgIHR5cGU6ICdtb2R1bGUnLFxuICAgICAgICAgICAgc3JjOiAnL0BpZC92aXJ0dWFsOmFmdGVyLXVwZGF0ZSdcbiAgICAgICAgICB9LFxuICAgICAgICAgIGluamVjdFRvOiAnYm9keSdcbiAgICAgICAgfVxuICAgICAgXVxuICAgIH07XG4gIH1cbn0sXG4sXG4gICAgICAgICAgbW9uaXRvclBsdWdpbihcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgc2NyaXB0U3JjOiAnaHR0cHM6Ly9yZXNvdXJjZS1zdGF0aWMuY2RuLmJjZWJvcy5jb20vc2VudHJ5L2Jyb3dzZXIuc2VudHJ5Lm1pbi5qcycsXG4gICAgICAgICAgICAgIHNlbnRyeURzbjogJ2h0dHBzOi8vZTNjMDdiOTBmY2I1MjA3ZjMzM2Q1MGFjMjRhOTlkM2VAc2VudHJ5Lm1pYW9kYS5jbi8yMzMnLFxuICAgICAgICAgICAgICBlbnZpcm9ubWVudDogJ3VuZGVmaW5lZCcsXG4gICAgICAgICAgICAgIGFwcElkOiAnYXBwLWJuamdtZzJqcHU2YSdcbiAgICAgICAgICAgIH1cbiAgICAgICAgICApXG4gICAgICAgIF1cbiAgICAgIH07XG4gICAgfSk7XG4gICAgIl0sCiAgIm1hcHBpbmdzIjogIjtBQUNJLFlBQVksVUFBVTtBQUN0QixTQUFTLGNBQWMsMEJBQTBCO0FBS2pELE9BQU8sVUFBVTtBQUNqQjtBQUFBLEVBQ0U7QUFBQSxFQUNBO0FBQUEsRUFDQTtBQUFBLEVBQ0E7QUFBQSxPQUNLO0FBYlgsSUFBTSxtQ0FBbUM7QUFlckMsSUFBTywwQkFBUSxhQUFhLFlBQVk7QUFDdEMsUUFBTSxNQUFpQixFQUFFLFNBQVMsU0FBUyxNQUFNLGNBQWM7QUFDL0QsUUFBTSxhQUFhLEtBQUssUUFBUSxrQ0FBVyxnQkFBZ0I7QUFDM0QsUUFBTSxTQUFTLE1BQU0sbUJBQW1CLEtBQUssVUFBVTtBQUN2RCxRQUFNLGFBQWEsUUFBUTtBQUUzQixRQUFNLGtCQUFrQjtBQUFBLElBQ3RCLFNBQWM7QUFBQSxJQUNkLGVBQTZCLHNCQUFpQjtBQUFBLElBQzlDLGlCQUErQix3QkFBbUI7QUFBQSxJQUNsRCxnQkFBZ0IscUJBQXFCO0FBQUEsRUFDdkM7QUFFQSxTQUFPO0FBQUEsSUFDTCxHQUFHO0FBQUEsSUFDSCxRQUFRO0FBQUEsTUFDTixlQUFlLEtBQUssVUFB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
