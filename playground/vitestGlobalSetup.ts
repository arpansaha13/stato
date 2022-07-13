import os from 'os'
import path from 'path'
import fs from 'fs-extra'
import type { BrowserServer } from 'playwright-chromium'
import { chromium } from 'playwright-chromium'

const DIR = path.join(os.tmpdir(), 'vitest_playwright_global_setup')

let browserServer: BrowserServer | undefined

export async function setup() {
  browserServer = await chromium.launchServer()

  await fs.mkdirp(DIR)
  await fs.writeFile(path.join(DIR, 'wsEndpoint'), browserServer.wsEndpoint())
}

export async function teardown() {
  browserServer?.close()
  console.log(process.env.VITE_PRESERVE_BUILD_ARTIFACTS)
  if (!process.env.VITE_PRESERVE_BUILD_ARTIFACTS) {
    fs.removeSync(path.resolve(__dirname, '../playground-temp'))
  }
}
