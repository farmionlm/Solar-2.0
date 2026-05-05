import { redirect } from "next/navigation";

/**
 * A rota /admin não tem conteúdo próprio.
 * O middleware já garante que apenas ADMIN chega aqui.
 * Redireciona para o painel de gestão de parceiros.
 */
export default function AdminPage() {
  redirect("/admin/parceiros");
}
