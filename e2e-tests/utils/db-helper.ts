import mysql, { type Pool, type PoolOptions } from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

let pool: Pool | null = null;

/**
 * 获取数据库连接池（单例）
 */
export function getConnectionPool(): Pool {
  if (pool) return pool;

  const config: PoolOptions = {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'test_user',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'hospital_exam',
    waitForConnections: true,
    connectionLimit: 5,
    queueLimit: 0,
  };

  pool = mysql.createPool(config);
  return pool;
}

/**
 * 重置测试数据到初始状态
 * 清理所有以测试前缀命名的报告数据
 */
export async function resetTestData(): Promise<void> {
  const db = getConnectionPool();
  await db.execute(
    `DELETE FROM exam_reports WHERE patient_name LIKE ? OR patient_name LIKE ?`,
    ['冒烟测试%', '回归测试%']
  );
  await db.execute(
    `DELETE FROM exam_reports WHERE patient_id LIKE ?`,
    ['TEST%']
  );
}

/**
 * 按命名前缀清理报告数据
 */
export async function cleanupReportsByPrefix(prefix: string): Promise<void> {
  const db = getConnectionPool();
  await db.execute(
    `DELETE FROM exam_reports WHERE patient_name LIKE ?`,
    [`${prefix}%`]
  );
}

/**
 * 从数据库层面验证报告状态
 */
export async function getReportStatusFromDB(reportId: string): Promise<string> {
  const db = getConnectionPool();
  const [rows] = await db.execute(
    `SELECT status FROM exam_reports WHERE id = ?`,
    [reportId]
  );
  const result = rows as Array<{ status: string }>;
  return result.length > 0 ? result[0].status : '';
}

/**
 * 获取指定患者的报告数量
 */
export async function getReportCountByPatient(patientName: string): Promise<number> {
  const db = getConnectionPool();
  const [rows] = await db.execute(
    `SELECT COUNT(*) as count FROM exam_reports WHERE patient_name = ?`,
    [patientName]
  );
  const result = rows as Array<{ count: number }>;
  return result[0].count;
}

/**
 * 关闭数据库连接池（在 globalTeardown 中调用）
 */
export async function closeConnectionPool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}
