import "dotenv/config"
import { db } from "@/lib/db"
import { hashPassword } from "@/lib/auth-utils"

async function main() {
  console.log("Starting database seed...")
  const DUMMY_PASSWORD = "dummy12345"

  try {
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
    await db.user.deleteMany()

    const adminPassword = await hashPassword(DUMMY_PASSWORD)
    await db.user.create({
      data: {
        email: "admin@tailorhub.com",
        name: "Admin User",
        password: adminPassword,
        role: "ADMIN",
      },
    })
    console.log("Admin user created")

    const tailorPassword = await hashPassword(DUMMY_PASSWORD)
    await db.user.create({
      data: {
        email: "priya@tailorhub.com",
        name: "Priya Sharma",
        password: tailorPassword,
        role: "TAILOR",
        tailorProfile: {
          create: {
            bio: "Expert in formal wear and sarees",
            specializations: "Formal Shirts, Sarees, Blouses",
            yearsExperience: 8,
          },
        },
      },
    })
    console.log("Tailor user created")

    const customerPassword = await hashPassword(DUMMY_PASSWORD)
    const customer = await db.user.create({
      data: {
        email: "rajesh@example.com",
        name: "Rajesh Kumar",
        password: customerPassword,
        role: "CUSTOMER",
      },
    })
    console.log("Customer user created")

    const product1 = await db.product.create({
      data: {
        name: "Classic Cotton Shirt",
        description: "Premium quality white cotton shirt",
        price: 1200,
        category: "shirts",
        color: "White",
        material: "100% Cotton",
        stock: 15,
      },
    })

    await db.product.create({
      data: {
        name: "Formal Dress Pants",
        description: "Black formal pants for office",
        price: 1800,
        category: "pants",
        color: "Black",
        material: "Polyester Blend",
        stock: 10,
      },
    })

    await db.product.create({
      data: {
        name: "Casual T-Shirt",
        description: "Comfortable casual t-shirt",
        price: 600,
        category: "shirts",
        color: "Blue",
        material: "100% Cotton",
        stock: 25,
      },
    })
    console.log("Products created")

    await db.blogPost.createMany({
      data: [
        {
          title: "How to Measure for a Perfect Shirt Fit",
          slug: "how-to-measure-perfect-shirt-fit",
          excerpt: "Learn the exact body measurements needed for a sharp, comfortable shirt fit.",
          contentHtml:
            "<h2>Why fit matters</h2><p>A well-fitted shirt improves comfort and overall look. Always measure chest, shoulder, and sleeve length carefully.</p><h3>Measurement tips</h3><ul><li>Use a flexible tape</li><li>Keep posture natural</li><li>Measure twice for accuracy</li></ul>",
          category: "Style Guide",
          isPublished: true,
        },
        {
          title: "Choosing Fabric for Indian Weather",
          slug: "choosing-fabric-for-indian-weather",
          excerpt: "Pick breathable and durable fabrics that suit hot, humid, and mixed climates.",
          contentHtml:
            "<p>Cotton and linen are great for daily wear in warm weather. For festive occasions, blends can balance comfort and finish.</p>",
          category: "Fabric",
          isPublished: true,
        },
      ],
    })
    console.log("Blog posts created")

    const address = await db.address.create({
      data: {
        userId: customer.id,
        street: "123 Main St",
        city: "Mumbai",
        state: "Maharashtra",
        postalCode: "400001",
        country: "India",
        isDefault: true,
      },
    })
    console.log("Address created")

    const measurement = await db.measurement.create({
      data: {
        userId: customer.id,
        name: "Formal Shirt",
        chest: 40,
        waist: 32,
        shoulder: 18,
        sleeveLength: 33,
        garmentLength: 28,
      },
    })
    console.log("Measurement created")

    await db.order.create({
      data: {
        customerId: customer.id,
        addressId: address.id,
        orderNumber: `ORD-${Date.now()}`,
        totalAmount: 1200,
        items: {
          create: {
            productId: product1.id,
            quantity: 1,
            price: 1200,
          },
        },
      },
    })
    console.log("Order created")

    await db.stitchingOrder.create({
      data: {
        customerId: customer.id,
        measurementId: measurement.id,
        clothType: "COTTON",
        stitchingService: "Formal Shirt",
        price: 500,
      },
    })
    console.log("Stitching order created")

    console.log("\nDefault users created:")
    console.log(`- ADMIN: admin@tailorhub.com / ${DUMMY_PASSWORD}`)
    console.log(`- TAILOR: priya@tailorhub.com / ${DUMMY_PASSWORD}`)
    console.log(`- CUSTOMER: rajesh@example.com / ${DUMMY_PASSWORD}`)

    console.log("\nDatabase seeded successfully!")
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
