// Stripe integration utilities
// This is configured with environment variables from Vercel

export function initializeStripe() {
  // Stripe is initialized via environment variables
  // STRIPE_SECRET_KEY - for server-side operations
  // NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY - for client-side

  const stripePublishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY

  if (!stripePublishableKey) {
    console.warn("Stripe publishable key not configured. Add Stripe integration in Vercel dashboard.")
    return null
  }

  return stripePublishableKey
}

export function calculateStripeFee(amount: number): {
  subtotal: number
  fee: number
  total: number
} {
  // Stripe fee: 2.9% + 30 paise per transaction
  const fee = amount * 0.029 + 30
  return {
    subtotal: amount,
    fee: Math.round(fee),
    total: amount + Math.round(fee),
  }
}

export async function createCheckoutSession(orderId: string, amount: number) {
  try {
    const response = await fetch("/api/stripe/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId, amount }),
    })

    if (!response.ok) {
      throw new Error("Failed to create checkout session")
    }

    return await response.json()
  } catch (error) {
    console.error("Checkout error:", error)
    throw error
  }
}
