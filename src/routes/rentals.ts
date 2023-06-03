import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import ShortUniqueId from 'short-unique-id'
import dayjs from 'dayjs'

import { prisma } from '../lib/prisma'

export async function rentalsRoutes(app: FastifyInstance) {
  app.addHook('preHandler', async (request) => {
    await request.jwtVerify()
  })

  app.get('/rentals', async (request) => {
    const querySchema = z.object({
      status: z.string().nullable().default(null),
    })

    const { status } = querySchema.parse(request.query)

    if (!status) {
      const rentals = await prisma.rental.findMany({
        orderBy: {
          createdAt: 'desc',
        },
      })

      return rentals
    }

    const rentals = await prisma.rental.findMany({
      where: {
        status: {
          contains: status,
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    return rentals
  })

  app.post('/rentals', async (request, reply) => {
    const bodySchema = z.object({
      productId: z.string().uuid(),
      duration: z.number(),
    })

    const { duration, productId } = bodySchema.parse(request.body)

    const pendency = await prisma.pendency.findFirst({
      where: {
        customerId: request.user.sub,
        resolvedAt: null,
      },
    })

    if (pendency) {
      return reply.status(400).send({
        error:
          'Você precisa resolver suas pendências antes de alugar um equipamento',
      })
    }

    const product = await prisma.productInventory.findFirst({
      where: {
        id: productId,
        status: 'Disponível',
      },
      include: {
        product: true,
      },
    })

    if (!product) {
      return reply
        .status(400)
        .send({ error: 'Desculpe, mas este equipamento já está reservado' })
    }

    const hourlyValue = product.product.hourlyValue

    const generate = new ShortUniqueId({ length: 6 })
    const code = String(generate()).toUpperCase()

    await prisma.rental.create({
      data: {
        customerId: request.user.sub,
        productId,
        status: 'Pendente',
        duration,
        price: hourlyValue * (duration / 60),
        code,
      },
    })

    await prisma.productInventory.update({
      where: {
        id: productId,
      },
      data: {
        status: 'Reservado',
      },
    })

    setTimeout(async () => {
      const rental = await prisma.rental.findFirst({
        where: {
          code,
          status: 'Pendente',
        },
      })

      if (rental) {
        await prisma.productInventory.update({
          where: {
            id: rental.productId,
          },
          data: {
            status: 'Disponível',
          },
        })

        await prisma.rental.update({
          where: {
            id: rental.id,
          },
          data: {
            status: 'Cancelado',
          },
        })
      }
    }, 1000 * 60 * 60)

    return { code }
  })

  app.patch('/rentals/confirm/pickup', async (request, reply) => {
    const bodySchema = z.object({
      code: z.string(),
    })

    const { code } = bodySchema.parse(request.body)

    const rental = await prisma.rental.findFirst({
      where: {
        code,
      },
    })

    if (!rental) {
      return reply.status(400).send({ error: 'Código inválido!' })
    }

    if (rental.status === 'Cancelado') {
      return reply.status(400).send({
        error:
          'Este aluguel foi cancelado, pois o tempo limite de retirada foi ultrapassado',
      })
    }

    if (rental.status !== 'Pendente') {
      return reply.status(400).send({
        error:
          'Só é possível confirmar a retirada de um aluguel com status pendente',
      })
    }

    const updatedRental = await prisma.rental.update({
      where: {
        id: rental.id,
      },
      data: {
        status: 'Ativo',
        createdAt: dayjs().toDate(),
      },
    })

    return updatedRental
  })

  app.patch('/rentals/confirm/return', async (request, reply) => {
    const bodySchema = z.object({
      code: z.string(),
    })

    const { code } = bodySchema.parse(request.body)

    const rental = await prisma.rental.findFirst({
      where: {
        code,
      },
    })

    if (!rental) {
      return reply.status(400).send({ error: 'Código inválido!' })
    }

    if (rental.status !== 'Ativo') {
      return reply.status(400).send({
        error:
          'Só é possível confirmar a devolução de um aluguel com status ativo',
      })
    }

    await prisma.productInventory.update({
      where: {
        id: rental.productId,
      },
      data: {
        status: 'Disponível',
      },
    })

    const timeBetweenRentalConfirmationAndReturn = dayjs().diff(
      rental.createdAt,
      'minute',
    )

    if (timeBetweenRentalConfirmationAndReturn > rental.duration + 10) {
      await prisma.rental.update({
        where: {
          id: rental.id,
        },
        data: {
          status: 'Concluído com atraso',
        },
      })

      const delay = timeBetweenRentalConfirmationAndReturn - rental.duration
      const value = delay * 0.25 * 100

      const pendency = await prisma.pendency.create({
        data: {
          customerId: request.user.sub,
          rentalId: rental.id,
          delay,
          value,
        },
      })

      return {
        hasPendency: true,
        data: { ...pendency },
      }
    }

    const updatedRental = await prisma.rental.update({
      where: {
        id: rental.id,
      },
      data: {
        status: 'Concluído',
      },
    })

    return {
      hasPendency: false,
      data: { ...updatedRental },
    }
  })
}
