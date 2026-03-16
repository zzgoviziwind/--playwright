// AI 测试生成系统 - 页面分析引擎
// 使用 Playwright 浏览器实际访问目标 URL，提取 DOM 结构

import { chromium } from 'playwright';
import path from 'path';
import type {
  PageAnalysis,
  FormInfo,
  NavInfo,
  TableInfo,
  ButtonInfo,
  InputInfo,
  AnalyzeOptions,
} from './types';

/**
 * 分析目标 URL 的页面结构
 * 启动 Playwright 浏览器访问页面，提取所有交互元素信息
 */
export async function analyzeUrl(
  url: string,
  options: AnalyzeOptions = {}
): Promise<PageAnalysis> {
  const { auth, waitTime = 2000, onProgress, headed = false, recordVideo = false, videoDir, slowMo = 0 } = options;

  const progress = (msg: string) => {
    if (onProgress) onProgress(msg);
  };

  progress(`[分析] 正在启动浏览器... (${headed ? '有头模式' : '无头模式'})${recordVideo ? ' + 录制视频' : ''}`);

  const browser = await chromium.launch({
    headless: !headed,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    slowMo,
  });

  try {
    const contextOptions: any = {
      ignoreHTTPSErrors: true,
      viewport: { width: 1920, height: 1080 },
      locale: 'zh-CN',
    };

    if (recordVideo) {
      contextOptions.recordVideo = {
        dir: videoDir || path.join(__dirname, '../../results/recordings'),
        size: { width: 1920, height: 1080 },
      };
    }

    const context = await browser.newContext(contextOptions);

    // 注入认证信息
    if (auth?.cookies && auth.cookies.length > 0) {
      await context.addCookies(auth.cookies);
      progress('[分析] 已注入认证 Cookie');
    }

    const page = await context.newPage();

    // 注入 localStorage
    if (auth?.localStorage && Object.keys(auth.localStorage).length > 0) {
      await page.goto(url, { waitUntil: 'commit', timeout: 10000 });
      await page.evaluate((storage) => {
        for (const [key, value] of Object.entries(storage)) {
          localStorage.setItem(key, value);
        }
      }, auth.localStorage);
      progress('[分析] 已注入 localStorage');
    }

    progress(`[分析] 正在访问 URL: ${url}`);
    const startTime = Date.now();

    await page.goto(url, {
      waitUntil: 'networkidle',
      timeout: 30000,
    });

    const loadTime = Date.now() - startTime;
    progress(`[分析] 页面加载完成，耗时 ${loadTime}ms`);

    // 等待 SPA 渲染完成
    if (waitTime > 0) {
      await page.waitForTimeout(waitTime);
    }

    // 获取页面标题
    const title = await page.title();

    // 截图
    progress('[分析] 正在截图...');
    const screenshotBuffer = await page.screenshot({ fullPage: true });
    const screenshot = screenshotBuffer.toString('base64');

    // 获取 meta description
    const metaDescription = await page.evaluate(() => {
      const meta = document.querySelector('meta[name="description"]');
      return meta?.getAttribute('content') || '';
    });

    // 提取 DOM 交互元素
    progress('[分析] 正在提取页面元素...');
    const elements = await page.evaluate(() => {
      // ---- 辅助函数（在浏览器上下文执行）----

      /** 获取元素的最佳文本标识 */
      function getElementText(el: Element): string {
        // aria-label
        const ariaLabel = el.getAttribute('aria-label');
        if (ariaLabel) return ariaLabel.trim();
        // title
        const titleAttr = el.getAttribute('title');
        if (titleAttr) return titleAttr.trim();
        // 直接文本（排除子元素过多的情况）
        const text = el.textContent?.trim() || '';
        if (text.length > 0 && text.length < 80) return text;
        return '';
      }

      /** 获取 input 元素关联的 label 文本 */
      function getInputLabel(input: Element): string {
        // 通过 id 查找 label
        const id = input.getAttribute('id');
        if (id) {
          const label = document.querySelector(`label[for="${id}"]`);
          if (label) return label.textContent?.trim() || '';
        }
        // 查找父级 label
        const parentLabel = input.closest('label');
        if (parentLabel) {
          const clone = parentLabel.cloneNode(true) as HTMLElement;
          const inputs = clone.querySelectorAll('input, select, textarea');
          inputs.forEach((i) => i.remove());
          return clone.textContent?.trim() || '';
        }
        // 查找前面的兄弟 label 或文本节点
        const prev = input.previousElementSibling;
        if (prev && (prev.tagName === 'LABEL' || prev.tagName === 'SPAN')) {
          return prev.textContent?.trim() || '';
        }
        return '';
      }

      /** 生成 Playwright 友好的选择器 */
      function buildSelector(el: Element): string {
        // 优先级 1: data-testid
        const testId = el.getAttribute('data-testid');
        if (testId) return `[data-testid="${testId}"]`;

        const tag = el.tagName.toLowerCase();
        const type = el.getAttribute('type') || '';
        const placeholder = el.getAttribute('placeholder') || '';
        const ariaLabel = el.getAttribute('aria-label') || '';
        const role = el.getAttribute('role') || '';
        const text = el.textContent?.trim() || '';
        const name = el.getAttribute('name') || '';

        // 优先级 2: placeholder（适用于 input/textarea）
        if (placeholder && (tag === 'input' || tag === 'textarea')) {
          return `[placeholder="${placeholder}"]`;
        }

        // 优先级 3: aria-label
        if (ariaLabel) {
          return `[aria-label="${ariaLabel}"]`;
        }

        // 优先级 4: role + 名称
        if (role && text && text.length < 40) {
          return `role=${role}[name="${text}"]`;
        }

        // 优先级 5: 按钮/链接的文本
        if ((tag === 'button' || tag === 'a') && text && text.length < 40) {
          return `${tag}:has-text("${text}")`;
        }

        // 优先级 6: name 属性
        if (name) {
          return `${tag}[name="${name}"]`;
        }

        // 优先级 7: type 属性（对 input 有用）
        if (tag === 'input' && type) {
          const id = el.getAttribute('id');
          if (id) return `input#${id}`;
          return `input[type="${type}"]`;
        }

        // 优先级 8: id
        const id = el.getAttribute('id');
        if (id) return `#${id}`;

        // 优先级 9: CSS 类选择器（取第一个有意义的 class）
        const classes = Array.from(el.classList).filter(
          (c) => !c.startsWith('el-') && !c.startsWith('ant-') && !c.startsWith('v-')
        );
        if (classes.length > 0) {
          return `${tag}.${classes[0]}`;
        }

        // Fallback: tag
        return tag;
      }

      /** 检查元素是否可见 */
      function isVisible(el: Element): boolean {
        const style = window.getComputedStyle(el);
        if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
          return false;
        }
        const rect = el.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
      }

      // ---- 提取逻辑 ----

      // 1. 提取表单
      const forms: Array<{
        selector: string;
        fields: Array<{
          name: string;
          type: string;
          label: string;
          required: boolean;
          placeholder: string;
          selector: string;
        }>;
        submitButton: { text: string; selector: string } | null;
      }> = [];

      const formEls = document.querySelectorAll('form');
      const formInputSet = new Set<Element>();

      formEls.forEach((form, i) => {
        if (!isVisible(form)) return;
        const formSelector = buildSelector(form) !== 'form' ? buildSelector(form) : `form:nth-of-type(${i + 1})`;

        const fields: Array<{
          name: string;
          type: string;
          label: string;
          required: boolean;
          placeholder: string;
          selector: string;
        }> = [];

        const inputs = form.querySelectorAll('input, select, textarea');
        inputs.forEach((input) => {
          if (!isVisible(input)) return;
          const inputType = input.getAttribute('type') || (input.tagName === 'textarea' ? 'textarea' : input.tagName === 'select' ? 'select' : 'text');
          if (['hidden', 'submit', 'button', 'reset'].includes(inputType)) return;
          formInputSet.add(input);
          fields.push({
            name: input.getAttribute('name') || '',
            type: inputType,
            label: getInputLabel(input),
            required: input.hasAttribute('required'),
            placeholder: input.getAttribute('placeholder') || '',
            selector: buildSelector(input),
          });
        });

        let submitButton: { text: string; selector: string } | null = null;
        const submitEl = form.querySelector('button[type="submit"], input[type="submit"], button:not([type])');
        if (submitEl && isVisible(submitEl)) {
          submitButton = {
            text: getElementText(submitEl) || '提交',
            selector: buildSelector(submitEl),
          };
        }

        if (fields.length > 0) {
          forms.push({ selector: formSelector, fields, submitButton });
        }
      });

      // 2. 提取导航链接
      const navigation: Array<{ text: string; href: string; selector: string }> = [];
      const navAreas = document.querySelectorAll('nav, header, [role="navigation"], .navbar, .nav, .menu, .sidebar');
      const addedHrefs = new Set<string>();

      navAreas.forEach((area) => {
        const links = area.querySelectorAll('a[href]');
        links.forEach((link) => {
          if (!isVisible(link)) return;
          const href = link.getAttribute('href') || '';
          const text = getElementText(link);
          if (!text || href === '#' || href === 'javascript:void(0)') return;
          if (addedHrefs.has(href)) return;
          addedHrefs.add(href);
          navigation.push({
            text,
            href,
            selector: buildSelector(link),
          });
        });
      });

      // 如果导航区域没找到链接，取 body 下的前 20 个有文本的 a 标签
      if (navigation.length === 0) {
        const allLinks = document.querySelectorAll('a[href]');
        let count = 0;
        allLinks.forEach((link) => {
          if (count >= 20) return;
          if (!isVisible(link)) return;
          const href = link.getAttribute('href') || '';
          const text = getElementText(link);
          if (!text || href === '#' || href === 'javascript:void(0)') return;
          if (addedHrefs.has(href)) return;
          addedHrefs.add(href);
          navigation.push({ text, href, selector: buildSelector(link) });
          count++;
        });
      }

      // 3. 提取表格
      const tables: Array<{ selector: string; headers: string[]; rowCount: number }> = [];
      document.querySelectorAll('table').forEach((table) => {
        if (!isVisible(table)) return;
        const headers: string[] = [];
        table.querySelectorAll('thead th, thead td, tr:first-child th').forEach((th) => {
          const text = th.textContent?.trim() || '';
          if (text) headers.push(text);
        });
        const rows = table.querySelectorAll('tbody tr');
        tables.push({
          selector: buildSelector(table),
          headers,
          rowCount: rows.length,
        });
      });

      // 4. 提取按钮（排除表单内 submit）
      const buttons: Array<{ text: string; selector: string; type: string }> = [];
      document.querySelectorAll('button, [role="button"], input[type="button"]').forEach((btn) => {
        if (!isVisible(btn)) return;
        const text = getElementText(btn);
        if (!text) return;
        // 跳过已作为表单 submit 记录的按钮
        const type = btn.getAttribute('type') || 'button';
        buttons.push({
          text,
          selector: buildSelector(btn),
          type,
        });
      });

      // 5. 提取独立输入框（不在表单内的）
      const inputs: Array<{ label: string; selector: string; type: string; placeholder: string }> = [];
      document.querySelectorAll('input, textarea, select').forEach((input) => {
        if (formInputSet.has(input)) return;
        if (!isVisible(input)) return;
        const inputType = input.getAttribute('type') || (input.tagName === 'TEXTAREA' ? 'textarea' : input.tagName === 'SELECT' ? 'select' : 'text');
        if (['hidden', 'submit', 'button', 'reset'].includes(inputType)) return;
        inputs.push({
          label: getInputLabel(input),
          selector: buildSelector(input),
          type: inputType,
          placeholder: input.getAttribute('placeholder') || '',
        });
      });

      return { forms, navigation, tables, buttons, inputs };
    });

    const stats = [
      `${elements.forms.length} 个表单`,
      `${elements.buttons.length} 个按钮`,
      `${elements.navigation.length} 个导航链接`,
      `${elements.tables.length} 个表格`,
      `${elements.inputs.length} 个独立输入框`,
    ].join(', ');
    progress(`[分析] 发现 ${stats}`);
    progress('[分析] 页面分析完成');

    // 获取录制的视频路径
    let videoPath: string | undefined;
    if (recordVideo) {
      const pages = context.pages();
      if (pages.length > 0) {
        const video = pages[0].video();
        if (video) {
          const savePath = path.join(videoDir || path.join(__dirname, '../../results/recordings'), `recording-${Date.now()}.webm`);
          await video.saveAs(savePath);
          videoPath = savePath;
          progress(`[分析] 视频已保存：${videoPath}`);
        }
      }
    }

    await context.close();

    return {
      url,
      title,
      screenshot,
      meta: {
        description: metaDescription,
        loadTime,
      },
      forms: elements.forms as FormInfo[],
      navigation: elements.navigation as NavInfo[],
      tables: elements.tables as TableInfo[],
      buttons: elements.buttons as ButtonInfo[],
      inputs: elements.inputs as InputInfo[],
      videoPath,
    };
  } finally {
    await browser.close();
  }
}
