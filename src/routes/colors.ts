import { FastifyInstance } from 'fastify'
import { z } from 'zod'

import { prisma } from '../lib/prisma'

export async function colorsRoutes(app: FastifyInstance) {
  app.addHook('preHandler', async (request) => {
    await request.jwtVerify()
  })

  app.get('/colors', async () => {
    const colors = await prisma.color.findMany()

    return colors
  })

  app.get('/products/:id/colors', async (request) => {
    const paramsSchema = z.object({
      id: z.string().uuid(),
    })

    const { id } = paramsSchema.parse(request.params)

    const colors = await prisma.color.findMany({
      where: {
        productColors: {
          some: {
            product: {
              productId: id,
              status: 'Disponível',
            },
          },
        },
      },
      include: {
        productColors: {
          where: {
            product: {
              productId: id,
              status: 'Disponível',
            },
          },
          include: {
            product: {
              include: {
                productSizes: {
                  include: {
                    size: true,
                  },
                },
              },
            },
          },
        },
      },
    })

    return colors.map((color) => {
      return {
        id: color.id,
        code: color.code,
        name: color.name,
        sizes: color.productColors
          .map((productColor) =>
            productColor.product.productSizes.map(
              (productSize) => productSize.size,
            ),
          )
          .map((color) => color[0]),
      }
    })
  })

  app.post('/colors', async (request) => {
    const bodySchema = z.object({
      code: z.string(),
      name: z.string(),
    })

    const { code, name } = bodySchema.parse(request.body)

    await prisma.color.create({
      data: {
        code,
        name,
      },
    })
  })

  app.put('/colors/:id', async (request) => {
    const paramsSchema = z.object({
      id: z.string().uuid(),
    })

    const { id } = paramsSchema.parse(request.params)

    const bodySchema = z.object({
      code: z.string(),
      name: z.string(),
    })

    const { code, name } = bodySchema.parse(request.body)

    const color = await prisma.color.update({
      where: {
        id,
      },
      data: {
        code,
        name,
      },
    })

    return color
  })

  app.delete('/colors/:id', async (request) => {
    const paramsSchema = z.object({
      id: z.string().uuid(),
    })

    const { id } = paramsSchema.parse(request.params)

    await prisma.color.delete({
      where: {
        id,
      },
    })
  })
}
