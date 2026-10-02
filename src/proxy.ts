import { NextResponse } from "next/server";

import { auth } from "@/auth";

const authRoutes = ["/login", "/register"];

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const session = req.auth;

  const isAppRoute = pathname.startsWith("/app");
  const isAuthRoute = authRoutes.includes(pathname);

  if (isAppRoute) {
    if (!session?.user) {
      // Zapamiętujemy, dokąd ktoś szedł (np. link do projektu z czatu), żeby po
      // zalogowaniu wrócić tam, a nie na panel.
      const login = new URL("/login", req.nextUrl);
      if (pathname !== "/app") login.searchParams.set("next", pathname + req.nextUrl.search);
      return NextResponse.redirect(login);
    }
    if (session.user.status !== "approved") {
      return NextResponse.redirect(new URL("/pending", req.nextUrl));
    }
  }

  if (isAuthRoute && session?.user?.status === "approved") {
    return NextResponse.redirect(new URL("/app", req.nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|.*\\.png$).*)"],
};
