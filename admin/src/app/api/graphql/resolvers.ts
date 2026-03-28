// admin/src/app/api/graphql/resolvers.ts
// GraphQL resolvers — all operations are shop-scoped and session-gated.

import prisma from "@/lib/prisma";
import { ensureUniqueProductHandle, normalizeProductHandle } from "@/lib/productHandle";

// Derive transaction client type from the prisma instance (avoids needing generated client)
type TxClient = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

const VALID_ORDER_STATUSES = ["PENDING", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED"];

// ─── Shared auth helper ────────────────────────────────────────────────────────

export interface GqlContext {
  session: { user: { id: string | undefined; role: string | undefined } } | null;
}

function requireAuth(ctx: GqlContext) {
  const userId = ctx.session?.user?.id;
  const role = ctx.session?.user?.role;
  if (!userId || role !== "ADMIN") throw new Error("Unauthorized");
  return userId;
}

function requireAdmin(ctx: GqlContext) {
  const userId = requireAuth(ctx);
  return { userId };
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
    customer: (parent: { customerId: string; user?: { id: string; firstName: string | null; lastName: string | null; email: string | null } }) =>
      parent.user
        ? { id: parent.customerId, name: [parent.user.firstName, parent.user.lastName].filter(Boolean).join(" ").trim() || null, email: parent.user.email }
        : { id: parent.customerId, name: null, email: null },
    items: (parent: { orderItems?: unknown[] }) => parent.orderItems ?? [],
  },

  OrderItem: {
    product: (parent: { product?: unknown; productId: string }) => parent.product ?? null,
  },

  MetaValue: {
    definition: async () => null,
  },

  // ── Queries ───────────────────────────────────────────────────────────────

  Query: {
    products: async (
      _: unknown,
      args: { search?: string; status?: string },
      ctx: GqlContext
    ) => {
      requireAdmin(ctx);
      const q = args.search?.trim() ?? "";
      return prisma.product.findMany({
        where: {
          ...(args.status ? { status: args.status as "DRAFT" | "ACTIVE" | "ARCHIVED" } : {}),
          ...(q
            ? {
                OR: [
                  { title: { contains: q, mode: "insensitive" } },
                  { description: { contains: q, mode: "insensitive" } },
                  { variants: { some: { sku: { contains: q, mode: "insensitive" } } } },
                  { vendor: { contains: q, mode: "insensitive" } },
                ],
              }
            : {}),
        },
        orderBy: { createdAt: "desc" },
      });
    },

    product: async (_: unknown, args: { id: string }, ctx: GqlContext) => {
      requireAdmin(ctx);
      return prisma.product.findFirst({ where: { id: args.id } });
    },

    orders: async (
      _: unknown,
      args: { status?: string; limit?: number },
      ctx: GqlContext
    ) => {
      requireAdmin(ctx);
      return prisma.order.findMany({
        where: {
          ...(args.status ? { status: args.status as any } : {}),
        },
        include: {
          user: { select: { id: true, firstName: true, lastName: true, email: true } },
          orderItems: { include: { variant: { include: { product: true } } } },
          fulfillment: true,
        },
        orderBy: { createdAt: "desc" },
        take: args.limit ?? 100,
      });
    },

    order: async (_: unknown, args: { id: string }, ctx: GqlContext) => {
      requireAdmin(ctx);
      return prisma.order.findFirst({
        where: { id: args.id },
        include: {
          user: { select: { id: true, firstName: true, lastName: true, email: true } },
          orderItems: { include: { variant: { include: { product: true } } } },
          fulfillment: true,
        },
      });
    },

    customers: async (
      _: unknown,
      args: { search?: string },
      ctx: GqlContext
    ) => {
      requireAdmin(ctx);
      const q = args.search?.trim() ?? "";
      // Single-shop mode uses the Prisma User model for customers.
      return prisma.user.findMany({
        where: {
          role: "CUSTOMER",
          ...(q
            ? {
                OR: [
                  { email: { contains: q, mode: "insensitive" } },
                  { firstName: { contains: q, mode: "insensitive" } },
                  { lastName: { contains: q, mode: "insensitive" } },
                  { displayId: { contains: q, mode: "insensitive" } },
                ],
              }
            : {}),
        },
        orderBy: { createdAt: "desc" },
        take: 100,
      });
    },

    customer: async (_: unknown, args: { id: string }, ctx: GqlContext) => {
      requireAdmin(ctx);
      return prisma.user.findFirst({ where: { id: args.id, role: "CUSTOMER" } });
    },

    printJobs: async (
      _: unknown,
      args: { status?: string },
      ctx: GqlContext
    ) => {
      requireAdmin(ctx);
      return prisma.printJob.findMany({
        where: {
          ...(args.status ? { status: args.status as "QUEUED" | "PRINTING" | "DONE" | "FAILED" } : {}),
        },
        orderBy: { createdAt: "desc" },
      });
    },

    metaDefinitions: async () => {
      return [];
    },

    metaValues: async () => {
      return [];
    },

    inventoryAdjustments: async (
      _: unknown,
      args: { productId: string },
      ctx: GqlContext
    ) => {
      requireAdmin(ctx);
      return prisma.inventoryAdjustment.findMany({
        where: { productId: args.productId },
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
        handle?: string; title: string; description?: string; status?: string; price: number;
        compareAtPrice?: number; cost?: number; inventory?: number; sku?: string;
        barcode?: string; weight?: number; vendor?: string; tags?: string[];
      } },
      ctx: GqlContext
    ) => {
      requireAdmin(ctx);
      const { input } = args;

      const normalizedHandle = normalizeProductHandle(input.handle);
      const handle = await ensureUniqueProductHandle({
        base: normalizedHandle ?? input.title,
      });
      return prisma.product.create({
        data: {
          handle,
          title: input.title,
          description: input.description ?? "",
          status: (input.status as "DRAFT" | "ACTIVE" | "ARCHIVED") ?? "DRAFT",
          vendor: input.vendor,
          tags: input.tags ?? [],
          variants: {
            create: {
              title: "Default Title",
              price: input.price,
              compareAtPrice: input.compareAtPrice,
              cost: input.cost,
              inventory: input.inventory ?? 0,
              sku: input.sku,
              barcode: input.barcode,
              weight: input.weight,
            }
          }
        },
      });
    },

    updateProduct: async (
      _: unknown,
      args: { id: string; input: {
        handle?: string; title?: string; description?: string; status?: string; price?: number;
        compareAtPrice?: number; cost?: number; inventory?: number; sku?: string;
        barcode?: string; weight?: number; vendor?: string; tags?: string[];
      } },
      ctx: GqlContext
    ) => {
      requireAdmin(ctx);
      const existing = await prisma.product.findFirst({ where: { id: args.id }, select: { id: true, handle: true } });
      if (!existing) throw new Error("Product not found");

      const data: Record<string, unknown> = {};
      const { input } = args;
      if (input.handle !== undefined) {
        const normalized = normalizeProductHandle(input.handle);
        if (!normalized) throw new Error("Invalid handle");
        data.handle = await ensureUniqueProductHandle({ base: normalized, excludeProductId: args.id });
      }
      if (input.title !== undefined) data.title = input.title;
      if (input.description !== undefined) data.description = input.description;
      if (input.status !== undefined) data.status = input.status;
      if (input.vendor !== undefined) data.vendor = input.vendor;
      if (input.tags !== undefined) data.tags = input.tags;

      const variantData: Record<string, unknown> = {};
      if (input.price !== undefined) variantData.price = input.price;
      if (input.compareAtPrice !== undefined) variantData.compareAtPrice = input.compareAtPrice;
      if (input.cost !== undefined) variantData.cost = input.cost;
      if (input.inventory !== undefined) variantData.inventory = input.inventory;
      if (input.sku !== undefined) variantData.sku = input.sku;
      if (input.barcode !== undefined) variantData.barcode = input.barcode;
      if (input.weight !== undefined) variantData.weight = input.weight;

      const product = await prisma.product.update({ where: { id: args.id }, data });
      if (Object.keys(variantData).length > 0) {
        // Just update the first variant conceptually for simple mutations
        const firstVariant = await prisma.productVariant.findFirst({ where: { productId: product.id } });
        if (firstVariant) {
          await prisma.productVariant.update({ where: { id: firstVariant.id }, data: variantData });
        }
      }
      return product;
    },

    deleteProduct: async (_: unknown, args: { id: string }, ctx: GqlContext) => {
      requireAdmin(ctx);
      const deleted = await prisma.product.deleteMany({ where: { id: args.id } });
      return deleted.count > 0;
    },

    adjustInventory: async (
      _: unknown,
      args: { input: { productId: string; delta: number; reason?: string } },
      ctx: GqlContext
    ) => {
      const { userId } = requireAdmin(ctx);
      const { productId, delta, reason } = args.input;

      const variant = await prisma.productVariant.findFirst({ where: { productId }, select: { id: true, productId: true } });
      if (!variant) throw new Error("Variant not found");

      return prisma.$transaction(async (tx: TxClient) => {
        await tx.inventoryAdjustment.create({
          data: { productId: variant.productId, delta, reason, createdById: userId },
        });
        await tx.productVariant.update({
          where: { id: variant.id },
          data: { inventory: { increment: delta } },
        });
        return tx.product.findUnique({ where: { id: variant.productId } });
      });
    },

    updateOrderStatus: async (
      _: unknown,
      args: { id: string; status: string },
      ctx: GqlContext
    ) => {
      requireAdmin(ctx);
      if (!VALID_ORDER_STATUSES.includes(args.status)) {
        throw new Error(`Invalid status. Must be one of: ${VALID_ORDER_STATUSES.join(", ")}`);
      }
      const existing = await prisma.order.findFirst({ where: { id: args.id }, select: { id: true } });
      if (!existing) throw new Error("Order not found");

      return prisma.order.update({
        where: { id: args.id },
        data: { status: args.status as "PENDING" | "AUTHORIZED" | "PROCESSING" | "COMPLETED" | "CANCELLED" | "REFUNDED" },
        include: {
          user: { select: { id: true, firstName: true, lastName: true, email: true } },
          orderItems: { include: { variant: { include: { product: true } } } },
          fulfillment: true,
        },
      });
    },

    createFulfillment: async (
      _: unknown,
      args: { orderId: string; input: { trackingNumber?: string; carrier?: string; shippedAt?: string; notes?: string } },
      ctx: GqlContext
    ) => {
      requireAdmin(ctx);
      const order = await prisma.order.findFirst({ where: { id: args.orderId }, select: { id: true } });
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

    createMetaDefinition: async () => {
      throw new Error("Metafields are stored in JSON metadata; MetaDefinition is not supported");
    },

    setMetaValue: async () => {
      throw new Error("Metafields are stored in JSON metadata; MetaValue is not supported");
    },

    deleteMetaDefinition: async () => {
      throw new Error("Metafields are stored in JSON metadata; MetaDefinition is not supported");
    },

    createPrintJob: async (
      _: unknown,
      args: { input: { type: string; assetUrl?: string; printerName?: string; metadata?: unknown } },
      ctx: GqlContext
    ) => {
      requireAdmin(ctx);
      return prisma.printJob.create({
        data: {
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
      requireAdmin(ctx);
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
