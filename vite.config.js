import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'
import { contactMiddleware } from './server/contact.mjs'
import { askMiddleware } from './server/ask.mjs'

export default defineConfig(({ mode }) => {
  const handleContact = contactMiddleware(loadEnv(mode, process.cwd(), 'CONTACT_'))

  const handleAsk = askMiddleware(loadEnv(mode, process.cwd(), 'EURI_').EURI_API_KEY)

  return {
    plugins: [
      react(),
      {
        name: 'portfolio-api',
        configureServer(server) {
          server.middlewares.use(handleContact)
          server.middlewares.use(handleAsk)
        },
        configurePreviewServer(server) {
          server.middlewares.use(handleContact)
          server.middlewares.use(handleAsk)
        },
      },
    ],
  }
})
