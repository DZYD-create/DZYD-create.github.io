import { mkdir, copyFile, rm } from 'node:fs/promises'

await rm(new URL('../dist/assets/', import.meta.url), { recursive: true, force: true })
await rm(new URL('../dist/index.html', import.meta.url), { force: true })
await mkdir(new URL('../dist/server/', import.meta.url), { recursive: true })
await copyFile(new URL('../server/index.js', import.meta.url), new URL('../dist/server/index.js', import.meta.url))
for (const name of ['dog-thinking.gif','dog-complete.gif','dog-pointing-stars.gif','dog-greeting.gif','dog-thinking-web.gif','dog-complete-web.gif','dog-pointing-stars-web.gif','dog-greeting-web.gif','assistant.png','canvas-bg.svg']) {
  await rm(new URL(`../dist/client/assets/${name}`, import.meta.url), { force: true })
}
