import { FastifyInstance } from 'fastify'
import { z } from 'zod'

import { prisma } from '../lib/prisma'

export async function productsRoutes(app: FastifyInstance) {
  app.get('/productsInventory', async (request) => {
    await request.jwtVerify()

    const products = await prisma.productInventory.findMany({
      include: {
        product: true,
        productColors: {
          include: {
            color: true,
          },
        },
        productSizes: {
          include: {
            size: true,
          },
        },
      },
    })

    return products.map((product) => {
      return {
        id: product.id,
        model: product.product.model,
        brand: product.product.brand,
        status: product.status,
        coverUrl: product.product.coverUrl,
        color: product.productColors[0].color.code,
        size: product.productSizes[0].size.size,
      }
    })
  })

  app.get('/products', async () => {
    const products = await prisma.product.findMany({
      where: {
        productInventories: {
          some: {
            status: 'Disponível',
          },
        },
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

  app.get('/products/:id', async (request) => {
    const paramsSchema = z.object({
      id: z.string().uuid(),
    })

    const { id } = paramsSchema.parse(request.params)

    const product = await prisma.product.findUniqueOrThrow({
      where: {
        id,
      },
      include: {
        category: true,
      },
    })

    const availableQuantity = await prisma.productInventory.count({
      where: {
        AND: [{ productId: id }, { status: 'Disponível' }],
      },
    })

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
      orderBy: {
        size: 'asc',
      },
    })

    const possibleSizes = await prisma.size.findMany({
      where: {
        productSizes: {
          some: {
            product: {
              productId: id,
            },
          },
        },
      },
      orderBy: {
        size: 'asc',
      },
    })

    const possibleColors = await prisma.color.findMany({
      where: {
        productColors: {
          some: {
            product: {
              productId: id,
            },
          },
        },
      },
    })

    return {
      id: product.id,
      category: product.category.name,
      brand: product.brand,
      model: product.model,
      description: product.description,
      hourlyValue: product.hourlyValue,
      coverUrl: product.coverUrl,
      availableQuantity,
      sizes: sizes.map((size) => {
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
      }),
      possibleColors,
      possibleSizes,
    }
  })

  app.post('/products', async (request) => {
    await request.jwtVerify()

    const bodySchema = z.object({
      model: z.string(),
      brand: z.string(),
      description: z.string(),
      hourlyValue: z.number(),
      coverUrl: z.string().url(),
      categoryId: z.string().uuid(),
      supplierId: z.string().uuid(),
      colorId: z.string().uuid(),
      sizeId: z.string().uuid(),
    })

    const {
      brand,
      categoryId,
      colorId,
      coverUrl,
      description,
      hourlyValue,
      model,
      sizeId,
      supplierId,
    } = bodySchema.parse(request.body)

    const product = await prisma.product.findUnique({
      where: {
        model_brand: {
          brand,
          model,
        },
      },
    })

    if (product) {
      const productInventory = await prisma.productInventory.create({
        data: {
          productId: product.id,
          status: 'Disponível',
          productColors: {
            create: {
              colorId,
            },
          },
          productSizes: {
            create: {
              sizeId,
            },
          },
        },
        include: {
          productColors: {
            include: {
              color: true,
            },
          },
          productSizes: {
            include: {
              size: true,
            },
          },
        },
      })

      return {
        id: productInventory.id,
        model: product.model,
        brand: product.brand,
        status: productInventory.status,
        coverUrl: product.coverUrl,
        color: productInventory.productColors[0].color.code,
        size: productInventory.productSizes[0].size.size,
      }
    }

    const newProduct = await prisma.product.create({
      data: {
        brand,
        model,
        description,
        coverUrl,
        categoryId,
        supplierId,
        hourlyValue,
        productInventories: {
          create: {
            status: 'Disponível',
            productColors: {
              create: {
                colorId,
              },
            },
            productSizes: {
              create: {
                sizeId,
              },
            },
          },
        },
      },
      include: {
        productInventories: {
          include: {
            productColors: {
              include: {
                color: true,
              },
            },
            productSizes: {
              include: {
                size: true,
              },
            },
          },
        },
      },
    })

    return {
      id: newProduct.productInventories[0].id,
      model: newProduct.model,
      brand: newProduct.brand,
      status: newProduct.productInventories[0].status,
      coverUrl: newProduct.coverUrl,
      color: newProduct.productInventories[0].productColors[0].color.code,
      size: newProduct.productInventories[0].productSizes[0].size.size,
    }
  })

  app.put('/products/:id', async (request) => {
    await request.jwtVerify()
  })

  app.delete('/products/:id', async (request) => {
    await request.jwtVerify()

    const paramsSchema = z.object({
      id: z.string().uuid(),
    })

    const { id } = paramsSchema.parse(request.params)

    const product = await prisma.productInventory.findUniqueOrThrow({
      where: {
        id,
      },
      include: {
        productColors: true,
        productSizes: true,
      },
    })

    await prisma.productColor.deleteMany({
      where: {
        colorId: product.productColors[0].colorId,
        productId: product.id,
      },
    })

    await prisma.productSize.deleteMany({
      where: {
        sizeId: product.productSizes[0].sizeId,
        productId: product.id,
      },
    })

    await prisma.productInventory.delete({
      where: {
        id,
      },
    })
  })
}
