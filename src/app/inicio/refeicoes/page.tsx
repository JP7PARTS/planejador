import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import RefeicoesList from "./refeicoes-list";

export const metadata = { title: "Refeições" };

export default async function RefeicoesPager() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return redirect("/login");
  }

  // Carregar eventos do usuário
  const { data: events } = await supabase
    .from("events")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  // Carregar receitas (para mostrar ao criar)
  const { data: recipes } = await supabase
    .from("recipes")
    .select("*")
    .eq("user_id", user.id)
    .order("title", { ascending: true });

  // Carregar alimentos (para calcular nutrição)
  const { data: foods } = await supabase
    .from("foods")
    .select("*")
    .eq("user_id", user.id)
    .order("name", { ascending: true });

  return (
    <RefeicoesList
      events={events || []}
      recipes={recipes || []}
      foods={foods || []}
    />
  );
}
