import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY! as string, {} as any);

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://blackskyup.com";

export async function POST(req: NextRequest) {
  try {
    const { amount } = await req.json(); // amount in whole dollars

    if (!amount || typeof amount !== "number" || amount < 1 || amount > 10000) {
      return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
    }

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "usd",
            unit_amount: Math.round(amount * 100), // cents
            product_data: {
              name: "Donation to Blacksky Up",
              description:
                "Supporting free apprenticeship education in media, technology, business, and the arts.",
            },
          },
        },
      ],
      success_url: `${SITE_URL}/donate/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:  `${SITE_URL}/donate`,
      submit_type: "donate",
      custom_text: {
        submit: {
          message: "Your donation helps keep Blacksky Up free for everyone.",
        },
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("Stripe error:", err);
    return NextResponse.json({ error: "Failed to create checkout session" }, { status: 500 });
  }
}
