// URL 分析与可视化构建相关类型

/** 表单字段信息 */
export interface FormFieldInfo {
  name: string;
  type: string;
  label: string;
  required: boolean;
  placeholder: string;
  selector: string;
}

/** 表单信息 */
export interface FormInfo {
  selector: string;
  fields: FormFieldInfo[];
  submitButton: { text: string; selector: string } | null;
}

/** 导航链接信息 */
export interface NavInfo {
  text: string;
  href: string;
  selector: string;
}

/** 表格信息 */
export interface TableInfo {
  selector: string;
  headers: string[];
  rowCount: number;
}

/** 按钮信息 */
export interface ButtonInfo {
  text: string;
  selector: string;
  type: string;
}

/** 输入框信息 */
export interface InputInfo {
  label: string;
  selector: string;
  type: string;
  placeholder: string;
}

/** 页面分析结果 */
export interface PageAnalysis {
  url: string;
  title: string;
  screenshot: string;
  meta: {
    description: string;
    loadTime: number;
  };
  forms: FormInfo[];
  navigation: NavInfo[];
  tables: TableInfo[];
  buttons: ButtonInfo[];
  inputs: InputInfo[];
}

/** 可视化构建器 - 测试步骤 */
export interface TestStep {
  id: string;
  type:
    | 'navigate'
    | 'click'
    | 'fill'
    | 'select'
    | 'check'
    | 'assert-visible'
    | 'assert-text'
    | 'assert-url'
    | 'wait';
  selector?: string;
  value?: string;
  description: string;
  enabled: boolean;
}

/** 可视化构建器 - 测试定义 */
export interface VisualTest {
  name: string;
  description: string;
  category: 'smoke' | 'regression';
  baseUrl: string;
  steps: TestStep[];
}

/** 步骤类型定义 */
export interface StepTypeInfo {
  type: TestStep['type'];
  label: string;
  icon: string;
  group: 'navigation' | 'interaction' | 'assertion';
  needsSelector: boolean;
  needsValue: boolean;
  valuePlaceholder?: string;
}

/** 预定义步骤类型 */
export const STEP_TYPES: StepTypeInfo[] = [
  { type: 'navigate', label: '访问 URL', icon: 'Link', group: 'navigation', needsSelector: false, needsValue: true, valuePlaceholder: 'https://example.com' },
  { type: 'wait', label: '等待时间', icon: 'Clock', group: 'navigation', needsSelector: false, needsValue: true, valuePlaceholder: '毫秒数，如 1000' },
  { type: 'click', label: '点击元素', icon: 'Pointer', group: 'interaction', needsSelector: true, needsValue: false },
  { type: 'fill', label: '输入文本', icon: 'Edit', group: 'interaction', needsSelector: true, needsValue: true, valuePlaceholder: '要输入的文本' },
  { type: 'select', label: '选择选项', icon: 'Select', group: 'interaction', needsSelector: true, needsValue: true, valuePlaceholder: '选项值' },
  { type: 'check', label: '勾选复选框', icon: 'Check', group: 'interaction', needsSelector: true, needsValue: false },
  { type: 'assert-visible', label: '元素可见', icon: 'View', group: 'assertion', needsSelector: true, needsValue: false },
  { type: 'assert-text', label: '文本包含', icon: 'Document', group: 'assertion', needsSelector: true, needsValue: true, valuePlaceholder: '期望的文本' },
  { type: 'assert-url', label: 'URL 匹配', icon: 'Link', group: 'assertion', needsSelector: false, needsValue: true, valuePlaceholder: 'URL 包含的关键词' },
];
