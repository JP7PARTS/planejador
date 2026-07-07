import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const { data, error } = await supabase
      .from("weeks")
      .select("*")
      .eq("user_id", user.id)
      .order("is_favorite", { ascending: false })
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json(
        { error: error.message || "Erro ao carregar semanas" },
        { status: 400 }
      );
    }

    return NextResponse.json(data || []);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro interno";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const body = await req.json();
    const { title, notes, num_marmitas } = body;

    if (!title || !num_marmitas) {
      return NextResponse.json(
        { error: "Título e número de marmitas são obrigatórios" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("weeks")
      .insert({
        user_id: user.id,
        title: title.trim(),
        notes: notes?.trim() || null,
        num_marmitas,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: error.message || "Erro ao criar semana" },
        { status: 400 }
      );
    }

    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro interno";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
