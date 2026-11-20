// 生产部署时前后端同域（Nginx 代理 /api），用相对路径
// 本地 H5 开发时 uni 的 process.env.NODE_ENV === 'development'
// #ifdef H5
export const BASE_URL = process.env.NODE_ENV === 'development'
  ? 'http://localhost:8000'
  : ''
// #endif

// #ifndef H5
export const BASE_URL = 'http://localhost:8000'
// #endif

export function request(path, method = 'GET', data = {}) {
  return new Promise((resolve, reject) => {
    uni.request({
      url: `${BASE_URL}${path}`,
      method,
      data,
      header: { 'Content-Type': 'application/json' },
      timeout: 15000,
      success: (res) => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(res.data)
        } else {
          reject(new Error(res.data?.detail || `请求失败：${res.statusCode}`))
        }
      },
      fail: reject
    })
  })
}
