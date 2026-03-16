import { defineStore } from 'pinia';
import { ref, watch } from 'vue';
import type { TestStep } from '../types/analyzer.types';

export const useVisualBuilderStore = defineStore('visual-builder', () => {
  const testName = ref('');
  const testDescription = ref('');
  const category = ref<'smoke' | 'regression'>('smoke');
  const baseUrl = ref('');
  const steps = ref<TestStep[]>([]);
  const generatedCode = ref('');

  let stepCounter = 0;

  function addStep(step: Omit<TestStep, 'id' | 'enabled'>) {
    steps.value.push({
      ...step,
      id: `step-${++stepCounter}`,
      enabled: true,
    });
    generateCode();
  }

  function removeStep(id: string) {
    steps.value = steps.value.filter((s) => s.id !== id);
    generateCode();
  }

  function moveStep(fromIndex: number, toIndex: number) {
    if (toIndex < 0 || toIndex >= steps.value.length) return;
    const arr = [...steps.value];
    const [moved] = arr.splice(fromIndex, 1);
    arr.splice(toIndex, 0, moved);
    steps.value = arr;
    generateCode();
  }

  function updateStep(id: string, updates: Partial<TestStep>) {
    const idx = steps.value.findIndex((s) => s.id === id);
    if (idx >= 0) {
      steps.value[idx] = { ...steps.value[idx], ...updates };
      generateCode();
    }
  }

  /** 将步骤列表转换为 Playwright 代码 */
  function generateCode() {
    const enabledSteps = steps.value.filter((s) => s.enabled);
    if (enabledSteps.length === 0) {
      generatedCode.value = '';
      return;
    }

    const name = testName.value || '未命名测试';
    const desc = testDescription.value ? `\n// ${testDescription.value}` : '';
    const timestamp = new Date().toISOString().split('T')[0];

    const codeLines = enabledSteps.map((step) => stepToCode(step)).filter(Boolean);

    generatedCode.value = `// AI 可视化构建 - ${timestamp}${desc}

import { test, expect } from '@playwright/test';

test.describe('${name}', () => {
  test('${name}', async ({ page }) => {
${codeLines.map((line) => `    ${line}`).join('\n')}
  });
});
`;
  }

  function stepToCode(step: TestStep): string {
    const sel = step.selector || '';
    const val = step.value || '';

    switch (step.type) {
      case 'navigate':
        return `await page.goto('${val}');`;
      case 'click':
        return `await page.locator('${sel}').click();`;
      case 'fill':
        return `await page.locator('${sel}').fill('${val}');`;
      case 'select':
        return `await page.locator('${sel}').selectOption('${val}');`;
      case 'check':
        return `await page.locator('${sel}').check();`;
      case 'assert-visible':
        return `await expect(page.locator('${sel}')).toBeVisible();`;
      case 'assert-text':
        return `await expect(page.locator('${sel}')).toContainText('${val}');`;
      case 'assert-url':
        return `await expect(page).toHaveURL(/${val.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/);`;
      case 'wait':
        return `await page.waitForTimeout(${parseInt(val, 10) || 1000});`;
      default:
        return `// 未知步骤类型: ${step.type}`;
    }
  }

  function reset() {
    testName.value = '';
    testDescription.value = '';
    category.value = 'smoke';
    baseUrl.value = '';
    steps.value = [];
    generatedCode.value = '';
    stepCounter = 0;
  }

  // 自动重新生成代码
  watch([testName, testDescription], () => {
    if (steps.value.length > 0) generateCode();
  });

  return {
    testName,
    testDescription,
    category,
    baseUrl,
    steps,
    generatedCode,
    addStep,
    removeStep,
    moveStep,
    updateStep,
    generateCode,
    reset,
  };
});
