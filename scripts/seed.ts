import "dotenv/config"
import {
  BlogPost,
  ClothType,
  EcommerceOrderStatus,
  Faq,
  PaymentStatus,
  Product,
  ProductMasterType,
  StitchingOrderStatus,
  TailorPayoutStatus,
  UserRole,
} from "@prisma/client"
import { db } from "@/lib/db"
import { hashPassword } from "@/lib/auth-utils"
import { CLOTH_OPTIONS } from "@/lib/cloth-options"

type MasterRecord = {
  id: string
  name: string
  slug: string
}

const DUMMY_PASSWORD = "dummy12345"

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
}

function pick<T>(arr: T[], index: number) {
  return arr[index % arr.length]
}

function pickMany<T>(arr: T[], start: number, count: number) {
  const out: T[] = []
  for (let i = 0; i < count; i += 1) {
    out.push(arr[(start + i) % arr.length])
  }
  return out
}

async function clearDatabase() {
  await db.productMasterSelection.deleteMany()
  await db.productFaq.deleteMany()
  await db.faq.deleteMany()
  await db.productReview.deleteMany()
  await db.pushSubscription.deleteMany()
  await db.notification.deleteMany()
  await db.payment.deleteMany()
  await db.review.deleteMany()
  await db.assignment.deleteMany()
  await db.stitchingOrder.deleteMany()
  await db.orderItem.deleteMany()
  await db.order.deleteMany()
  await db.blogPost.deleteMany()
  await db.measurement.deleteMany()
  await db.address.deleteMany()
  await db.tailorProfile.deleteMany()
  await db.product.deleteMany()
  await db.stitchingService.deleteMany()
  await db.fabricOption.deleteMany()
  await db.productMaster.deleteMany()
  await db.user.deleteMany()
}

async function seedFabricOptions() {
  await db.fabricOption.createMany({
    data: CLOTH_OPTIONS.map((item, index) => ({
      id: item.id,
      name: item.name,
      clothType: item.clothType,
      buyRatePerMeter: item.buyRatePerMeter,
      sellRatePerMeter: item.sellRatePerMeter,
      stockMeters: item.stockMeters + index * 10,
      image: item.image || `https://ik.imagekit.io/demo/tailorhub/fabrics/${item.id}.jpg`,
      description: item.description || "Seeded fabric option",
      isActive: true,
    })),
    skipDuplicates: true,
  })
}

async function seedMasters() {
  const categoryNames = [
    "Shirts",
    "Trousers",
    "Kurtas",
    "Sarees",
    "Blazers",
    "Lehengas",
    "Dresses",
    "Jackets",
    "Jeans",
    "Ethnic Sets",
  ]

  const clothTypeNames = [
    "Casual",
    "Formal",
    "Party Wear",
    "Wedding",
    "Daily Wear",
    "Office",
    "Traditional",
    "Western",
    "Sport",
    "Premium",
  ]

  const materialNames = [
    "Cotton",
    "Linen",
    "Silk",
    "Wool",
    "Denim",
    "Polyester",
    "Rayon",
    "Satin",
    "Georgette",
    "Khadi",
  ]

  const sizeNames = ["XS", "S", "M", "L", "XL", "XXL", "3XL", "28", "30", "32"]

  const colorNames = [
    "Black",
    "White",
    "Navy",
    "Grey",
    "Maroon",
    "Olive",
    "Cream",
    "Red",
    "Blue",
    "Green",
  ]

  const categories: MasterRecord[] = []
  for (const name of categoryNames) {
    const created = await db.productMaster.create({
      data: {
        name,
        slug: slugify(name),
        type: ProductMasterType.CATEGORY,
        isActive: true,
      },
      select: { id: true, name: true, slug: true },
    })
    categories.push(created)
  }

  const subcategories: MasterRecord[] = []
  for (let i = 0; i < 10; i += 1) {
    const parent = categories[i]
    const name = `${parent.name} Premium`
    const created = await db.productMaster.create({
      data: {
        name,
        slug: `${slugify(parent.name)}-premium`,
        type: ProductMasterType.SUBCATEGORY,
        parentId: parent.id,
        isActive: true,
      },
      select: { id: true, name: true, slug: true },
    })
    subcategories.push(created)
  }

  const clothTypes: MasterRecord[] = []
  for (const name of clothTypeNames) {
    clothTypes.push(
      await db.productMaster.create({
        data: {
          name,
          slug: slugify(name),
          type: ProductMasterType.CLOTH_TYPE,
          isActive: true,
        },
        select: { id: true, name: true, slug: true },
      }),
    )
  }

  const materials: MasterRecord[] = []
  for (const name of materialNames) {
    materials.push(
      await db.productMaster.create({
        data: {
          name,
          slug: slugify(name),
          type: ProductMasterType.MATERIAL,
          isActive: true,
        },
        select: { id: true, name: true, slug: true },
      }),
    )
  }

  const sizes: MasterRecord[] = []
  for (const name of sizeNames) {
    sizes.push(
      await db.productMaster.create({
        data: {
          name,
          slug: slugify(name),
          type: ProductMasterType.SIZE,
          isActive: true,
        },
        select: { id: true, name: true, slug: true },
      }),
    )
  }

  const colors: MasterRecord[] = []
  for (const name of colorNames) {
    colors.push(
      await db.productMaster.create({
        data: {
          name,
          slug: slugify(name),
          type: ProductMasterType.COLOR,
          isActive: true,
        },
        select: { id: true, name: true, slug: true },
      }),
    )
  }

  return { categories, subcategories, clothTypes, materials, sizes, colors }
}

async function seedUsers() {
  const passwordHash = await hashPassword(DUMMY_PASSWORD)

  const admin = await db.user.create({
    data: {
      email: "admin@tailorhub.com",
      name: "Main Admin",
      password: passwordHash,
      role: UserRole.ADMIN,
      phone: "+919100000001",
      dateOfBirth: new Date("1990-01-15"),
      notifyPush: true,
    },
  })

  const tailors = []
  for (let i = 1; i <= 10; i += 1) {
    const tailor = await db.user.create({
      data: {
        email: `tailor${i}@tailorhub.com`,
        name: `Tailor ${i}`,
        password: passwordHash,
        role: UserRole.TAILOR,
        phone: `+9192000000${String(i).padStart(2, "0")}`,
        dateOfBirth: new Date(1988, i % 12, Math.max(1, i)),
        notifyPush: true,
        tailorProfile: {
          create: {
            bio: `Specialist tailor ${i} for premium fittings and finishing.`,
            specializations: "Shirts, Trousers, Blazers, Ethnic Wear",
            yearsExperience: 4 + i,
            averageRating: 4.1,
            totalOrders: 0,
            totalEarnings: 0,
            monthlyEarnings: 0,
            isActive: true,
          },
        },
      },
      include: { tailorProfile: true },
    })
    tailors.push(tailor)
  }

  const customers = []
  for (let i = 1; i <= 12; i += 1) {
    const customer = await db.user.create({
      data: {
        email: `customer${i}@example.com`,
        name: `Customer ${i}`,
        password: passwordHash,
        role: UserRole.CUSTOMER,
        phone: `+9193000000${String(i).padStart(2, "0")}`,
        dateOfBirth: new Date(1995, i % 12, Math.max(1, i + 5)),
        notifyPush: i % 2 === 0,
        cart: i <= 3 ? [{ id: `local-product-${i}`, name: `Local Cart Item ${i}`, price: 499, quantity: 1, image: null }] : [],
        wishlist: i <= 3 ? [{ id: `local-product-${i}`, name: `Local Wish Item ${i}`, price: 699, image: null }] : [],
      },
    })
    customers.push(customer)
  }

  return { admin, tailors, customers }
}

async function seedCatalog(masters: Awaited<ReturnType<typeof seedMasters>>) {
  const products: Product[] = []

  for (let i = 1; i <= 20; i += 1) {
    const category = pick(masters.categories, i)
    const subcategory = pick(masters.subcategories, i)
    const clothType = pick(masters.clothTypes, i)
    const material = pick(masters.materials, i)
    const colorSet = pickMany(masters.colors, i, 3)
    const sizeSet = pickMany(masters.sizes, i, 3)

    const product = await db.product.create({
      data: {
        name: `${category.name} ${i}`,
        slug: `product-${i}`,
        description: `Premium ${category.name.toLowerCase()} item ${i} tailored for daily and occasion wear.`,
        price: 799 + i * 120,
        image: `https://ik.imagekit.io/demo/tailorhub/products/product-${i}.jpg`,
        images: [
          `https://ik.imagekit.io/demo/tailorhub/products/product-${i}-1.jpg`,
          `https://ik.imagekit.io/demo/tailorhub/products/product-${i}-2.jpg`,
        ],
        videos: [`https://ik.imagekit.io/demo/tailorhub/products/product-${i}.mp4`],
        category: category.name,
        subcategory: subcategory.name,
        clothType: clothType.name,
        material: material.name,
        color: colorSet[0].name,
        colors: colorSet.map((entry) => entry.name),
        size: sizeSet[0].name,
        tags: ["new", "featured", category.slug],
        highlights: ["Premium stitching", "Comfort fit", "Easy maintenance"],
        seoTitle: `${category.name} ${i} | TailorHub`,
        seoDescription: `Buy ${category.name} ${i} online with premium quality and fast delivery.`,
        seoKeywords: `${category.name},${material.name},${clothType.name}`,
        canonicalUrl: `https://tailorhub.example.com/products/product-${i}`,
        categoryId: category.id,
        subcategoryId: subcategory.id,
        clothTypeId: clothType.id,
        materialId: material.id,
        stock: 8 + (i % 7),
        isActive: true,
      },
    })

    await db.productMasterSelection.createMany({
      data: [
        ...sizeSet.map((size) => ({ productId: product.id, masterId: size.id })),
        ...colorSet.map((color) => ({ productId: product.id, masterId: color.id })),
      ],
      skipDuplicates: true,
    })

    products.push(product)
  }

  const faqs: Faq[] = []
  for (let i = 1; i <= 10; i += 1) {
    const faq = await db.faq.create({
      data: {
        question: `FAQ Question ${i}: How do I care for this product?`,
        answer: `FAQ Answer ${i}: Machine wash on gentle cycle and dry in shade for long-lasting quality.`,
        category: i % 2 === 0 ? "Care" : "General",
        isActive: true,
      },
    })
    faqs.push(faq)
  }

  for (let i = 0; i < products.length; i += 1) {
    const faqPair = pickMany(faqs, i, 2)
    await db.productFaq.createMany({
      data: faqPair.map((faq, idx) => ({
        productId: products[i].id,
        faqId: faq.id,
        order: idx,
      })),
      skipDuplicates: true,
    })
  }

  const blogPosts: BlogPost[] = []
  for (let i = 1; i <= 10; i += 1) {
    const blog = await db.blogPost.create({
      data: {
        title: `Tailoring Guide ${i}`,
        slug: `tailoring-guide-${i}`,
        excerpt: `Practical styling and measurement tips part ${i}.`,
        contentHtml: `<h2>Guide ${i}</h2><p>Body-fit and maintenance guide ${i} for long-lasting garments.</p>`,
        category: i % 2 === 0 ? "Style" : "Care",
        coverImage: `https://ik.imagekit.io/demo/tailorhub/blog/cover-${i}.jpg`,
        ogImage: `https://ik.imagekit.io/demo/tailorhub/blog/og-${i}.jpg`,
        seoTitle: `Tailoring Guide ${i} | TailorHub`,
        seoDescription: `Read Tailoring Guide ${i} for sizing and fabric insights.`,
        seoKeywords: "tailor,fit,fabric,care",
        isPublished: true,
      },
    })
    blogPosts.push(blog)
  }

  return { products, faqs, blogPosts }
}

async function seedCommerce(
  users: Awaited<ReturnType<typeof seedUsers>>,
  products: Awaited<ReturnType<typeof seedCatalog>>["products"],
) {
  const services = []
  for (let i = 1; i <= 10; i += 1) {
    const service = await db.stitchingService.create({
      data: {
        key: `service_${i}`,
        category: i % 2 === 0 ? "Men" : "Women",
        name: `Stitching Service ${i}`,
        measurementType: i % 2 === 0 ? "SHIRT" : "PANT",
        measurementFields:
          i % 2 === 0
            ? [
                { key: "chest", label: "Chest", unit: "in" },
                { key: "waist", label: "Waist", unit: "in" },
                { key: "shoulder", label: "Shoulder", unit: "in" },
                { key: "sleeveLength", label: "Sleeve Length", unit: "in" },
              ]
            : [
                { key: "waist", label: "Waist", unit: "in" },
                { key: "hip", label: "Hip", unit: "in" },
                { key: "inseam", label: "Inseam", unit: "in" },
                { key: "outseam", label: "Outseam", unit: "in" },
              ],
        measurementGuideImage: i % 2 === 0 ? "/measurement-guides/shirt.svg" : "/measurement-guides/pant.svg",
        customerPrice: 350 + i * 40,
        tailorRate: 180 + i * 20,
        isActive: true,
      },
    })
    services.push(service)
  }

  const addresses = []
  const measurements = []

  for (let i = 0; i < users.customers.length; i += 1) {
    const customer = users.customers[i]

    addresses.push(
      await db.address.create({
        data: {
          userId: customer.id,
          street: `${100 + i} Market Road`,
          city: "Mumbai",
          state: "Maharashtra",
          postalCode: `4000${String(i).padStart(2, "0")}`,
          country: "India",
          isDefault: true,
        },
      }),
    )

    measurements.push(
      await db.measurement.create({
        data: {
          userId: customer.id,
          name: `Measurement Set ${i + 1}`,
          measurementType: i % 2 === 0 ? "Shirt" : "Kurta",
          chest: 36 + (i % 8),
          waist: 30 + (i % 8),
          hip: 34 + (i % 7),
          shoulder: 16 + (i % 4),
          sleeveLength: 22 + (i % 5),
          garmentLength: 28 + (i % 6),
          notes: "Seed measurement",
        },
      }),
    )
  }

  const orders = []
  for (let i = 0; i < 12; i += 1) {
    const customer = users.customers[i]
    const address = addresses[i]
    const firstProduct = products[i]
    const secondProduct = products[(i + 3) % products.length]

    const order = await db.order.create({
      data: {
        customerId: customer.id,
        addressId: address.id,
        orderNumber: `ORD-2026-${String(i + 1).padStart(4, "0")}`,
        status: i % 4 === 0 ? EcommerceOrderStatus.DELIVERED : EcommerceOrderStatus.PROCESSING,
        totalAmount: firstProduct.price + secondProduct.price,
        paymentStatus: PaymentStatus.COMPLETED,
        notes: "Seed order",
        items: {
          create: [
            { productId: firstProduct.id, quantity: 1, price: firstProduct.price },
            { productId: secondProduct.id, quantity: 1, price: secondProduct.price },
          ],
        },
      },
    })

    orders.push(order)
  }

  const stitchingOrders = []
  for (let i = 0; i < 12; i += 1) {
    const service = services[i % services.length]
    const customer = users.customers[i]
    const measurement = measurements[i]

    const stitchingOrder = await db.stitchingOrder.create({
      data: {
        customerId: customer.id,
        measurementId: measurement.id,
        clothType: pick(Object.values(ClothType), i),
        clothSource: i % 2 === 0 ? "FROM_US" : "OWN",
        clothName: i % 2 === 0 ? pick(CLOTH_OPTIONS, i).name : null,
        clothPrice: i % 2 === 0 ? 400 : 0,
        stitchingPrice: service.customerPrice,
        fabricImage: `https://ik.imagekit.io/demo/tailorhub/stitching/fabric-${i + 1}.jpg`,
        serviceKey: service.key,
        stitchingService: service.name,
        price: service.customerPrice + (i % 2 === 0 ? 400 : 0),
        status: i % 4 === 0 ? StitchingOrderStatus.ASSIGNED : StitchingOrderStatus.STITCHING,
        contactName: customer.name,
        contactPhone: customer.phone,
        addressLine1: `${20 + i} Tailor Street`,
        addressCity: "Mumbai",
        addressState: "Maharashtra",
        addressPostalCode: `4001${String(i).padStart(2, "0")}`,
        addressCountry: "India",
        notes: "Seed stitching order",
      },
    })

    stitchingOrders.push(stitchingOrder)
  }

  const assignments = []
  for (let i = 0; i < 10; i += 1) {
    const stitchingOrder = stitchingOrders[i]
    const tailor = users.tailors[i % users.tailors.length]

    const assignment = await db.assignment.create({
      data: {
        stitchingOrderId: stitchingOrder.id,
        tailorId: tailor.id,
        tailorProfileId: tailor.tailorProfile?.id,
        payoutRate: 0.55,
        payoutAmount: stitchingOrder.price * 0.55,
        payoutStatus: i % 3 === 0 ? TailorPayoutStatus.PAID : TailorPayoutStatus.APPROVED,
      },
    })

    assignments.push(assignment)
  }

  const deliveredOrders = await db.order.findMany({
    where: { status: EcommerceOrderStatus.DELIVERED },
    include: {
      items: true,
      customer: true,
    },
    take: 10,
  })

  for (let i = 0; i < deliveredOrders.length; i += 1) {
    const order = deliveredOrders[i]
    const firstItem = order.items[0]
    if (!firstItem) continue

    await db.productReview.create({
      data: {
        productId: firstItem.productId,
        customerId: order.customerId,
        orderId: order.id,
        rating: 4 + (i % 2),
        title: `Worth it ${i + 1}`,
        comment: `Great fabric quality and fitting. Delivered on time for order ${order.orderNumber}.`,
        photos: [
          `https://ik.imagekit.io/demo/tailorhub/reviews/review-${i + 1}-1.jpg`,
          `https://ik.imagekit.io/demo/tailorhub/reviews/review-${i + 1}-2.jpg`,
        ],
        isApproved: true,
      },
    })
  }

  for (let i = 0; i < 10; i += 1) {
    const stitchingOrder = stitchingOrders[i]
    const assignment = assignments[i]

    await db.review.create({
      data: {
        customerId: stitchingOrder.customerId,
        tailorId: assignment.tailorId,
        tailorProfileId: assignment.tailorProfileId!,
        stitchingOrderId: stitchingOrder.id,
        rating: 4 + (i % 2),
        comment: `Great finishing quality for order ${i + 1}.`,
        isApproved: true,
      },
    })
  }

  for (let i = 0; i < 10; i += 1) {
    const order = orders[i]
    await db.payment.create({
      data: {
        orderId: order.id,
        customerId: order.customerId,
        amount: order.totalAmount,
        status: PaymentStatus.COMPLETED,
        stripePaymentId: `pi_seed_order_${i + 1}`,
        notes: "Seed ecommerce payment",
      },
    })
  }

  for (let i = 0; i < 10; i += 1) {
    const stitchingOrder = stitchingOrders[i]
    await db.payment.create({
      data: {
        stitchingOrderId: stitchingOrder.id,
        customerId: stitchingOrder.customerId,
        amount: stitchingOrder.price,
        status: PaymentStatus.COMPLETED,
        stripePaymentId: `pi_seed_stitching_${i + 1}`,
        notes: "Seed stitching payment",
      },
    })
  }

  return { services, orders, stitchingOrders }
}

async function seedNotificationsAndPush(users: Awaited<ReturnType<typeof seedUsers>>) {
  const allUsers = [users.admin, ...users.tailors, ...users.customers]

  for (let i = 0; i < 30; i += 1) {
    const user = allUsers[i % allUsers.length]
    await db.notification.create({
      data: {
        userId: user.id,
        title: `Notification ${i + 1}`,
        message: `This is seeded notification message ${i + 1}.`,
        type: i % 2 === 0 ? "ORDER" : "SYSTEM",
        link: i % 2 === 0 ? "/customer/orders" : "/products",
        isRead: i % 3 === 0,
        readAt: i % 3 === 0 ? new Date() : null,
      },
    })
  }

  for (let i = 0; i < 10; i += 1) {
    const user = allUsers[i]
    await db.pushSubscription.create({
      data: {
        userId: user.id,
        endpoint: `https://push.example.com/subscription/${user.id}/${i + 1}`,
        p256dh: `p256dh-key-${i + 1}`,
        auth: `auth-key-${i + 1}`,
        userAgent: "SeededBrowser/1.0",
      },
    })
  }
}

async function main() {
  console.log("Starting database seed...")

  try {
    await clearDatabase()
    console.log("Cleared existing data")

    const masters = await seedMasters()
    console.log("Seeded product masters (10+ each type)")

    const users = await seedUsers()
    console.log("Seeded users (admin, 10 tailors, 12 customers)")

    await seedFabricOptions()
    console.log("Seeded fabric options with rates, stock and image")

    const catalog = await seedCatalog(masters)
    console.log("Seeded products, FAQs and blogs")

    await seedCommerce(users, catalog.products)
    console.log("Seeded services, addresses, measurements, orders, stitching, assignments, reviews, product reviews, payments")

    await seedNotificationsAndPush(users)
    console.log("Seeded notifications and push subscriptions")

    console.log("\nDefault login accounts:")
    console.log(`- ADMIN: admin@tailorhub.com / ${DUMMY_PASSWORD}`)
    console.log(`- TAILOR: tailor1@tailorhub.com / ${DUMMY_PASSWORD}`)
    console.log(`- CUSTOMER: customer1@example.com / ${DUMMY_PASSWORD}`)

    console.log("\nDatabase seeded successfully.")
  } catch (error) {
    console.error("Seeding error:", error)
    throw error
  } finally {
    await db.$disconnect()
  }
}

main().catch(() => {
  process.exit(1)
})
