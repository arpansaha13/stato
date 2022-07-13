import { page } from '../../../../test-utils'
// TODO: complete writing tests

test('should show initial stato ui', async () => {
  expect(await page.textContent('.sidebar')).toContain('Button')
  expect(await page.textContent('.sidebar')).toContain('Navbar')
  expect(await page.textContent('.sidebar')).toContain('Page')
})
