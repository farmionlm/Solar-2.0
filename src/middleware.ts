import { withAuth } from "next-auth/middleware";

export default withAuth({
  pages: {
    signIn: "/login",
  },
});

export const config = {
  // Protege a raiz, clientes, histórico e rotas de admin
  matcher: ["/", "/clientes/:path*", "/admin/:path*"],
};
