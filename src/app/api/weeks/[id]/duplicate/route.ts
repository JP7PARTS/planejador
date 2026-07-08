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

    const body = await req.json();
    const { title: newTitle } = body;

    if (!newTitle) {
      return NextResponse.json(
        { error: "Título da cópia é obrigatório" },
        { status: 400 }
      );
    }

    // Busca a semana original (RLS libera a própria ou a do casal, para que
    // a parceira também possa duplicar uma semana compartilhada para a conta dela)
    const { data: originalWeek, error: getError } = await supabase
      .from("weeks")
      .select("*")
      .eq("id", id)
      .single();

    if (getError || !originalWeek) {
      return NextResponse.json(
        { error: "Semana não encontrada" },
        { status: 404 }
      );
    }

    // Se a cópia é conjunta e quem duplica está vinculado, ela vira semana
    // do casal na conta de quem duplicou (household_id resolvido no servidor).
    let householdId: string | null = null;
    if (originalWeek.is_shared) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("household_id, share_consent")
        .eq("id", user.id)
        .single();
      if (profile?.share_consent) {
        householdId = profile.household_id;
      }
    }

    // Cria nova semana
    const { data: newWeek, error: createError } = await supabase
      .from("weeks")
      .insert({
        user_id: user.id,
        title: newTitle.trim(),
        notes: originalWeek.notes,
        num_marmitas: originalWeek.num_marmitas,
        is_favorite: false,
        is_shared: originalWeek.is_shared ?? false,
        person2_name: originalWeek.person2_name ?? null,
        num_marmitas_p2: originalWeek.num_marmitas_p2 ?? 0,
        household_id: householdId,
        extras: originalWeek.extras ?? [],
      })
      .select()
      .single();

    if (createError || !newWeek) {
      return NextResponse.json(
        { error: createError?.message || "Erro ao duplicar semana" },
        { status: 400 }
      );
    }

    // Busca os itens da semana original
    const { data: originalItems, error: itemsError } = await supabase
      .from("week_items")
      .select("*")
      .eq("week_id", id);

    if (itemsError) {
      return NextResponse.json(
        { error: itemsError.message || "Erro ao copiar itens" },
        { status: 400 }
      );
    }

    // Copia os itens para a nova semana
    if (originalItems && originalItems.length > 0) {
      const newItems = originalItems.map((item) => ({
        week_id: newWeek.id,
        food_id: item.food_id,
        cooked_grams_per_marmita: item.cooked_grams_per_marmita,
        num_marmitas: item.num_marmitas,
        person: item.person ?? 1,
      }));

      const { error: insertError } = await supabase
        .from("week_items")
        .insert(newItems);

      if (insertError) {
        return NextResponse.json(
          { error: insertError.message || "Erro ao copiar itens" },
          { status: 400 }
        );
      }
    }

    return NextResponse.json(newWeek, { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro interno";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
