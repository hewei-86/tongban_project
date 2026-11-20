import { defineConfig } from 'vite'
import uni from '@dcloudio/vite-plugin-uni'

// GitHub Pages 是子路径部署（/仓库名/），构建时通过 UNI_H5_BASE 注入；
// uni 的 H5 插件会读取该变量作为资源前缀和路由 base，本地开发默认 '/'。
export default defineConfig({
  base: process.env.UNI_H5_BASE || '/',
  plugins: [uni.default()]
})
