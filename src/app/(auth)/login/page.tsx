import { redirect } from "next/navigation";

export default function LoginPage() {
  // 7.7: /login aponta pra Raiz (o login da plataforma). Antes: /admin/login —
  // que recebia, errado, aluno-sem-workspace (producer/page) e convite aceito.
  redirect("/producer/login");
}
