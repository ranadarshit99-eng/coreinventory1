import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  timeout: 30000,
})

api.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) {
      // Clear auth and redirect to login
      localStorage.removeItem('coreinventory-auth')
      if (!window.location.pathname.includes('/login') && !window.location.pathname.includes('/register')) {
        window.location.href = '/login'
      }
    }
    return Promise.reject(err)
  }
)

export default api
