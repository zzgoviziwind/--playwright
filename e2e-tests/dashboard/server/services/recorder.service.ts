// 测试录制器服务 - 基于 Playwright

import { chromium } from 'playwright';
import type { Browser, BrowserContext, Page } from 'playwright';
import { socketManager } from '../ws/socket-manager';

interface RecorderConfig {
  baseUrl: string;
  browser: 'chrome' | 'firefox' | 'webkit';
  headless: boolean;
  timeout: number;
}

export interface RecordedAction {
  type: 'click' | 'fill' | 'check' | 'select' | 'navigate' | 'assert';
  target: string;
  value?: string;
  timestamp: string;
  selector?: string;
}

class TestRecorder {
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private page: Page | null = null;
  private isRecording = false;
  private isPaused = false;
  private actions: RecordedAction[] = [];
  private config: RecorderConfig | null = null;
  private recordingTimeout: NodeJS.Timeout | null = null;

  /** 启动录制 */
  async start(config: RecorderConfig): Promise<void> {
    if (this.isRecording) {
      throw new Error('录制正在进行中');
    }

    this.config = config;
    this.actions = [];
    this.isRecording = true;
    this.isPaused = false;

    // 启动浏览器
    this.browser = await chromium.launch({
      headless: config.headless,
      channel: config.browser === 'chrome' ? 'chrome' : undefined,
    });

    this.context = await this.browser.newContext();
    this.page = await this.context.newPage();

    // 设置页面事件监听器
    await this.setupPageListeners();

    // 导航到目标 URL
    if (config.baseUrl) {
      await this.page.goto(config.baseUrl);
      this.addAction({
        type: 'navigate',
        target: config.baseUrl,
        timestamp: new Date().toISOString(),
      });
    }

    // 设置录制超时
    this.recordingTimeout = setTimeout(() => {
      this.stop();
    }, config.timeout * 1000);

    socketManager.broadcast('recorder', {
      type: 'recorder:started',
      config,
    });
  }

  /** 暂停录制 */
  pause(): void {
    this.isPaused = true;
    socketManager.broadcast('recorder', {
      type: 'recorder:paused',
    });
  }

  /** 继续录制 */
  resume(): void {
    this.isPaused = false;
    socketManager.broadcast('recorder', {
      type: 'recorder:resumed',
    });
  }

  /** 停止录制 */
  async stop(): Promise<RecordedAction[]> {
    this.isRecording = false;
    this.isPaused = false;

    if (this.recordingTimeout) {
      clearTimeout(this.recordingTimeout);
      this.recordingTimeout = null;
    }

    if (this.context) {
      await this.context.close();
      this.context = null;
      this.page = null;
    }

    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }

    const actions = [...this.actions];

    socketManager.broadcast('recorder', {
      type: 'recorder:stopped',
      actions,
    });

    return actions;
  }

  /** 获取录制的操作 */
  getActions(): RecordedAction[] {
    return [...this.actions];
  }

  /** 生成 Playwright 测试代码 */
  generateCode(actions?: RecordedAction[]): string {
    const actionsToUse = actions || this.actions;

    if (actionsToUse.length === 0) {
      return '// 暂无录制的操作';
    }

    let code = `import { test, expect } from '@playwright/test';

test('录制的测试', async ({ page }) => {
`;

    actionsToUse.forEach((action) => {
      switch (action.type) {
        case 'navigate':
          code += `  await page.goto('${action.target}');\n`;
          break;
        case 'click':
          code += `  await page.click('${action.target}');\n`;
          break;
        case 'fill':
          code += `  await page.fill('${action.target}', '${action.value}');\n`;
          break;
        case 'check':
          code += `  await page.check('${action.target}');\n`;
          break;
        case 'select':
          code += `  await page.selectOption('${action.target}', '${action.value}');\n`;
          break;
        case 'assert':
          code += `  await expect(page.locator('${action.target}')).toContainText('${action.value}');\n`;
          break;
      }
    });

    code += `});
`;

    return code;
  }

  /** 添加录制的操作 */
  private addAction(action: RecordedAction): void {
    if (!this.isRecording || this.isPaused) return;

    this.actions.push(action);

    socketManager.broadcast('recorder', {
      type: 'recorder:action',
      action,
      actionCount: this.actions.length,
    });
  }

  /** 设置页面事件监听器 - 通过注入脚本监听用户操作 */
  private async setupPageListeners(): Promise<void> {
    if (!this.page) return;

    // 注入脚本监听页面事件
    await this.page.addInitScript(() => {
      // 监听点击事件
      document.addEventListener('click', (event) => {
        const target = event.target as HTMLElement;
        const selector = this.getSelector(target);
        if (selector) {
          (window as any).__recordAction?.({
            type: 'click',
            target: selector,
            timestamp: new Date().toISOString(),
          });
        }
      }, true);

      // 监听输入事件
      document.addEventListener('input', (event) => {
        const target = event.target as HTMLInputElement;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
          const selector = this.getSelector(target);
          if (selector && target.value) {
            (window as any).__recordAction?.({
              type: 'fill',
              target: selector,
              value: target.value,
              timestamp: new Date().toISOString(),
            });
          }
        }
      }, true);

      // 监听选择框变化
      document.addEventListener('change', (event) => {
        const target = event.target as HTMLSelectElement;
        if (target.tagName === 'SELECT') {
          const selector = this.getSelector(target);
          if (selector) {
            (window as any).__recordAction?.({
              type: 'select',
              target: selector,
              value: target.value,
              timestamp: new Date().toISOString(),
            });
          }
        }
      }, true);

      // 监听 checkbox/radio 变化
      document.addEventListener('change', (event) => {
        const target = event.target as HTMLInputElement;
        if (target.type === 'checkbox' || target.type === 'radio') {
          const selector = this.getSelector(target);
          if (selector) {
            (window as any).__recordAction?.({
              type: 'check',
              target: selector,
              value: target.checked ? 'checked' : 'unchecked',
              timestamp: new Date().toISOString(),
            });
          }
        }
      }, true);

      // 辅助函数：获取元素选择器
      (window as any).getSelector = (element: HTMLElement): string => {
        if (element.id) {
          return `#${element.id}`;
        }
        if (element.className && typeof element.className === 'string') {
          const classes = element.className.trim().split(/\s+/).join('.');
          if (classes) {
            return `${element.tagName.toLowerCase()}.${classes}`;
          }
        }
        if (element.getAttribute('data-testid')) {
          return `[data-testid="${element.getAttribute('data-testid')}"]`;
        }
        if (element.getAttribute('name')) {
          return `[name="${element.getAttribute('name')}"]`;
        }
        //  fallback 到 CSS path
        const path: string[] = [];
        let current = element;
        while (current && current.nodeType === 1) {
          let selector = current.tagName.toLowerCase();
          if (current.id) {
            selector += `#${current.id}`;
            path.unshift(selector);
            break;
          }
          path.unshift(selector);
          current = current.parentElement as HTMLElement;
        }
        return path.join(' > ');
      };
    });

    // 设置 page 暴露的函数来接收录制事件
    await this.page.exposeFunction('__recordAction', (action: RecordedAction) => {
      this.addAction(action);
    });

    // 监听导航事件
    this.page.on('framenavigated', (frame) => {
      if (frame === this.page?.mainFrame()) {
        const url = frame.url();
        if (url && url !== 'about:blank') {
          this.addAction({
            type: 'navigate',
            target: url,
            timestamp: new Date().toISOString(),
          });
        }
      }
    });
  }
}

// 单例模式
export const testRecorder = new TestRecorder();
