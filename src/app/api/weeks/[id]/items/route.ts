import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function POST(
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

    // Verifica que a semana pertence ao usuário
    const { data: week, error: weekError } = await supabase
      .from("weeks")
      .select("id")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (weekError || !week) {
      return NextResponse.json(
        { error: "Semana não encontrada" },
        { status: 404 }
      );
    }

    const body = await req.json();
    const { food_id, cooked_grams_per_marmita, num_marmitas, person, recipe_id } =
      body;

    if (!food_id || !cooked_grams_per_marmita || !num_marmitas) {
      return NextResponse.json(
        { error: "Alimento, gramas e número de marmitas são obrigatórios" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("week_items")
      .insert({
        week_id: id,
        food_id,
        cooked_grams_per_marmita,
        num_marmitas,
        person: person === 2 ? 2 : 1,
        recipe_id: recipe_id ?? null,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: error.message || "Erro ao adicionar alimento" },
        { status: 400 }
      );
    }

    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro interno";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// Substitui TODOS os itens da semana de uma vez (usado ao "Atualizar semana"):
// apaga os itens atuais e insere a lista recebida. Só o dono pode fazer.
export async function PUT(
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

    // Verifica que a semana pertence ao usuário
    const { data: week, error: weekError } = await supabase
      .from("weeks")
      .select("id")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (weekError || !week) {
      return NextResponse.json(
        { error: "Semana não encontrada" },
        { status: 404 }
      );
    }

    const body = await req.json();
    const { items } = body as {
      items?: Array<{
        food_id: string;
        cooked_grams_per_marmita: number;
        num_marmitas: number;
        person?: number;
        recipe_id?: string | null;
      }>;
    };

    if (!Array.isArray(items)) {
      return NextResponse.json(
        { error: "Lista de itens inválida" },
        { status: 400 }
      );
    }

    // Apaga os itens atuais
    const { error: delError } = await supabase
      .from("week_items")
      .delete()
      .eq("week_id", id);

    if (delError) {
      return NextResponse.json(
        { error: delError.message || "Erro ao limpar itens" },
        { status: 400 }
      );
    }

    // Insere os novos itens (ignora linhas sem alimento selecionado)
    const linhas = items
      .filter((it) => it.food_id)
      .map((it) => ({
        week_id: id,
        food_id: it.food_id,
        cooked_grams_per_marmita: it.cooked_grams_per_marmita,
        num_marmitas: it.num_marmitas,
        person: it.person === 2 ? 2 : 1,
        recipe_id: it.recipe_id ?? null,
      }));

    if (linhas.length > 0) {
      const { error: insError } = await supabase
        .from("week_items")
        .insert(linhas);

      if (insError) {
        return NextResponse.json(
          { error: insError.message || "Erro ao inserir itens" },
          { status: 400 }
        );
      }
    }

    return NextResponse.json({ success: true, count: linhas.length });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro interno";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
