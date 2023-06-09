import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import bcryptjs from 'bcryptjs'

import { prisma } from '../lib/prisma'

export async function customersRoutes(app: FastifyInstance) {
  app.get('/customers', async (request) => {
    await request.jwtVerify()

    const customers = await prisma.customer.findMany({
      include: {
        user: true,
      },
      orderBy: {
        user: {
          name: 'asc',
        },
      },
    })

    return customers.map((customer) => {
      return {
        id: customer.id,
        name: customer.user.name,
        email: customer.user.email,
        phone: customer.user.phone,
        cpf: customer.user.cpf,
        address: customer.user.address,
        avatarUrl: customer.user.avatarUrl,
      }
    })
  })

  app.get('/customers/pendencies', async (request) => {
    await request.jwtVerify()

    const activePendencies = await prisma.pendency.findMany({
      where: {
        customerId: request.user.sub,
        resolvedAt: null,
      },
    })

    const completedPendencies = await prisma.pendency.findMany({
      where: {
        customerId: request.user.sub,
        resolvedAt: {
          not: null,
        },
      },
      orderBy: {
        resolvedAt: 'desc',
      },
    })

    return {
      active: [...activePendencies],
      completed: [...completedPendencies],
    }
  })

  app.get('/customers/rentals', async (request) => {
    await request.jwtVerify()

    const activeRentals = await prisma.rental.findMany({
      where: {
        customerId: request.user.sub,
        status: 'Ativo',
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    const completedRentals = await prisma.rental.findMany({
      where: {
        customerId: request.user.sub,
        OR: [{ status: 'Concluído' }, { status: 'Concluído com atraso' }],
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    return {
      active: [...activeRentals],
      completed: [...completedRentals],
    }
  })

  app.post('/customers', async (request, reply) => {
    const bodySchema = z.object({
      name: z.string(),
      cpf: z.string(),
      phone: z.string(),
      address: z.string(),
      email: z.string().email(),
      password: z.string().min(6, 'A senha precisa de no mínimo 6 caracteres'),
      avatarUrl: z.string().nullable().default(null),
    })

    const { name, cpf, phone, address, email, password, avatarUrl } =
      bodySchema.parse(request.body)

    const customer = await prisma.user.findFirst({
      where: {
        OR: [{ cpf }, { email }],
      },
    })

    if (customer) {
      return reply.status(400).send({
        error:
          'Este usuário já existe, verifique se você digitou o email e o cpf correto!',
      })
    }

    const passwordHash = await bcryptjs.hash(password, 10)

    const newUser = await prisma.user.create({
      data: {
        name,
        cpf,
        phone,
        address,
        email,
        passwordHash,
        avatarUrl,
        customer: {
          create: {},
        },
      },
      include: {
        customer: true,
      },
    })

    return {
      id: newUser.customer?.id,
      name: newUser.name,
      email: newUser.email,
      phone: newUser.phone,
      cpf: newUser.cpf,
      address: newUser.address,
      avatarUrl: newUser.avatarUrl,
    }
  })

  app.put('/customers/:id', async (request, reply) => {
    await request.jwtVerify()

    const paramsSchema = z.object({
      id: z.string().uuid(),
    })

    const { id } = paramsSchema.parse(request.params)

    const bodySchema = z.object({
      name: z.string(),
      cpf: z.string(),
      phone: z.string(),
      address: z.string(),
      email: z.string().email(),
      passwordHash: z.string(),
      avatarUrl: z.string().nullable(),
    })

    const { name, cpf, phone, address, email, passwordHash, avatarUrl } =
      bodySchema.parse(request.body)

    let customer = await prisma.user.findFirst({
      where: {
        email,
        cpf,
      },
    })

    if (customer) {
      return reply.status(400).send({ error: 'Este usuário já existe!' })
    }

    customer = await prisma.user.update({
      where: {
        id,
      },
      data: {
        name,
        cpf,
        phone,
        address,
        email,
        passwordHash,
        avatarUrl,
      },
    })

    return customer
  })

  app.delete('/customers/:id', async (request) => {
    await request.jwtVerify()

    const paramsSchema = z.object({
      id: z.string().uuid(),
    })

    const { id } = paramsSchema.parse(request.params)

    await prisma.user.delete({
      where: {
        id,
      },
    })
  })
}
