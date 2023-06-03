import { FastifyInstance } from 'fastify'
import { z } from 'zod'

import { prisma } from '../lib/prisma'

export async function categoriesRoutes(app: FastifyInstance) {
  app.addHook('preHandler', async (request) => {
    await request.jwtVerify()
  })

  app.get('/categories', async () => {
    const categories = await prisma.category.findMany()

    return categories
  })

  app.get('/categories/:id/products', async (request) => {
    const paramsSchema = z.object({
      id: z.string().uuid(),
    })

    const { id } = paramsSchema.parse(request.params)

    const products = await prisma.product.findMany({
      where: {
        categoryId: id,
      },
      include: {
        productInventories: true,
        category: true,
      },
    })

    return products.map((product) => {
      return {
        id: product.id,
        category: product.category.name,
        brand: product.brand,
        model: product.model,
        excerpt: product.description?.substring(0, 75).concat('...'),
        hourlyValue: product.hourlyValue,
        coverUrl: product.coverUrl,
      }
    })
  })

  app.post('/categories', async (request, reply) => {
    const bodySchema = z.object({
      name: z.string(),
    })

    const { name } = bodySchema.parse(request.body)

    const hasCategory = await prisma.category.findFirst({
      where: {
        name,
      },
    })

    if (hasCategory) {
      return reply.status(400).send({ error: 'Essa categoria já existe' })
    }

    await prisma.category.create({
      data: {
        name,
      },
    })
  })

  app.put('/categories/:id', async (request) => {
    const paramsSchema = z.object({
      id: z.string().uuid(),
    })

    const { id } = paramsSchema.parse(request.params)

    const bodySchema = z.object({
      name: z.string(),
    })

    const { name } = bodySchema.parse(request.body)

    const category = await prisma.category.update({
      where: {
        id,
      },
      data: {
        name,
      },
    })

    return category
  })

  app.delete('/categories/:id', async (request) => {
    const paramsSchema = z.object({
      id: z.string().uuid(),
    })

    const { id } = paramsSchema.parse(request.params)

    await prisma.category.delete({
      where: {
        id,
      },
    })
  })
}
