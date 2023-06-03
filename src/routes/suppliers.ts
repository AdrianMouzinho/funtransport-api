import { FastifyInstance } from 'fastify'
import { z } from 'zod'

import { prisma } from '../lib/prisma'

export async function suppliersRoutes(app: FastifyInstance) {
  app.get('/suppliers', async () => {
    const suppliers = await prisma.supplier.findMany()

    return suppliers
  })

  app.post('/suppliers', async (request, reply) => {
    await request.jwtVerify()

    const bodySchema = z.object({
      name: z.string(),
      phone: z.string(),
      email: z.string().email(),
      cnpj: z.string(),
    })

    const { name, phone, email, cnpj } = bodySchema.parse(request.body)

    const supplier = await prisma.supplier.findUnique({
      where: {
        email,
      },
    })

    if (supplier) {
      return reply.status(400).send({ error: 'Este fornecedor já existe!' })
    }

    await prisma.supplier.create({
      data: {
        name,
        phone,
        email,
        cnpj,
      },
    })
  })

  app.put('/suppliers/:id', async (request, reply) => {
    await request.jwtVerify()

    const paramsSchema = z.object({
      id: z.string().uuid(),
    })

    const { id } = paramsSchema.parse(request.params)

    const bodySchema = z.object({
      name: z.string(),
      phone: z.string(),
      email: z.string().email(),
      cnpj: z.string(),
    })

    const { name, phone, email, cnpj } = bodySchema.parse(request.body)

    let supplier = await prisma.supplier.findUnique({
      where: {
        email,
      },
    })

    if (supplier) {
      return reply.status(400).send({ error: 'Este fornecedor já existe!' })
    }

    supplier = await prisma.supplier.update({
      where: {
        id,
      },
      data: {
        name,
        phone,
        email,
        cnpj,
      },
    })

    return supplier
  })

  app.delete('/suppliers/:id', async (request) => {
    await request.jwtVerify()

    const paramsSchema = z.object({
      id: z.string().uuid(),
    })

    const { id } = paramsSchema.parse(request.params)

    await prisma.supplier.delete({
      where: {
        id,
      },
    })
  })
}
