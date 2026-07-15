import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

// Prévia de uma receita compartilhada (via RPC security-definer). O "código" é
// o UUID da receita. Exige login (só quem tem conta pode importar).
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const { data, error } = await supabase.rpc("get_shared_recipe", {
      p_recipe_id: code,
    });

    if (error) {
      return NextResponse.json(
        { error: error.message || "Erro ao carregar receita" },
        { status: 400 }
      );
    }
    if (!data) {
      return NextResponse.json(
        { error: "Receita não encontrada" },
        { status: 404 }
      );
    }

    return NextResponse.json(data);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro interno";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
