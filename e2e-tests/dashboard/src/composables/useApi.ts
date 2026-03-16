// Axios 封装

import axios from 'axios';
import { ElMessage } from 'element-plus';

const api = axios.create({
  baseURL: '/api',
  timeout: 300_000, // AI 生成可能需要较长时间
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const msg = error.response?.data?.error || error.message || '请求失败';
    ElMessage.error(msg);
    return Promise.reject(error);
  }
);

export function useApi() {
  return api;
}
