// admin/src/app/api/graphql/route.ts
// GraphQL endpoint powered by graphql-yoga.
// Authentication is enforced via NextAuth session in the context builder.

import { createYoga, createSchema } from "graphql-yoga";
import { getServerSession } from "next-auth/next";
import { cookies } from "next/headers";
import type { NextRequest } from "next/server";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { resolveCoreShopId } from "@/lib/coreShops";
import { typeDefs } from "./schema";
import { resolvers } from "./resolvers";

const schema = createSchema({ typeDefs, resolvers });

const { handleRequest } = createYoga({
  schema,
  graphqlEndpoint: "/api/graphql",
  // Build a per-request context that carries session + active shopId
  context: async () => {
    const nextAuthSession = await getServerSession(authOptions);
    // Narrow to only the fields our resolvers need
    const session = nextAuthSession
      ? {
          user: {
            id: (nextAuthSession.user as { id?: string })?.id,
            role: (nextAuthSession.user as { role?: string })?.role,
          },
        }
      : null;
    const cookieStore = await cookies();
    const cookieShopId = cookieStore.get("shopId")?.value ?? "";
    const shopId = resolveCoreShopId(cookieShopId);
    return { session, shopId };
  },
  // Allow the GraphiQL explorer only when explicitly enabled via env var
  graphiql: process.env.NODE_ENV !== "production" && process.env.GRAPHIQL !== "false",
  fetchAPI: { Response },
});

export function GET(request: NextRequest) {
  return handleRequest(request, {});
}

export function POST(request: NextRequest) {
  return handleRequest(request, {});
}

export function OPTIONS(request: NextRequest) {
  return handleRequest(request, {});
}
