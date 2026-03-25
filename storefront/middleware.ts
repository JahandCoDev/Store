import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { buildStorePath, getOriginForStore, getStoreFromPathname, resolveStoreFromHostname } from "@/lib/storefront/routing";

function withRequestHeaders(request: NextRequest, store: string, publicBasePath: string) {
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-storefront-store", store);
  requestHeaders.set("x-storefront-public-base-path", publicBasePath);
  return requestHeaders;
}

export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const hostStore = resolveStoreFromHostname(request.headers.get("host"));
  const pathStore = getStoreFromPathname(pathname);

  if (hostStore) {
    if (pathStore && pathStore !== hostStore) {
      const targetOrigin = getOriginForStore(pathStore);
      const strippedPath = pathname.replace(new RegExp(`^/${pathStore}`), "") || "/";
      return NextResponse.redirect(new URL(`${strippedPath}${search}`, targetOrigin));
    }

    if (pathStore === hostStore) {
      const url = request.nextUrl.clone();
      url.pathname = pathname.replace(new RegExp(`^/${hostStore}`), "") || "/";
      return NextResponse.redirect(url);
    }

    const rewriteUrl = request.nextUrl.clone();
    rewriteUrl.pathname = buildStorePath(`/${hostStore}`, pathname);

    return NextResponse.rewrite(rewriteUrl, {
      request: {
        headers: withRequestHeaders(request, hostStore, ""),
      },
    });
  }

  if (pathStore) {
    return NextResponse.next({
      request: {
        headers: withRequestHeaders(request, pathStore, `/${pathStore}`),
      },
    });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\..*).*)"],
};
