import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import bcryptjs from 'bcryptjs'

import { prisma } from '../lib/prisma'

export async function authRoutes(app: FastifyInstance) {
  app.post('/signIn', async (request, reply) => {
    const bodySchema = z.object({
      email: z.string().email(),
      password: z.string(),
    })

    const { email, password } = bodySchema.parse(request.body)

    const user = await prisma.user.findUnique({
      where: {
        email,
      },
      include: {
        customer: true,
      },
    })

    if (!user) {
      return reply.status(400).send({ error: 'E-mail ou senha inválidos' })
    }

    const isValidPassword = await bcryptjs.compare(password, user.passwordHash)

    if (!isValidPassword) {
      return reply.status(400).send({ error: 'E-mail ou senha inválidos' })
    }

    const token = app.jwt.sign(
      {
        name: user.name,
        avatarUrl: user.avatarUrl,
      },
      {
        sub: user.customer?.id,
        expiresIn: '7 days',
      },
    )

    return { token }
  })
}
