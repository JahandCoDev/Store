// admin/src/app/api/graphql/resolvers.ts
// GraphQL resolvers — all operations are shop-scoped and session-gated.

import prisma from "@/lib/prisma";

// Derive transaction client type from the prisma instance (avoids needing generated client)
type TxClient = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

const VALID_ORDER_STATUSES = ["PENDING", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED"];

// ─── Shared auth helper ────────────────────────────────────────────────────────

interface GqlContext {
  session: { user: { id: string | undefined; role: string | undefined } } | null;
  shopId: string | null;
}

function requireAuth(ctx: GqlContext) {
  const userId = ctx.session?.user?.id;
  const role = ctx.session?.user?.role;
  if (!userId || role !== "ADMIN") throw new Error("Unauthorized");
  return userId;
}

async function requireShopAccess(ctx: GqlContext) {
  const userId = requireAuth(ctx);
  const shopId = ctx.shopId;
  if (!shopId) throw new Error("No shop selected");

  const membership = await prisma.shopUser.findUnique({
    where: { shopId_userId: { shopId, userId } },
    select: { id: true },
  });
  if (!membership) throw new Error("Forbidden: not a member of this shop");
  return { userId, shopId, shopUserId: membership.id };
}

// ─── Resolvers ────────────────────────────────────────────────────────────────

export const resolvers = {
  // ── Custom scalars ────────────────────────────────────────────────────────

  JSON: {
    serialize: (value: unknown) => value,
    parseValue: (value: unknown) => value,
    parseLiteral: (ast: { value?: unknown }) => ast.value,
  },

  DateTime: {
    serialize: (value: Date | string) =>
      value instanceof Date ? value.toISOString() : value,
    parseValue: (value: string) => new Date(value),
    parseLiteral: (ast: { value?: string }) =>
      ast.value ? new Date(ast.value) : null,
  },

  // ── Field resolvers ───────────────────────────────────────────────────────

  Order: {
    customer: (parent: { customerId: string; user?: { id: string; name: string | null; email: string | null } }) =>
      parent.user
        ? { id: parent.customerId, name: parent.user.name, email: parent.user.email }
        : { id: parent.customerId, name: null, email: null },
    items: (parent: { orderItems?: unknown[] }) => parent.orderItems ?? [],
  },

  OrderItem: {
    product: (parent: { product?: unknown; productId: string }) => parent.product ?? null,
  },

  MetaValue: {
    definition: async (parent: { definitionId: string }) =>
      prisma.metaDefinition.findUnique({ where: { id: parent.definitionId } }),
  },

  // ── Queries ───────────────────────────────────────────────────────────────

  Query: {
    shop: async (_: unknown, __: unknown, ctx: GqlContext) => {
      const { shopId } = await requireShopAccess(ctx);
      return prisma.shop.findUnique({ where: { id: shopId } });
    },

    products: async (
      _: unknown,
      args: { search?: string; status?: string },
      ctx: GqlContext
    ) => {
      const { shopId } = await requireShopAccess(ctx);
      const q = args.search?.trim() ?? "";
      return prisma.product.findMany({
        where: {
          shopId,
          ...(args.status ? { status: args.status as "DRAFT" | "ACTIVE" | "ARCHIVED" } : {}),
          ...(q
            ? {
                OR: [
                  { title: { contains: q, mode: "insensitive" } },
                  { description: { contains: q, mode: "insensitive" } },
                  { sku: { contains: q, mode: "insensitive" } },
                  { vendor: { contains: q, mode: "insensitive" } },
                ],
              }
            : {}),
        },
        orderBy: { createdAt: "desc" },
      });
    },

    product: async (_: unknown, args: { id: string }, ctx: GqlContext) => {
      const { shopId } = await requireShopAccess(ctx);
      return prisma.product.findFirst({ where: { id: args.id, shopId } });
    },

    orders: async (
      _: unknown,
      args: { status?: string; limit?: number },
      ctx: GqlContext
    ) => {
      const { shopId } = await requireShopAccess(ctx);
      return prisma.order.findMany({
        where: {
          shopId,
          ...(args.status ? { status: args.status } : {}),
        },
        include: {
          user: { select: { id: true, name: true, email: true } },
          orderItems: { include: { product: true } },
          fulfillment: true,
        },
        orderBy: { createdAt: "desc" },
        take: args.limit ?? 100,
      });
    },

    order: async (_: unknown, args: { id: string }, ctx: GqlContext) => {
      const { shopId } = await requireShopAccess(ctx);
      return prisma.order.findFirst({
        where: { id: args.id, shopId },
        include: {
          user: { select: { id: true, name: true, email: true } },
          orderItems: { include: { product: true } },
          fulfillment: true,
        },
      });
    },

    customers: async (
      _: unknown,
      args: { search?: string },
      ctx: GqlContext
    ) => {
      const { shopId } = await requireShopAccess(ctx);
      const q = args.search?.trim() ?? "";
      return prisma.customer.findMany({
        where: {
          shopId,
          ...(q
            ? {
                OR: [
                  { email: { contains: q, mode: "insensitive" } },
                  { firstName: { contains: q, mode: "insensitive" } },
                  { lastName: { contains: q, mode: "insensitive" } },
                  { phone: { contains: q, mode: "insensitive" } },
                ],
              }
            : {}),
        },
        orderBy: { createdAt: "desc" },
        take: 100,
      });
    },

    customer: async (_: unknown, args: { id: string }, ctx: GqlContext) => {
      const { shopId } = await requireShopAccess(ctx);
      return prisma.customer.findFirst({ where: { id: args.id, shopId } });
    },

    printJobs: async (
      _: unknown,
      args: { status?: string },
      ctx: GqlContext
    ) => {
      const { shopId } = await requireShopAccess(ctx);
      return prisma.printJob.findMany({
        where: {
          shopId,
          ...(args.status ? { status: args.status as "QUEUED" | "PRINTING" | "DONE" | "FAILED" } : {}),
        },
        orderBy: { createdAt: "desc" },
      });
    },

    metaDefinitions: async (
      _: unknown,
      args: { appliesTo?: string },
      ctx: GqlContext
    ) => {
      const { shopId } = await requireShopAccess(ctx);
      return prisma.metaDefinition.findMany({
        where: {
          shopId,
          ...(args.appliesTo
            ? { appliesTo: args.appliesTo as "PRODUCT" | "ORDER" | "CUSTOMER" }
            : {}),
        },
        orderBy: { createdAt: "asc" },
      });
    },

    metaValues: async (
      _: unknown,
      args: { entityType: string; entityId: string },
      ctx: GqlContext
    ) => {
      await requireShopAccess(ctx);
      return prisma.metaValue.findMany({
        where: {
          entityType: args.entityType as "PRODUCT" | "ORDER" | "CUSTOMER",
          entityId: args.entityId,
        },
        include: { definition: true },
      });
    },

    inventoryAdjustments: async (
      _: unknown,
      args: { productId: string },
      ctx: GqlContext
    ) => {
      const { shopId } = await requireShopAccess(ctx);
      return prisma.inventoryAdjustment.findMany({
        where: { productId: args.productId, shopId },
        orderBy: { createdAt: "desc" },
        take: 200,
      });
    },
  },

  // ── Mutations ─────────────────────────────────────────────────────────────

  Mutation: {
    createProduct: async (
      _: unknown,
      args: { input: {
        title: string; description?: string; status?: string; price: number;
        compareAtPrice?: number; cost?: number; inventory?: number; sku?: string;
        barcode?: string; weight?: number; vendor?: string; tags?: string[];
      } },
      ctx: GqlContext
    ) => {
      const { shopId } = await requireShopAccess(ctx);
      const { input } = args;
      return prisma.product.create({
        data: {
          shopId,
          title: input.title,
          description: input.description ?? "",
          status: (input.status as "DRAFT" | "ACTIVE" | "ARCHIVED") ?? "DRAFT",
          price: input.price,
          compareAtPrice: input.compareAtPrice,
          cost: input.cost,
          inventory: input.inventory ?? 0,
          sku: input.sku,
          barcode: input.barcode,
          weight: input.weight,
          vendor: input.vendor,
          tags: input.tags ?? [],
        },
      });
    },

    updateProduct: async (
      _: unknown,
      args: { id: string; input: {
        title?: string; description?: string; status?: string; price?: number;
        compareAtPrice?: number; cost?: number; inventory?: number; sku?: string;
        barcode?: string; weight?: number; vendor?: string; tags?: string[];
      } },
      ctx: GqlContext
    ) => {
      const { shopId } = await requireShopAccess(ctx);
      const existing = await prisma.product.findFirst({ where: { id: args.id, shopId }, select: { id: true } });
      if (!existing) throw new Error("Product not found");

      const data: Record<string, unknown> = {};
      const { input } = args;
      if (input.title !== undefined) data.title = input.title;
      if (input.description !== undefined) data.description = input.description;
      if (input.status !== undefined) data.status = input.status;
      if (input.price !== undefined) data.price = input.price;
      if (input.compareAtPrice !== undefined) data.compareAtPrice = input.compareAtPrice;
      if (input.cost !== undefined) data.cost = input.cost;
      if (input.inventory !== undefined) data.inventory = input.inventory;
      if (input.sku !== undefined) data.sku = input.sku;
      if (input.barcode !== undefined) data.barcode = input.barcode;
      if (input.weight !== undefined) data.weight = input.weight;
      if (input.vendor !== undefined) data.vendor = input.vendor;
      if (input.tags !== undefined) data.tags = input.tags;

      return prisma.product.update({ where: { id: args.id }, data });
    },

    deleteProduct: async (_: unknown, args: { id: string }, ctx: GqlContext) => {
      const { shopId } = await requireShopAccess(ctx);
      const deleted = await prisma.product.deleteMany({ where: { id: args.id, shopId } });
      return deleted.count > 0;
    },

    adjustInventory: async (
      _: unknown,
      args: { input: { productId: string; delta: number; reason?: string } },
      ctx: GqlContext
    ) => {
      const { shopId, userId } = await requireShopAccess(ctx);
      const { productId, delta, reason } = args.input;

      const product = await prisma.product.findFirst({ where: { id: productId, shopId }, select: { id: true } });
      if (!product) throw new Error("Product not found");

      return prisma.$transaction(async (tx: TxClient) => {
        await tx.inventoryAdjustment.create({
          data: { productId, shopId, delta, reason, createdById: userId },
        });
        return tx.product.update({
          where: { id: productId },
          data: { inventory: { increment: delta } },
        });
      });
    },

    updateOrderStatus: async (
      _: unknown,
      args: { id: string; status: string },
      ctx: GqlContext
    ) => {
      const { shopId } = await requireShopAccess(ctx);
      if (!VALID_ORDER_STATUSES.includes(args.status)) {
        throw new Error(`Invalid status. Must be one of: ${VALID_ORDER_STATUSES.join(", ")}`);
      }
      const existing = await prisma.order.findFirst({ where: { id: args.id, shopId }, select: { id: true } });
      if (!existing) throw new Error("Order not found");

      return prisma.order.update({
        where: { id: args.id },
        data: { status: args.status },
        include: {
          user: { select: { id: true, name: true, email: true } },
          orderItems: { include: { product: true } },
          fulfillment: true,
        },
      });
    },

    createFulfillment: async (
      _: unknown,
      args: { orderId: string; input: { trackingNumber?: string; carrier?: string; shippedAt?: string; notes?: string } },
      ctx: GqlContext
    ) => {
      const { shopId } = await requireShopAccess(ctx);
      const order = await prisma.order.findFirst({ where: { id: args.orderId, shopId }, select: { id: true } });
      if (!order) throw new Error("Order not found");

      return prisma.fulfillment.upsert({
        where: { orderId: args.orderId },
        create: {
          orderId: args.orderId,
          trackingNumber: args.input.trackingNumber,
          carrier: args.input.carrier,
          shippedAt: args.input.shippedAt ? new Date(args.input.shippedAt) : undefined,
          notes: args.input.notes,
        },
        update: {
          trackingNumber: args.input.trackingNumber,
          carrier: args.input.carrier,
          shippedAt: args.input.shippedAt ? new Date(args.input.shippedAt) : undefined,
          notes: args.input.notes,
        },
      });
    },

    updateShop: async (
      _: unknown,
      args: { input: {
        name?: string; logoUrl?: string; addressLine1?: string; addressLine2?: string;
        city?: string; state?: string; zip?: string; country?: string;
        phone?: string; email?: string; accentColor?: string; footerCopy?: string; invoiceNotes?: string;
      } },
      ctx: GqlContext
    ) => {
      const { shopId } = await requireShopAccess(ctx);
      const data: Record<string, unknown> = {};
      const { input } = args;
      if (input.name !== undefined) data.name = input.name;
      if (input.logoUrl !== undefined) data.logoUrl = input.logoUrl;
      if (input.addressLine1 !== undefined) data.addressLine1 = input.addressLine1;
      if (input.addressLine2 !== undefined) data.addressLine2 = input.addressLine2;
      if (input.city !== undefined) data.city = input.city;
      if (input.state !== undefined) data.state = input.state;
      if (input.zip !== undefined) data.zip = input.zip;
      if (input.country !== undefined) data.country = input.country;
      if (input.phone !== undefined) data.phone = input.phone;
      if (input.email !== undefined) data.email = input.email;
      if (input.accentColor !== undefined) data.accentColor = input.accentColor;
      if (input.footerCopy !== undefined) data.footerCopy = input.footerCopy;
      if (input.invoiceNotes !== undefined) data.invoiceNotes = input.invoiceNotes;
      return prisma.shop.update({ where: { id: shopId }, data });
    },

    createMetaDefinition: async (
      _: unknown,
      args: { input: { namespace: string; key: string; displayName: string; type: string; appliesTo: string; required?: boolean } },
      ctx: GqlContext
    ) => {
      const { shopId } = await requireShopAccess(ctx);
      return prisma.metaDefinition.create({
        data: {
          shopId,
          namespace: args.input.namespace,
          key: args.input.key,
          displayName: args.input.displayName,
          type: args.input.type as "TEXT" | "NUMBER" | "BOOLEAN" | "DATE" | "JSON" | "URL",
          appliesTo: args.input.appliesTo as "PRODUCT" | "ORDER" | "CUSTOMER",
          required: args.input.required ?? false,
        },
      });
    },

    setMetaValue: async (
      _: unknown,
      args: { input: { definitionId: string; entityType: string; entityId: string; jsonValue: unknown } },
      ctx: GqlContext
    ) => {
      await requireShopAccess(ctx);
      const { definitionId, entityType, entityId, jsonValue } = args.input;
      return prisma.metaValue.upsert({
        where: { definitionId_entityId: { definitionId, entityId } },
        create: {
          definitionId,
          entityType: entityType as "PRODUCT" | "ORDER" | "CUSTOMER",
          entityId,
          jsonValue: jsonValue as Parameters<typeof prisma.metaValue.create>[0]["data"]["jsonValue"],
        },
        update: {
          jsonValue: jsonValue as Parameters<typeof prisma.metaValue.update>[0]["data"]["jsonValue"],
        },
        include: { definition: true },
      });
    },

    deleteMetaDefinition: async (_: unknown, args: { id: string }, ctx: GqlContext) => {
      const { shopId } = await requireShopAccess(ctx);
      const deleted = await prisma.metaDefinition.deleteMany({ where: { id: args.id, shopId } });
      return deleted.count > 0;
    },

    createPrintJob: async (
      _: unknown,
      args: { input: { type: string; assetUrl?: string; printerName?: string; metadata?: unknown } },
      ctx: GqlContext
    ) => {
      const { shopId } = await requireShopAccess(ctx);
      return prisma.printJob.create({
        data: {
          shopId,
          type: args.input.type,
          assetUrl: args.input.assetUrl,
          printerName: args.input.printerName,
          metadata: (args.input.metadata ?? {}) as Parameters<typeof prisma.printJob.create>[0]["data"]["metadata"],
        },
      });
    },

    reportPrintJobStatus: async (
      _: unknown,
      args: { id: string; status: string; errorText?: string },
      ctx: GqlContext
    ) => {
      await requireShopAccess(ctx);
      return prisma.printJob.update({
        where: { id: args.id },
        data: {
          status: args.status as "QUEUED" | "PRINTING" | "DONE" | "FAILED",
          errorText: args.errorText ?? null,
          reportedAt: new Date(),
        },
      });
    },
  },
};
