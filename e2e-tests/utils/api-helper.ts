import { type APIRequestContext, request } from '@playwright/test';
import dotenv from 'dotenv';

dotenv.config();

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:8080/api';

export interface CreateReportOptions {
  patientName: string;
  patientId?: string;
  examDate?: string;
  status?: 'draft' | 'pending_audit' | 'audited' | 'published';
  examData?: {
    bloodPressure?: string;
    heartRate?: string;
    bloodSugar?: string;
  };
  doctorComment?: string;
  workerIndex?: number;
}

export interface ReportData {
  id: string;
  patientName: string;
  patientId: string;
  examDate: string;
  status: string;
  examItems: Array<{
    code: string;
    name: string;
    value: string;
    unit: string;
  }>;
  doctorComment?: string;
  auditComment?: string;
  createdBy?: string;
  updatedAt?: string;
}

let apiContext: APIRequestContext | null = null;

/**
 * 获取或创建 API 请求上下文（单例），使用管理员身份认证
 */
async function getApiContext(): Promise<APIRequestContext> {
  if (apiContext) return apiContext;

  // 使用与 UI 登录相同的凭据
  const apiUsername = 'admin';
  const apiPassword = 'helian@2025';

  console.log(`API 登录：使用用户名 ${apiUsername}, API 地址：${API_BASE_URL}`);

  // 首先尝试不带认证的上下文
  apiContext = await request.newContext({
    baseURL: API_BASE_URL,
    extraHTTPHeaders: {
      'Content-Type': 'application/json',
    },
  });

  // 尝试登录
  const loginData = { username: apiUsername, password: apiPassword };
  console.log(`尝试登录数据格式：${JSON.stringify(loginData)}`);
  
  const loginResponse = await apiContext.post('/auth/login', {
    data: loginData,
  });
  
  const responseData = await loginResponse.json();
  console.log(`登录响应：`, responseData);

  // 检查响应格式 - 可能是 { code, message, data: { token } } 格式
  if (responseData.code === 200 || responseData.code === 0 || responseData.success === true) {
    // 成功响应，尝试获取 token
    const token = responseData.data?.token || responseData.token || responseData.result?.token;
    
    if (token) {
      console.log(`API 登录成功，获取到 token`);
      
      // 重新创建带 token 的上下文
      await apiContext.dispose();
      apiContext = await request.newContext({
        baseURL: API_BASE_URL,
        extraHTTPHeaders: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
      
      return apiContext;
    }
  }
  
  // 如果登录失败，抛出错误
  console.error('API 登录失败:', responseData);
  throw new Error(`API 登录失败：${responseData.message || JSON.stringify(responseData)}`);
}

/**
 * 通过 API 创建测试报告
 * @returns 报告 ID
 */
export async function createTestReport(options: CreateReportOptions): Promise<string> {
  const api = await getApiContext();

  const today = new Date().toISOString().split('T')[0];
  const suffix = options.workerIndex !== undefined ? `_w${options.workerIndex}` : '';

  const response = await api.post('/reports', {
    data: {
      patientName: options.patientName + suffix,
      patientId: options.patientId || `TEST${Date.now()}`,
      examDate: options.examDate || today,
      status: options.status || 'draft',
      examItems: [
        {
          code: 'blood_pressure',
          name: '血压',
          value: options.examData?.bloodPressure || '',
          unit: 'mmHg',
        },
        {
          code: 'heart_rate',
          name: '心率',
          value: options.examData?.heartRate || '',
          unit: '次/分',
        },
        {
          code: 'blood_sugar',
          name: '血糖',
          value: options.examData?.bloodSugar || '',
          unit: 'mmol/L',
        },
      ],
      doctorComment: options.doctorComment || '',
    },
  });

  if (!response.ok()) {
    const errorText = await response.text();
    console.error('创建报告失败:', response.status(), errorText);
    throw new Error(`创建报告失败：${response.status()} - ${errorText}`);
  }

  const data = await response.json();
  console.log('API 响应:', data);
  
  if (!data.id) {
    console.error('API 响应中没有 id 字段:', data);
    throw new Error(`API 响应中没有 id 字段：${JSON.stringify(data)}`);
  }
  
  return data.id;
}

/**
 * 删除测试报告
 */
export async function deleteTestReport(reportId: string): Promise<void> {
  const api = await getApiContext();
  await api.delete(`/reports/${reportId}`);
}

/**
 * 直接通过 API 更新报告状态（用于准备前置数据）
 */
export async function updateReportStatus(
  reportId: string,
  status: string
): Promise<void> {
  const api = await getApiContext();
  await api.patch(`/reports/${reportId}/status`, {
    data: { status },
  });
}

/**
 * 获取报告详情
 */
export async function getReport(reportId: string): Promise<ReportData> {
  const api = await getApiContext();
  const response = await api.get(`/reports/${reportId}`);
  return await response.json();
}

/**
 * 批量清理测试数据（按患者名前缀）
 */
export async function cleanupTestReports(namePrefix: string): Promise<void> {
  const api = await getApiContext();
  await api.post('/reports/cleanup', {
    data: { namePrefix },
  });
}

/**
 * 销毁 API 上下文（在 globalTeardown 中调用）
 */
export async function disposeApiContext(): Promise<void> {
  if (apiContext) {
    await apiContext.dispose();
    apiContext = null;
  }
}
