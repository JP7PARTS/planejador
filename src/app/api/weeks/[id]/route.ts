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

    const { data: week, error: weekError } = await supabase
      .from("weeks")
      .select("*")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (weekError || !week) {
      return NextResponse.json(
        { error: "Semana não encontrada" },
        { status: 404 }
      );
    }

    const { data: items, error: itemsError } = await supabase
      .from("week_items")
      .select("*")
      .eq("week_id", id)
      .order("created_at");

    if (itemsError) {
      return NextResponse.json(
        { error: itemsError.message || "Erro ao carregar itens" },
        { status: 400 }
      );
    }

    return NextResponse.json({ week, items: items || [] });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro interno";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

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

    const body = await req.json();
    const { title, notes, num_marmitas, is_shared, person2_name, num_marmitas_p2 } =
      body;

    const { data, error } = await supabase
      .from("weeks")
      .update({
        title: title?.trim(),
        notes: notes?.trim() || null,
        num_marmitas,
        ...(is_shared !== undefined ? { is_shared } : {}),
        ...(person2_name !== undefined
          ? { person2_name: person2_name?.trim() || null }
          : {}),
        ...(num_marmitas_p2 !== undefined ? { num_marmitas_p2 } : {}),
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("user_id", user.id)
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: error.message || "Erro ao atualizar semana" },
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

export async function DELETE(
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

    const { error } = await supabase
      .from("weeks")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) {
      return NextResponse.json(
        { error: error.message || "Erro ao deletar semana" },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro interno";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
