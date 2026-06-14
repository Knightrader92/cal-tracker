exports.handler = async (event) => {
  const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers: cors, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers: cors, body: 'Method not allowed' };

  try {
    const { food, mode, ctx } = JSON.parse(event.body);

    let content;

    if (mode === 'suggest') {
      const mt = ctx.hour < 11 ? 'breakfast'
               : ctx.hour < 15 ? 'lunch'
               : ctx.hour < 18 ? 'afternoon snack'
               : 'dinner';

      content = `You are a personal nutritionist for a South Asian man (Pakistani origin, UK-based) with insulin resistance and fatty liver disease, doing weight training 3x/week with a personal trainer.

Current time: ${mt} (${ctx.hour}:00)
Remaining budget today: ${ctx.remaining} kcal
Still needed: Protein ${ctx.protRem}g · Carbs ${ctx.carbRem}g · Fat ${ctx.fatRem}g
Already eaten today: ${ctx.eaten}${ctx.pref ? `\nHe's in the mood for: "${ctx.pref}"` : ''}

Suggest ONE specific, practical meal. Rules:
- Must fit within the remaining ${ctx.remaining} kcal
- If protein remaining >80g, the meal MUST be protein-heavy
- Prefer South Asian foods he likely enjoys, or simple UK foods
- Avoid high-GI carbs (white rice, white bread, sugary foods) given insulin resistance
- Be specific — not just "chicken salad" but "grilled chicken thighs with cucumber raita and a small wholemeal roti"

Return ONLY valid JSON, no markdown or extra text:
{"meal":"specific meal name","kcal":integer,"prot":integer,"carb":integer,"fat":integer,"why":"one sentence on why this fits his targets right now","how":"one sentence quick prep tip or where to get it"}`;

    } else {
      content = `Nutrition expert. Return ONLY valid JSON, no markdown or extra text.
Food: "${food}"
Return: {"name":"short name","kcal":integer,"prot":integer,"carb":integer,"fat":integer,"note":"accuracy note"}
UK/South Asian values: chapati≈120kcal,paratha≈220,roti≈120,rice cup≈210,dal≈180,chicken karahi≈350,biryani≈450,samosa≈150,chai with milk≈80. Sum all items. Home-cooked portions.`;
    }

    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 400,
        messages: [{ role: 'user', content }]
      })
    });

    const data = await r.json();

    return {
      statusCode: r.status,
      headers: { ...cors, 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    };

  } catch (e) {
    return {
      statusCode: 500,
      headers: cors,
      body: JSON.stringify({ error: e.message }),
    };
  }
};
