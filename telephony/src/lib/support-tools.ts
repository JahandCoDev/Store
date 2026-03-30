import prisma from "./prisma";
import type { AuthenticatedContact, CallerIdentity } from "./state";

interface CustomerIdentityRow {
  id: string;
  displayId: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phone: string | null;
}

export interface OrderSupportSummary {
  orderNumber: number;
  status: string;
  financialStatus: string;
  fulfillmentStatus: string;
  total: string;
  currency: string;
  note: string | null;
  fulfillmentNotes: string | null;
  trackingNumber: string | null;
  carrier: string | null;
  itemCount: number;
  customerName: string | null;
}

export interface InventorySupportSummary {
  productTitle: string;
  variantTitle: string;
  sku: string | null;
  inventory: number | null;
  inStock: boolean;
}

interface OrderMatchRow {
  shippingPhone: string | null;
  user: CustomerIdentityRow | null;
}

interface ProductVariantMatchRow {
  title: string;
  sku: string | null;
  inventory: number;
  trackInventory: boolean;
  product: {
    title: string;
  };
}

function buildFullName(customer: CustomerIdentityRow): string {
  const fullName = [customer.firstName, customer.lastName].filter(Boolean).join(" ").trim();
  if (fullName) return fullName;
  if (customer.email) return customer.email;
  if (customer.phone) return customer.phone;
  return customer.displayId;
}

function toCallerIdentity(customer: CustomerIdentityRow): CallerIdentity {
  return {
    userId: customer.id,
    displayId: customer.displayId,
    firstName: customer.firstName,
    lastName: customer.lastName,
    fullName: buildFullName(customer),
    email: customer.email,
    phone: customer.phone,
  };
}

export function normalizePhone(value: string): string {
  return value.replace(/\D/g, "");
}

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

function phonesMatch(left?: string | null, right?: string | null): boolean {
  const leftDigits = normalizePhone(left || "");
  const rightDigits = normalizePhone(right || "");
  if (!leftDigits || !rightDigits) return false;
  return leftDigits.slice(-10) === rightDigits.slice(-10);
}

function emailsMatch(left?: string | null, right?: string | null): boolean {
  if (!left || !right) return false;
  return normalizeEmail(left) === normalizeEmail(right);
}

export async function lookupCustomerByPhone(phone: string): Promise<CallerIdentity | null> {
  const digits = normalizePhone(phone);
  if (digits.length < 10) return null;

  const phoneTail = digits.slice(-7);
  const directMatches = await prisma.user.findMany({
    where: {
      phone: {
        not: null,
        contains: phoneTail,
      },
    },
    select: {
      id: true,
      displayId: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
    },
    take: 10,
  });

  const exactUserMatches = directMatches.filter((customer: CustomerIdentityRow) =>
    phonesMatch(customer.phone, digits)
  );
  if (exactUserMatches.length === 1) {
    return toCallerIdentity(exactUserMatches[0]);
  }

  const orderMatches = await prisma.order.findMany({
    where: {
      shippingPhone: {
        not: null,
        contains: phoneTail,
      },
      userId: {
        not: null,
      },
    },
    include: {
      user: {
        select: {
          id: true,
          displayId: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 10,
  });

  const matchedUsers = orderMatches
    .filter((order: OrderMatchRow) => phonesMatch(order.shippingPhone, digits) && order.user)
    .map((order: OrderMatchRow) => order.user)
    .filter((user: CustomerIdentityRow | null): user is CustomerIdentityRow => Boolean(user));

  const uniqueUsers = matchedUsers.filter(
    (user: CustomerIdentityRow, index: number, all: CustomerIdentityRow[]) =>
      all.findIndex((candidate: CustomerIdentityRow) => candidate.id === user.id) === index
  );
  if (uniqueUsers.length === 1) {
    return toCallerIdentity(uniqueUsers[0]);
  }

  return null;
}

export async function lookupCustomerByEmail(email: string): Promise<CallerIdentity | null> {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail.includes("@")) return null;

  const customer = await prisma.user.findFirst({
    where: {
      email: {
        equals: normalizedEmail,
        mode: "insensitive",
      },
    },
    select: {
      id: true,
      displayId: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
    },
  });

  return customer ? toCallerIdentity(customer) : null;
}

function orderMatchesAuthentication(
  order: {
    email: string;
    shippingPhone: string | null;
    userId: string | null;
    user: { id: string; email: string | null; phone: string | null } | null;
  },
  authenticatedContact?: AuthenticatedContact,
  callerIdentity?: CallerIdentity
): boolean {
  if (authenticatedContact?.type === "email") {
    return (
      emailsMatch(authenticatedContact.value, order.email) ||
      emailsMatch(authenticatedContact.value, order.user?.email)
    );
  }

  if (authenticatedContact?.type === "phone") {
    return (
      phonesMatch(authenticatedContact.value, order.shippingPhone) ||
      phonesMatch(authenticatedContact.value, order.user?.phone)
    );
  }

  if (!callerIdentity) return false;

  return (
    callerIdentity.userId === order.userId ||
    emailsMatch(callerIdentity.email, order.email) ||
    phonesMatch(callerIdentity.phone, order.shippingPhone) ||
    phonesMatch(callerIdentity.phone, order.user?.phone)
  );
}

export async function getOrderSupportSummary(
  orderNumber: number,
  authenticatedContact?: AuthenticatedContact,
  callerIdentity?: CallerIdentity
): Promise<{ kind: "ok"; order: OrderSupportSummary } | { kind: "auth_required" } | { kind: "not_found" }> {
  const order = await prisma.order.findUnique({
    where: { orderNumber },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          phone: true,
          firstName: true,
          lastName: true,
        },
      },
      fulfillment: {
        select: {
          trackingNumber: true,
          carrier: true,
          notes: true,
        },
      },
      orderItems: {
        select: {
          quantity: true,
        },
      },
    },
  });

  if (!order) return { kind: "not_found" };
  if (!orderMatchesAuthentication(order, authenticatedContact, callerIdentity)) {
    return { kind: "auth_required" };
  }

  return {
    kind: "ok",
    order: {
      orderNumber: order.orderNumber,
      status: order.status,
      financialStatus: order.financialStatus,
      fulfillmentStatus: order.fulfillmentStatus,
      total: order.total.toString(),
      currency: order.currency,
      note: order.note,
      fulfillmentNotes: order.fulfillment?.notes ?? null,
      trackingNumber: order.fulfillment?.trackingNumber ?? null,
      carrier: order.fulfillment?.carrier ?? null,
      itemCount: order.orderItems.reduce(
        (sum: number, item: { quantity: number }) => sum + item.quantity,
        0
      ),
      customerName:
        [order.user?.firstName, order.user?.lastName].filter(Boolean).join(" ").trim() || null,
    },
  };
}

export async function searchInventory(query: string): Promise<InventorySupportSummary[]> {
  const normalizedQuery = query.trim();
  if (normalizedQuery.length < 2) return [];

  const matches = await prisma.productVariant.findMany({
    where: {
      product: {
        status: "ACTIVE",
      },
      OR: [
        {
          title: {
            contains: normalizedQuery,
            mode: "insensitive",
          },
        },
        {
          sku: {
            contains: normalizedQuery,
            mode: "insensitive",
          },
        },
        {
          product: {
            title: {
              contains: normalizedQuery,
              mode: "insensitive",
            },
          },
        },
      ],
    },
    select: {
      title: true,
      sku: true,
      inventory: true,
      trackInventory: true,
      product: {
        select: {
          title: true,
        },
      },
    },
    orderBy: {
      inventory: "desc",
    },
    take: 5,
  });

  return matches.map((variant: ProductVariantMatchRow) => ({
    productTitle: variant.product.title,
    variantTitle: variant.title,
    sku: variant.sku,
    inventory: variant.trackInventory ? variant.inventory : null,
    inStock: variant.trackInventory ? variant.inventory > 0 : true,
  }));
}

export async function recordCustomerSupportNote(userId: string, body: string): Promise<void> {
  const noteBody = body.trim();
  if (!userId || !noteBody) return;

  await prisma.customerNote.create({
    data: {
      userId,
      body: noteBody,
    },
  });
}

export async function identifyCustomerFromContact(
  value: string
): Promise<{ contact?: AuthenticatedContact; identity?: CallerIdentity }> {
  const trimmed = value.trim();
  if (!trimmed) return {};

  if (trimmed.includes("@")) {
    const identity = await lookupCustomerByEmail(trimmed);
    return {
      contact: {
        type: "email",
        value: normalizeEmail(trimmed),
      },
      identity: identity ?? undefined,
    };
  }

  const digits = normalizePhone(trimmed);
  if (digits.length >= 10) {
    const identity = await lookupCustomerByPhone(digits);
    return {
      contact: {
        type: "phone",
        value: digits,
      },
      identity: identity ?? undefined,
    };
  }

  return {};
}

export function humanizeStatus(value: string): string {
  return value.toLowerCase().replace(/_/g, " ");
}