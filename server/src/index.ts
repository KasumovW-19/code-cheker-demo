import express from 'express'
import cors from 'cors'
import path from 'path'
import { prisma } from './prisma'
import { Prisma } from '../generated/prisma/client'

const app = express()

app.use(cors())
app.use(express.json())

function generateCode(length = 8) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let result = ''

  for (let i = 0; i < length; i += 1) {
    result += chars[Math.floor(Math.random() * chars.length)]
  }

  return result
}

async function createUniqueCode() {
  while (true) {
    const code = generateCode(8)

    try {
      const created = await prisma.code.create({
        data: { code }
      })

      return created
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        continue
      }

      throw error
    }
  }
}

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

app.get('/api/admin/codes', async (_, res) => {
  try {
    const codes = await prisma.code.findMany({
      orderBy: {
        createdAt: 'desc'
      }
    })

    return res.json({
      success: true,
      items: codes
    })
  } catch (error) {
    console.error(error)

    return res.status(500).json({
      success: false,
      message: 'Не удалось получить список кодов'
    })
  }
})

app.post('/api/admin/codes', async (req, res) => {
  try {
    const rawCount = req.body?.count
    const count = typeof rawCount === 'number' ? rawCount : 1

    if (!Number.isInteger(count) || count < 1 || count > 100) {
      return res.status(400).json({
        success: false,
        message: 'count должен быть целым числом от 1 до 100'
      })
    }

    const createdItems = []

    for (let i = 0; i < count; i += 1) {
      const created = await createUniqueCode()
      createdItems.push(created)
    }

    return res.status(201).json({
      success: true,
      items: createdItems
    })
  } catch (error) {
    console.error(error)

    return res.status(500).json({
      success: false,
      message: 'Не удалось создать коды'
    })
  }
})

app.delete('/api/admin/codes/:id', async (req, res) => {
  try {
    const id = Number(req.params.id)

    if (!Number.isInteger(id)) {
      return res.status(400).json({
        success: false,
        message: 'Некорректный id'
      })
    }

    const existing = await prisma.code.findUnique({
      where: { id }
    })

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'Код не найден'
      })
    }

    await prisma.code.delete({
      where: { id }
    })

    return res.json({
      success: true,
      message: 'Код удалён'
    })
  } catch (error) {
    console.error(error)

    return res.status(500).json({
      success: false,
      message: 'Не удалось удалить код'
    })
  }
})

const clientDistPath = path.join(path.resolve(), '../client/dist')

app.use(express.static(clientDistPath))

app.get(/^(?!\/api).*/, (_, res) => {
  res.sendFile(path.join(clientDistPath, 'index.html'))
})

const port = Number(process.env.PORT) || 4000

app.listen(port, () => {
  console.log(`Server started on http://localhost:${port}`)
})