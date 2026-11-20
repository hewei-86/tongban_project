// 本地开发默认地址。真机调试时请改成电脑的局域网 IP。
export const BASE_URL = ''

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
