# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: execution.spec.ts >> Cell Execution >> should show math operation result
- Location: tests/execution.spec.ts:60:3

# Error details

```
TimeoutError: page.fill: Timeout 30000ms exceeded.
Call log:
  - waiting for locator('input#username')

```

# Page snapshot

```yaml
- generic [ref=e3]:
  - generic [ref=e4]: "[plugin:vite:import-analysis] Failed to resolve import \"@uiw/react-codemirror\" from \"src/components/CodeMirrorEditor.tsx\". Does the file exist?"
  - generic [ref=e5]: /app/src/components/CodeMirrorEditor.tsx:1:23
  - generic [ref=e6]: "15 | window.$RefreshSig$ = RefreshRuntime.createSignatureFunctionForTransform; 16 | } 17 | import CodeMirror from \"@uiw/react-codemirror\"; | ^ 18 | import { python } from \"@codemirror/lang-python\"; 19 | import { markdown } from \"@codemirror/lang-markdown\";"
  - generic [ref=e7]: at TransformPluginContext._formatError (file:///app/node_modules/vite/dist/node/chunks/dep-BK3b2jBa.js:49258:41) at TransformPluginContext.error (file:///app/node_modules/vite/dist/node/chunks/dep-BK3b2jBa.js:49253:16) at normalizeUrl (file:///app/node_modules/vite/dist/node/chunks/dep-BK3b2jBa.js:64307:23) at process.processTicksAndRejections (node:internal/process/task_queues:95:5) at async file:///app/node_modules/vite/dist/node/chunks/dep-BK3b2jBa.js:64439:39 at async Promise.all (index 3) at async TransformPluginContext.transform (file:///app/node_modules/vite/dist/node/chunks/dep-BK3b2jBa.js:64366:7) at async PluginContainer.transform (file:///app/node_modules/vite/dist/node/chunks/dep-BK3b2jBa.js:49099:18) at async loadAndTransform (file:///app/node_modules/vite/dist/node/chunks/dep-BK3b2jBa.js:51978:27) at async viteTransformMiddleware (file:///app/node_modules/vite/dist/node/chunks/dep-BK3b2jBa.js:62106:24
  - generic [ref=e8]:
    - text: Click outside, press Esc key, or fix the code to dismiss.
    - text: You can also disable this overlay by setting
    - code [ref=e9]: server.hmr.overlay
    - text: to
    - code [ref=e10]: "false"
    - text: in
    - code [ref=e11]: vite.config.ts
    - text: .
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | test.describe('Cell Execution', () => {
  4  |   test.setTimeout(120000);
  5  | 
  6  |   test.beforeEach(async ({ page }) => {
  7  |     // Login
  8  |     await page.goto('/login');
> 9  |     await page.fill('input#username', 'admin');
     |                ^ TimeoutError: page.fill: Timeout 30000ms exceeded.
  10 |     await page.fill('input#password', 'admin123');
  11 |     await page.click('button:has-text("Sign in")');
  12 |     
  13 |     // Wait for token
  14 |     await page.waitForFunction(() => localStorage.getItem('token') !== null, { timeout: 10000 });
  15 |   });
  16 | 
  17 |   async function createAndOpenNotebook(page: any, name: string) {
  18 |     await page.goto('/notebooks');
  19 |     await page.click('button:has-text("+ New")');
  20 |     await expect(page.locator('text=New Notebook')).toBeVisible();
  21 |     await page.fill('input[value=""]', name);
  22 |     await page.click('button:has-text("Create")');
  23 |     
  24 |     // Wait for notebook editor to load
  25 |     // Monaco tarda en cargar, esperamos el contenedor del editor
  26 |     await page.waitForSelector('.monaco-editor, .monaco-editor-container', { timeout: 15000 });
  27 |     // Esperar a que el editor esté interactuable
  28 |     await page.waitForTimeout(3000);
  29 |   }
  30 | 
  31 |   test('should execute a simple code cell', async ({ page }) => {
  32 |     await createAndOpenNotebook(page, `exec-test-${Date.now()}`);
  33 |     
  34 |     // Interactuar con Monaco
  35 |     const editor = page.locator('.monaco-editor').first();
  36 |     await editor.click();
  37 |     await page.keyboard.press('Control+a');
  38 |     await page.keyboard.type('print("Hello from Playwright!")');
  39 |     
  40 |     // Buscar botón de run
  41 |     const runButton = page.locator('button:has-text("Run"), button[title*="Run"], button:has-text("▶")').first();
  42 |     await runButton.click();
  43 |     
  44 |     // Verificar output
  45 |     await expect(page.locator('text=Hello from Playwright!')).toBeVisible({ timeout: 20000 });
  46 |   });
  47 | 
  48 |   test('should show print output from code', async ({ page }) => {
  49 |     await createAndOpenNotebook(page, `print-test-${Date.now()}`);
  50 |     
  51 |     const editor = page.locator('.monaco-editor').first();
  52 |     await editor.click();
  53 |     await page.keyboard.press('Control+a');
  54 |     await page.keyboard.type('print(42)');
  55 |     
  56 |     await page.click('button:has-text("Run")');
  57 |     await expect(page.locator('text=42')).toBeVisible({ timeout: 20000 });
  58 |   });
  59 | 
  60 |   test('should show math operation result', async ({ page }) => {
  61 |     await createAndOpenNotebook(page, `math-test-${Date.now()}`);
  62 |     
  63 |     const editor = page.locator('.monaco-editor').first();
  64 |     await editor.click();
  65 |     await page.keyboard.press('Control+a');
  66 |     await page.keyboard.type('2 + 2');
  67 |     
  68 |     await page.click('button:has-text("Run")');
  69 |     await expect(page.locator('text=4')).toBeVisible({ timeout: 20000 });
  70 |   });
  71 | 
  72 |   test('should show error on invalid code', async ({ page }) => {
  73 |     await createAndOpenNotebook(page, `error-test-${Date.now()}`);
  74 |     
  75 |     const editor = page.locator('.monaco-editor').first();
  76 |     await editor.click();
  77 |     await page.keyboard.press('Control+a');
  78 |     await page.keyboard.type('1/0');
  79 |     
  80 |     await page.click('button:has-text("Run")');
  81 |     
  82 |     // Verificar que aparece algún error
  83 |     const errorOutput = page.locator('text=ZeroDivisionError, error, Error, or exception');
  84 |     await expect(errorOutput).toBeVisible({ timeout: 20000 });
  85 |   });
  86 | 
  87 |   test('should execute code on mobile viewport', async ({ page }) => {
  88 |     await page.setViewportSize({ width: 375, height: 812 });
  89 |     await createAndOpenNotebook(page, `mobile-exec-${Date.now()}`);
  90 |     
  91 |     const editor = page.locator('.monaco-editor').first();
  92 |     await editor.click();
  93 |     await page.keyboard.press('Control+a');
  94 |     await page.keyboard.type('print("mobile")');
  95 |     
  96 |     await page.click('button:has-text("Run")');
  97 |     await expect(page.locator('text=mobile')).toBeVisible({ timeout: 20000 });
  98 |   });
  99 | });
```