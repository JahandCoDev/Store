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

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Admin Login (Real Credentials)

This admin app uses NextAuth Credentials auth.

Set these environment variables (recommended):

- `NEXTAUTH_SECRET` (required in production)
- `NEXTAUTH_URL` (e.g. `https://admin.yourdomain.com`)

Admin credentials are stored in Postgres in the `User` table. To sign in, you need a user row with:

- `role = ADMIN`
- `password` set to a bcrypt hash

To generate a bcrypt hash locally:

```bash
node -e "const bcrypt=require('bcryptjs'); console.log(bcrypt.hashSync(process.argv[1], 10));" "your-password-here"
```

Create / reset a dev admin user:

```bash
npm run admin:create -- admin@local.dev "your-password-here"
```

Or via env vars (dev only):

```bash
ADMIN_EMAIL=admin@local.dev ADMIN_PASSWORD="your-password-here" npm run admin:create
```

Route protection is enforced by `middleware.ts`; unauthenticated users will be redirected to the NextAuth sign-in page.

## Alert Tone

The voice dashboard plays `public/alert.mp3` for new-call and reminder alerts.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
 
 
