import os from 'os'
import path from 'path'
import fs from 'fs-extra'
import { spawn } from 'child_process'
import { chromium } from 'playwright-chromium'
import { beforeAll, beforeEach } from 'vitest'

import type { ChildProcess } from 'child_process'
import type { Browser, Page } from 'playwright-chromium'

export let page: Page = undefined!
let browser: Browser = undefined!

const isWindows = process.platform === 'win32'

const DIR = path.join(os.tmpdir(), 'vitest_playwright_global_setup')

beforeAll(async () => {
  const wsEndpoint = fs.readFileSync(path.join(DIR, 'wsEndpoint'), 'utf-8')
  if (!wsEndpoint) {
    throw new Error('wsEndpoint not found')
  }

  browser = await chromium.connect(wsEndpoint)
  page = await browser.newPage()

  return async () => {
    await page?.close()
    if (browser) {
      await browser.close()
    }
  }
})
beforeEach(async (testCtx) => {
  const testFilePath = testCtx.meta.file?.filepath!
  const testDir = path.resolve(path.dirname(testFilePath), '..')

  let child: ChildProcess

  new Promise<void>((resolve) => {
    child = spawn('pnpm', ['test:stato'], {
      cwd: testDir,
      shell: true,
    })
    child.stdout!.on('data', async (buff: Buffer) => {
      const data = buff.toString()
      if (data.includes('> Local:')) {
        const statoMainUrl = `http://localhost:3700`
        await page.goto(statoMainUrl)
        resolve()
      }
    })
  })
  return () => {
    // child.kill() is not working in Windows
    if (isWindows && child.pid)
      spawn('taskkill', ['/pid', child.pid.toString(), '/f', '/t'])
    else child.kill()
  }
})
