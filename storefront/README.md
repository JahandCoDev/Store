This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open the storefronts with domain-style local URLs so routing matches production:

- [http://shop.localhost:3000](http://shop.localhost:3000) for the apparel storefront
- [http://dev.localhost:3000](http://dev.localhost:3000) for the dev/services storefront
- [http://localhost:3000](http://localhost:3000) for the storefront chooser page

If you want different local domains, set `STOREFRONT_DOMAIN_SHOP` and `STOREFRONT_DOMAIN_DEV` before starting `npm run dev`.

## Stripe checkout (embedded)

The storefront uses Stripe PaymentIntents + Stripe Elements for an on-site checkout flow.

Required env vars:

- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_CURRENCY` (optional, default `usd`)

Webhook endpoint:

- `POST /api/storefront/stripe/webhook`

On `payment_intent.succeeded`, the webhook finalizes the order (marks it paid), queues print jobs, and attempts to send a confirmation email (requires SMTP env in `src/lib/email/storefrontMailer.ts`).

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
