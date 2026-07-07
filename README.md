# Planejador de Marmitas

App web (usável no celular) para planejar as marmitas da semana, calcular
calorias e macronutrientes e, em fases seguintes, controlar gastos.

O núcleo: a partir do peso **pronto** (cozido/assado/frito) que você quer comer,
calcular **quanto comprar/fazer de alimento cru** e mostrar a nutrição de cada
marmita e da semana.

## Stack

- **Next.js** (App Router) + **TypeScript**
- **Tailwind CSS**
- **Supabase** — Postgres + Auth + Row Level Security (a partir da Etapa 2)
- **Vercel** — deploy automático a cada push
- **GitHub** — repositório `JP7PARTS/planejador`

## Rodar localmente (opcional)

Não é necessário para usar o app — ele roda pelo link da Vercel. Mas se quiser:

```bash
npm install
npm run dev
```

Abra http://localhost:3000.

## Etapas do MVP

1. ✅ Esqueleto no ar (scaffold + deploy na Vercel)
2. Login (Supabase Auth + profiles + RLS)
3. Banco + seed TACO + gatilho de cópia por usuário
4. Tela de Alimentos (criar/editar/excluir)
5. Métodos de preparo (FCy por alimento)
6. Montar a semana + motor de cálculo
7. Salvar/abrir/duplicar/favoritar semanas
8. Consolidação do casal (consentida)
9. Ajuste mobile

## Segredos

Chaves e senhas **nunca** ficam no código — só em variáveis de ambiente
(`.env.local` localmente e nas configurações da Vercel/Supabase).
