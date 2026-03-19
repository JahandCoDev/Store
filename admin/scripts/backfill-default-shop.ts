import "dotenv/config";
import prisma from "../src/lib/prisma";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set. Export DATABASE_URL (or add a .env) before running this script.");
}

async function main() {
  const defaultShop = await prisma.shop.findFirst({ orderBy: { createdAt: "asc" } });
  if (!defaultShop) {
    throw new Error(
      "No Shop exists yet. Start the admin app, sign in, and hit GET /api/shops to auto-create a default shop, then re-run this script."
    );
  }

  const admins = await prisma.user.findMany({ where: { role: "ADMIN" }, select: { id: true } });
  for (const admin of admins) {
    await prisma.shopUser.upsert({
      where: { shopId_userId: { shopId: defaultShop.id, userId: admin.id } },
      create: { shopId: defaultShop.id, userId: admin.id, role: "OWNER" },
      update: {},
    });
  }

  const products = await prisma.product.updateMany({
    where: { shopId: null },
    data: { shopId: defaultShop.id },
  });

  const orders = await prisma.order.updateMany({
    where: { shopId: null },
    data: { shopId: defaultShop.id },
  });

  // eslint-disable-next-line no-console
  console.log(
    JSON.stringify(
      {
        defaultShopId: defaultShop.id,
        adminMembershipsEnsured: admins.length,
        productsBackfilled: products.count,
        ordersBackfilled: orders.count,
      },
      null,
      2
    )
  );
}

main()
  .catch((err) => {
    // eslint-disable-next-line no-console
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
