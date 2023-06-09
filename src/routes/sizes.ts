import { FastifyInstance } from 'fastify'
import { z } from 'zod'

import { prisma } from '../lib/prisma'

export async function sizesRoutes(app: FastifyInstance) {
  app.get('/sizes', async (request, reply) => {
    const sizes = await prisma.size.findMany({
      orderBy: {
        size: 'asc',
      },
    })

    return sizes
  })

  app.get('/products/:id/sizes', async (request) => {
    const paramsSchema = z.object({
      id: z.string().uuid(),
    })

    const { id } = paramsSchema.parse(request.params)

    const sizes = await prisma.size.findMany({
      where: {
        productSizes: {
          some: {
            product: {
              productId: id,
              status: 'Disponível',
            },
          },
        },
      },
      include: {
        productSizes: {
          where: {
            product: {
              productId: id,
              status: 'Disponível',
            },
          },
          include: {
            product: {
              include: {
                productColors: {
                  include: {
                    color: true,
                  },
                },
              },
            },
          },
        },
      },
    })

    return sizes.map((size) => {
      return {
        id: size.id,
        size: size.size,
        colors: size.productSizes
          .map((productSize) =>
            productSize.product.productColors.map(
              (productColor) => productColor.color,
            ),
          )
          .map((color) => color[0]),
      }
    })
  })

  app.post('/sizes', async (request, reply) => {
    await request.jwtVerify()

    const bodySchema = z.object({
      size: z.number(),
    })

    const { size } = bodySchema.parse(request.body)

    const hasSize = await prisma.size.findFirst({
      where: {
        size,
      },
    })

    if (hasSize) {
      return reply.status(400).send({ error: 'Esse tamanho já existe' })
    }

    await prisma.size.create({
      data: {
        size,
      },
    })
  })

  app.put('/sizes/:id', async (request) => {
    await request.jwtVerify()

    const paramsSchema = z.object({
      id: z.string().uuid(),
    })

    const { id } = paramsSchema.parse(request.params)

    const bodySchema = z.object({
      size: z.number(),
    })

    const { size } = bodySchema.parse(request.body)

    const sizeEntity = await prisma.size.update({
      where: {
        id,
      },
      data: {
        size,
      },
    })

    return sizeEntity
  })

  app.delete('/sizes/:id', async (request) => {
    await request.jwtVerify()

    const paramsSchema = z.object({
      id: z.string().uuid(),
    })

    const { id } = paramsSchema.parse(request.params)

    await prisma.size.delete({
      where: {
        id,
      },
    })
  })
}
