<template>
  <div class="test-recorder">
    <el-card shadow="never">
      <template #header>
        <div class="recorder-header">
          <span>测试录制器</span>
          <el-tag v-if="isRecording" type="danger" effect="dark">录制中</el-tag>
          <el-tag v-else-if="isPaused" type="warning" effect="dark">已暂停</el-tag>
        </div>
      </template>

      <!-- 录制控制面板 -->
      <div class="recorder-controls">
        <el-button
          v-if="!isRecording"
          type="danger"
          :loading="starting"
          @click="startRecording"
        >
          <el-icon><VideoCamera /></el-icon>
          开始录制
        </el-button>
        <el-button v-else type="success" @click="stopRecording">
          <el-icon><CircleClose /></el-icon>
          停止录制
        </el-button>
        <el-button v-if="isRecording && !isPaused" @click="pauseRecording">
          <el-icon><VideoPause /></el-icon>
          暂停
        </el-button>
        <el-button v-if="isRecording && isPaused" type="warning" @click="resumeRecording">
          <el-icon><VideoPlay /></el-icon>
          继续
        </el-button>
      </div>

      <!-- 录制配置 -->
      <el-form :model="config" label-width="120px" size="small">
        <el-form-item label="目标 URL">
          <el-input v-model="config.baseUrl" placeholder="http://localhost:8080" />
        </el-form-item>
        <el-form-item label="浏览器">
          <el-select v-model="config.browser" style="width: 200px">
            <el-option label="Chrome" value="chrome" />
            <el-option label="Firefox" value="firefox" />
            <el-option label="WebKit" value="webkit" />
          </el-select>
        </el-form-item>
        <el-form-item label=" Headless 模式">
          <el-switch v-model="config.headless" />
        </el-form-item>
        <el-form-item label="录制超时 (秒)">
          <el-input-number v-model="config.timeout" :min="30" :max="600" :step="30" />
        </el-form-item>
      </el-form>

      <!-- 录制的操作步骤 -->
      <div class="recorded-actions" v-if="actions.length > 0">
        <h4>已录制的操作 ({{ actions.length }})</h4>
        <el-timeline>
          <el-timeline-item
            v-for="(action, index) in actions"
            :key="index"
            :timestamp="action.timestamp"
            placement="top"
            :type="getActionType(action.type)"
          >
            <el-card>
              <div class="action-content">
                <span class="action-type">{{ getActionLabel(action.type) }}</span>
                <span class="action-target">{{ action.target }}</span>
                <span v-if="action.value" class="action-value">"{{ action.value }}"</span>
              </div>
              <el-button size="small" type="danger" link @click="removeAction(index)">
                删除
              </el-button>
            </el-card>
          </el-timeline-item>
        </el-timeline>
      </div>

      <!-- 生成的代码预览 -->
      <div v-if="generatedCode" class="code-preview">
        <h4>生成的测试代码</h4>
        <Codemirror
          v-model="generatedCode"
          :options="cmOptions"
          class="preview-editor"
          :readonly="false"
        />
        <div class="preview-actions">
          <el-button @click="copyCode">复制代码</el-button>
          <el-button type="primary" @click="saveTest">保存测试文件</el-button>
        </div>
      </div>

      <!-- 已保存的测试文件列表 -->
      <div class="saved-files" v-if="savedFiles.length > 0">
        <h4>已保存的测试文件 ({{ savedFiles.length }})</h4>
        <el-table :data="savedFiles" style="width: 100%" size="small" @row-click="loadFileContent">
          <el-table-column prop="name" label="文件名" />
          <el-table-column prop="size" label="大小" width="100" :formatter="formatFileSize" />
          <el-table-column prop="modifiedAt" label="修改时间" width="180" :formatter="formatDate" />
          <el-table-column label="操作" width="220" fixed="right">
            <template #default="{ row }">
              <el-button size="small" type="primary" link @click.stop="loadFileContent(row)">
                查看
              </el-button>
              <el-button size="small" type="success" link @click.stop="runTest(row)">
                运行
              </el-button>
              <el-button size="small" type="warning" link @click.stop="showMoveDialog(row)">
                移动
              </el-button>
              <el-button size="small" type="danger" link @click.stop="deleteFile(row)">
                删除
              </el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </el-card>

    <!-- 移动文件对话框 -->
    <el-dialog v-model="moveDialogVisible" title="移动到测试项目" width="400px">
      <el-form :model="moveForm" label-width="100px">
        <el-form-item label="目标项目">
          <el-select v-model="moveForm.targetProject" placeholder="请选择目标项目" style="width: 100%">
            <el-option label="冒烟测试 (smoke)" value="smoke" />
            <el-option label="回归测试 (regression)" value="regression" />
            <el-option label="AI 示例测试 (ai-example)" value="ai-example" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="moveDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="confirmMoveFile" :loading="moving">移动</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue';
import { ElMessage } from 'element-plus';
import { VideoCamera, VideoPlay, VideoPause, CircleClose } from '@element-plus/icons-vue';
import { Codemirror } from 'vue-codemirror';
import { useApi } from '../composables/useApi';
import { useWebSocket } from '../composables/useWebSocket';

const api = useApi();
const { subscribe, onEvent } = useWebSocket();

// 订阅 recorder 频道
subscribe('recorder');

// 在组件挂载时加载文件列表
onMounted(() => {
  loadSavedFiles();
});

interface RecordedAction {
  type: 'click' | 'fill' | 'check' | 'select' | 'navigate' | 'assert';
  target: string;
  value?: string;
  timestamp: string;
}

interface RecorderConfig {
  baseUrl: string;
  browser: 'chrome' | 'firefox' | 'webkit';
  headless: boolean;
  timeout: number;
}

const isRecording = ref(false);
const isPaused = ref(false);
const starting = ref(false);
const actions = ref<RecordedAction[]>([]);
const generatedCode = ref('');
const savedFiles = ref<Array<{ name: string; path: string; size: number; modifiedAt: string }>>([]);
const loadingFiles = ref(false);

// 移动文件对话框
const moveDialogVisible = ref(false);
const moveForm = reactive({
  targetProject: '',
  currentFile: null as { name: string } | null,
});
const moving = ref(false);

// 运行测试状态
const runningTest = ref(false);

const config = reactive<RecorderConfig>({
  baseUrl: 'http://localhost:8080',
  browser: 'chrome',
  headless: false,
  timeout: 300,
});

const cmOptions = {
  mode: 'text/typescript',
  lineNumbers: true,
  readOnly: false,
  theme: 'one-dark',
};

// WebSocket 事件处理
onEvent('recorder:started', () => {
  isRecording.value = true;
  isPaused.value = false;
  actions.value = [];
  ElMessage.success('录制已启动，请在浏览器中操作');
});

onEvent('recorder:paused', () => {
  isPaused.value = true;
  ElMessage.info('录制已暂停');
});

onEvent('recorder:resumed', () => {
  isPaused.value = false;
  ElMessage.success('录制已继续');
});

onEvent('recorder:stopped', (data) => {
  isRecording.value = false;
  isPaused.value = false;
  actions.value = data.actions || [];
  generateCode();
  ElMessage.success('录制已停止');
});

onEvent('recorder:action', (data) => {
  if (isRecording.value && !isPaused.value) {
    actions.value.push(data.action);
    generateCode();
  }
});

// 加载已保存的文件列表
async function loadSavedFiles() {
  loadingFiles.value = true;
  try {
    const { data } = await api.get('/recorder/files');
    savedFiles.value = data.files || [];
  } catch (error) {
    ElMessage.error('加载文件列表失败：' + (error as Error).message);
  } finally {
    loadingFiles.value = false;
  }
}

// 加载文件内容
async function loadFileContent(file: { name: string }) {
  try {
    const { data } = await api.get(`/recorder/files/${file.name}`);
    generatedCode.value = data.content;
    ElMessage.success(`已加载文件：${file.name}`);
  } catch (error) {
    ElMessage.error('加载文件失败：' + (error as Error).message);
  }
}

// 删除文件
async function deleteFile(file: { name: string }) {
  try {
    await api.delete(`/recorder/files/${file.name}`);
    ElMessage.success(`文件 ${file.name} 已删除`);
    loadSavedFiles();
  } catch (error) {
    ElMessage.error('删除文件失败：' + (error as Error).message);
  }
}

// 显示移动对话框
function showMoveDialog(file: { name: string }) {
  moveForm.currentFile = file;
  moveForm.targetProject = '';
  moveDialogVisible.value = true;
}

// 确认移动文件
async function confirmMoveFile() {
  if (!moveForm.targetProject) {
    ElMessage.warning('请选择目标项目');
    return;
  }
  if (!moveForm.currentFile) {
    ElMessage.error('文件信息丢失');
    return;
  }

  moving.value = true;
  try {
    await api.post(`/recorder/files/${moveForm.currentFile.name}/move`, {
      targetProject: moveForm.targetProject,
    });
    ElMessage.success(`文件已移动到 ${moveForm.targetProject} 项目`);
    moveDialogVisible.value = false;
    loadSavedFiles();
  } catch (error) {
    ElMessage.error('移动文件失败：' + (error as Error).message);
  } finally {
    moving.value = false;
  }
}

// 运行测试
async function runTest(file: { name: string }) {
  runningTest.value = true;
  try {
    const { data } = await api.post(`/recorder/files/${file.name}/run`);
    ElMessage.success(`测试执行已启动：${file.name}`);
    // 可以选择跳转到测试执行页面
  } catch (error) {
    ElMessage.error('运行测试失败：' + (error as Error).message);
  } finally {
    runningTest.value = false;
  }
}

// 格式化文件大小
function formatFileSize(row: { size: number }) {
  const size = row.size;
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

// 格式化日期
function formatDate(row: { modifiedAt: string }) {
  return new Date(row.modifiedAt).toLocaleString('zh-CN');
}

// 保存测试后刷新文件列表
async function saveTest() {
  if (!generatedCode.value) {
    ElMessage.warning('暂无可保存的测试代码');
    return;
  }

  const filename = `recorded-${Date.now()}.spec.ts`;
  try {
    await api.post('/recorder/save', { code: generatedCode.value, filename });
    ElMessage.success(`测试文件已保存：${filename}`);
    loadSavedFiles(); // 刷新文件列表
  } catch (error) {
    ElMessage.error('保存失败：' + (error as Error).message);
  }
}

function getActionType(type: string): 'primary' | 'success' | 'warning' | 'info' {
  const map: Record<string, any> = {
    click: 'primary',
    fill: 'success',
    check: 'warning',
    select: 'info',
    navigate: 'primary',
    assert: 'success',
  };
  return map[type] || 'info';
}

function getActionLabel(type: string): string {
  const map: Record<string, string> = {
    click: '点击',
    fill: '输入',
    check: '勾选',
    select: '选择',
    navigate: '导航',
    assert: '断言',
  };
  return map[type] || type;
}

async function startRecording() {
  starting.value = true;
  try {
    await api.post('/recorder/start', config);
    // 录制启动成功后，WebSocket 会收到 recorder:started 事件
  } catch (error) {
    ElMessage.error('启动录制失败：' + (error as Error).message);
    starting.value = false;
  }
}

async function stopRecording() {
  try {
    const { data } = await api.post('/recorder/stop');
    // WebSocket 会收到 recorder:stopped 事件，这里已经通过 onEvent 处理
  } catch (error) {
    ElMessage.error('停止录制失败：' + (error as Error).message);
  }
}

async function pauseRecording() {
  try {
    await api.post('/recorder/pause');
    // WebSocket 会收到 recorder:paused 事件
  } catch (error) {
    ElMessage.error('暂停录制失败：' + (error as Error).message);
  }
}

async function resumeRecording() {
  try {
    await api.post('/recorder/resume');
    // WebSocket 会收到 recorder:resumed 事件
  } catch (error) {
    ElMessage.error('继续录制失败：' + (error as Error).message);
  }
}

function removeAction(index: number) {
  actions.value.splice(index, 1);
  generateCode();
}

// 根据录制的操作生成 Playwright 测试代码（优化版：合并连续的输入操作）
function generateCode() {
  if (actions.value.length === 0) {
    generatedCode.value = '';
    return;
  }

  // 优化操作：合并连续的相同目标的 fill 操作，只保留最后一个值
  const optimizedActions: RecordedAction[] = [];
  let lastFillTarget: string | null = null;
  let lastFillAction: RecordedAction | null = null;

  for (const action of actions.value) {
    if (action.type === 'fill') {
      if (lastFillTarget === action.target) {
        // 同一个目标的连续输入，更新最后一个 fill 操作
        if (lastFillAction) {
          lastFillAction.value = action.value;
        }
      } else {
        // 新目标的输入，添加前一个 fill 操作并开始新的
        if (lastFillAction) {
          optimizedActions.push(lastFillAction);
        }
        lastFillTarget = action.target;
        lastFillAction = { ...action };
      }
    } else if (action.type === 'navigate') {
      // 跳过连续的重复 navigate
      const lastAction = optimizedActions.length > 0 ? optimizedActions[optimizedActions.length - 1] : null;
      if (!lastAction || lastAction.type !== 'navigate' || lastAction.target !== action.target) {
        if (lastFillAction) {
          optimizedActions.push(lastFillAction);
          lastFillAction = null;
          lastFillTarget = null;
        }
        optimizedActions.push(action);
      }
    } else {
      // 其他操作，先保存 pending 的 fill
      if (lastFillAction) {
        optimizedActions.push(lastFillAction);
        lastFillAction = null;
        lastFillTarget = null;
      }
      optimizedActions.push(action);
    }
  }

  // 添加最后一个 pending 的 fill
  if (lastFillAction) {
    optimizedActions.push(lastFillAction);
  }

  let code = `import { test, expect } from '@playwright/test';

test('录制的测试', async ({ page }) => {
`;

  optimizedActions.forEach((action) => {
    switch (action.type) {
      case 'navigate':
        code += `  await page.goto('${escapeString(action.target)}');\n`;
        break;
      case 'click':
        code += `  await page.click('${escapeString(action.target)}');\n`;
        break;
      case 'fill':
        code += `  await page.fill('${escapeString(action.target)}', '${escapeString(action.value || '')}');\n`;
        break;
      case 'check':
        code += `  await page.check('${escapeString(action.target)}');\n`;
        break;
      case 'select':
        code += `  await page.selectOption('${escapeString(action.target)}', '${escapeString(action.value || '')}');\n`;
        break;
      case 'assert':
        code += `  await expect(page.locator('${escapeString(action.target)}')).toContainText('${escapeString(action.value || '')}');\n`;
        break;
    }
  });

  code += `});
`;

  generatedCode.value = code;
}

// 转义字符串中的特殊字符
function escapeString(str: string): string {
  return str
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t');
}

async function copyCode() {
  await navigator.clipboard.writeText(generatedCode.value);
  ElMessage.success('代码已复制到剪贴板');
}
</script>

<style scoped>
.test-recorder {
  padding: 20px;
}

.recorder-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.recorder-controls {
  margin-bottom: 20px;
  display: flex;
  gap: 10px;
}

.recorded-actions {
  margin-top: 20px;
  max-height: 400px;
  overflow-y: auto;
}

.action-content {
  display: flex;
  gap: 12px;
  align-items: center;
  flex-wrap: wrap;
}

.action-type {
  font-weight: 600;
  color: #409EFF;
}

.action-target {
  font-family: monospace;
  background: #f5f7fa;
  padding: 2px 8px;
  border-radius: 4px;
}

.action-value {
  color: #67C23A;
  font-family: monospace;
}

.code-preview {
  margin-top: 20px;
}

.preview-editor {
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  height: 400px;
}

.preview-actions {
  margin-top: 12px;
  display: flex;
  gap: 10px;
}

.saved-files {
  margin-top: 24px;
}

.saved-files h4 {
  margin-bottom: 12px;
  color: #303133;
  font-size: 14px;
}

.test-recorder {
  padding: 20px;
}
</style>
