import { prisma } from './prisma'

const codes = [
  'DEMO-1111',
  'DEMO-2222',
  'DEMO-3333',
  'DEMO-4444',
  'DEMO-5555'
]

async function main() {
  for (const code of codes) {
    await prisma.code.upsert({
      where: { code },
      update: {},
      create: { code }
    })
  }

  console.log('Seed completed')
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (error) => {
    console.error(error)
    await prisma.$disconnect()
    process.exit(1)
  })