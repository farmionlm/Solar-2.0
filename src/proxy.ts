import { withAuth, NextRequestWithAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req: NextRequestWithAuth) {
    const { pathname } = req.nextUrl;
    const token = req.nextauth.token;

    // Rota /admin/* → apenas ADMIN
    if (pathname.startsWith("/admin") && token?.role !== "ADMIN") {
      return NextResponse.redirect(new URL("/", req.url));
    }

    return NextResponse.next();
  },
  {
    pages: {
      signIn: "/login",
    },
  }
);

export const config = {
  // Protege a raiz, clientes, histórico e rotas de admin
  // Nota: /:path* cobre /rota e /rota/qualquer-coisa
  matcher: ["/", "/clientes/:path*", "/historico", "/historico/:path*", "/admin", "/admin/:path*"],
};

