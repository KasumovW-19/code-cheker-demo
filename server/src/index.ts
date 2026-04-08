import express from 'express'
import cors from 'cors'
import { prisma } from './prisma'

const app = express()

app.use(cors())
app.use(express.json())

app.get('/api/health', (_, res) => {
  res.json({ ok: true })
})

app.post('/api/code/activate', async (req, res) => {
  try {
    const rawCode = req.body?.code

    if (typeof rawCode !== 'string') {
      return res.status(400).json({
        success: false,
        reason: 'invalid_request',
        message: 'Код не передан'
      })
    }

    const code = rawCode.trim().toUpperCase()

    if (!code) {
      return res.status(400).json({
        success: false,
        reason: 'empty_code',
        message: 'Введите код'
      })
    }

    const result = await prisma.code.updateMany({
      where: {
        code,
        status: 'new'
      },
      data: {
        status: 'activated',
        activatedAt: new Date()
      }
    })

    if (result.count === 1) {
      return res.json({
        success: true,
        reason: 'activated',
        message: 'Код успешно активирован'
      })
    }

    const existingCode = await prisma.code.findUnique({
      where: { code }
    })

    if (!existingCode) {
      return res.status(404).json({
        success: false,
        reason: 'not_found',
        message: 'Такого кода не существует'
      })
    }

    return res.status(409).json({
      success: false,
      reason: 'already_activated',
      message: 'Код уже активирован'
    })
  } catch (error) {
    console.error(error)

    return res.status(500).json({
      success: false,
      reason: 'server_error',
      message: 'Ошибка сервера'
    })
  }
})

const port = 4000

app.listen(port, () => {
  console.log(`Server started on http://localhost:${port}`)
})