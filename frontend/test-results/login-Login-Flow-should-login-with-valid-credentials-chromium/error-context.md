# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: login.spec.ts >> Login Flow >> should login with valid credentials
- Location: tests/login.spec.ts:12:3

# Error details

```
Error: expect(page).toHaveURL(expected) failed

Expected: "http://207.180.223.160:5173/"
Received: "http://207.180.223.160:5173/login"
Timeout:  10000ms

Call log:
  - Expect "toHaveURL" with timeout 10000ms
    14 × unexpected value "http://207.180.223.160:5173/login"

```

# Page snapshot

```yaml
- generic [ref=e4]:
  - generic [ref=e5]:
    - heading "MyLake" [level=2] [ref=e6]
    - paragraph [ref=e7]: Sign in to your account
  - generic [ref=e8]: Something went wrong
  - generic [ref=e9]:
    - generic [ref=e10]:
      - generic [ref=e11]:
        - generic [ref=e12]: Username
        - textbox "Username" [ref=e13]: admin
      - generic [ref=e14]:
        - generic [ref=e15]: Password
        - textbox "Password" [ref=e16]: admin123
    - button "Sign in" [ref=e17] [cursor=pointer]
  - button "Don't have an account? Register" [ref=e19] [cursor=pointer]
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | test.describe('Login Flow', () => {
  4  |   test('should display login form', async ({ page }) => {
  5  |     await page.goto('/login');
  6  |     
  7  |     await expect(page.locator('input#username')).toBeVisible();
  8  |     await expect(page.locator('input#password')).toBeVisible();
  9  |     await expect(page.locator('button:has-text("Sign in")')).toBeVisible();
  10 |   });
  11 | 
  12 |   test('should login with valid credentials', async ({ page }) => {
  13 |     await page.goto('/login');
  14 |     
  15 |     await page.fill('input#username', 'admin');
  16 |     await page.fill('input#password', 'admin123');
  17 |     await page.click('button:has-text("Sign in")');
  18 |     
> 19 |     await expect(page).toHaveURL('/', { timeout: 10000 });
     |                        ^ Error: expect(page).toHaveURL(expected) failed
  20 |   });
  21 | 
  22 |   test('should show error on invalid credentials', async ({ page }) => {
  23 |     await page.goto('/login');
  24 |     
  25 |     await page.fill('input#username', 'wronguser');
  26 |     await page.fill('input#password', 'wrongpass');
  27 |     await page.click('button:has-text("Sign in")');
  28 |     
  29 |     // Error can be any of these
  30 |     await expect(page.locator('text=Invalid, error, or wrong')).toBeVisible({ timeout: 5000 }).catch(() => {
  31 |       // Fallback - just check we're still on login
  32 |       expect(page.url()).toContain('/login');
  33 |     });
  34 |   });
  35 | });
```