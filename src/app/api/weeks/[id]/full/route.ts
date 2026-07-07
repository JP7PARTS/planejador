import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    // A função resolve os dados do alimento no servidor e respeita a
    // visibilidade (própria ou semana do casal). null = sem acesso.
    const { data, error } = await supabase.rpc("get_household_week", {
      p_week_id: id,
    });

    if (error) {
      return NextResponse.json(
        { error: error.message || "Erro ao carregar semana" },
        { status: 400 }
      );
    }

    if (!data) {
      return NextResponse.json(
        { error: "Semana não encontrada" },
        { status: 404 }
      );
    }

    return NextResponse.json(data);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro interno";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
