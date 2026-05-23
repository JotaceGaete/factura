import 'dotenv/config'
import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { initDB } from './db/index.js'
import routes from './routes/index.js'

const app = new Hono()

app.use('*', logger())
app.use('*', cors({
  origin: process.env.CORS_ORIGIN || '*',
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
}))

app.get('/health', (c) => c.json({ ok: true, ts: new Date().toISOString() }))

app.route('/', routes)

const PORT = Number(process.env.PORT || 3000)

initDB().then(() => {
  serve({ fetch: app.fetch, port: PORT }, () => {
    console.log(`[server] Running on http://0.0.0.0:${PORT}`)
  })
})
