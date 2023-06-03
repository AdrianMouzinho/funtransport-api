import fastify from 'fastify'
import cors from '@fastify/cors'
import jwt from '@fastify/jwt'
import multipart from '@fastify/multipart'
import { resolve } from 'node:path'

import { productsRoutes } from './routes/products'
import { categoriesRoutes } from './routes/categories'
import { colorsRoutes } from './routes/colors'
import { sizesRoutes } from './routes/sizes'
import { suppliersRoutes } from './routes/suppliers'
import { customersRoutes } from './routes/customers'
import { authRoutes } from './routes/auth'
import { rentalsRoutes } from './routes/rentals'
import { employeesRoutes } from './routes/employees'
import { uploadRoutes } from './routes/upload'

const port = process.env.PORT ? Number(process.env.PORT) : 3333
const app = fastify()

app.register(multipart)

app.register(require('@fastify/static'), {
  root: resolve(__dirname, '../uploads'),
  prefix: '/uploads',
})

app.register(cors, {
  origin: true,
})

app.register(jwt, {
  secret: process.env.JWT_SECRET!,
})

app.register(authRoutes)
app.register(uploadRoutes)
app.register(rentalsRoutes)
app.register(customersRoutes)
app.register(employeesRoutes)
app.register(productsRoutes)
app.register(categoriesRoutes)
app.register(colorsRoutes)
app.register(sizesRoutes)
app.register(suppliersRoutes)

app
  .listen({
    port,
    host: '0.0.0.0',
  })
  .then(() => {
    console.log(`🚀 HTTP Server running on http://localhost:${port}`)
  })
