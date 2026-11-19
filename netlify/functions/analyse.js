exports.handler = async (event) => {
  const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers: cors, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers: cors, body: 'Method not allowed' };

  try {
    const { food, mode, ctx, image } = JSON.parse(event.body);

    let content;
    let temperature = 0.2; // consistent numbers for food logging

    if (mode === 'suggest') {
      temperature = 1; // creative variety for meal ideas
      const mt = ctx.hour < 11 ? 'breakfast'
               : ctx.hour < 15 ? 'lunch'
               : ctx.hour < 18 ? 'afternoon snack'
               : 'dinner';

      content = `You are a personal nutritionist for a South Asian man (Pakistani origin, UK-based) with insulin resistance and fatty liver disease, doing weight training 3x/week with a personal trainer.

Time: ${mt} (${ctx.hour}:00)
Remaining budget today: ${ctx.remaining} kcal
Still needed: Protein ${ctx.protRem}g · Carbs ${ctx.carbRem}g · Fat ${ctx.fatRem}g
Already eaten today: ${ctx.eaten}${ctx.pref ? `\nHe's in the mood for: "${ctx.pref}"` : ''}${ctx.ins ? `\n\nInsulin status (estimated from today's food): ${ctx.ins.state}${ctx.ins.until ? ` until about ${ctx.ins.until}` : ''}. Today's biggest spike: ${ctx.ins.peak}.${ctx.ins.highMeals ? ` High-insulin foods today: ${ctx.ins.highMeals}.` : ''}
Keeping insulin low matters for his insulin resistance and fatty liver:
- If fat burning is paused, or today already had a High spike, suggest a LOW-insulin meal: protein + non-starchy veg + healthy fat, little or no starch, nothing sweet.
- Otherwise keep carbs modest and low-GI, always paired with protein and fibre.
- In "how", mention eating order (veg and protein first, carbs last) or a short walk afterwards when it helps.` : ''}${ctx.prev?.length ? `\n\nDo NOT suggest any of these — already suggested this session:\n${ctx.prev.map((s,i)=>`${i+1}. ${s}`).join('\n')}` : ''}

VARIETY IS ESSENTIAL. Rotate creatively through different protein sources each suggestion:
Turkish eggs (cilbir), salmon with quinoa, tuna stuffed peppers, turkey mince keema, lean beef kofta, paneer bhurji, cottage cheese with oatcakes, mackerel on rye, egg white omelette, chickpea curry, lentil soup, Greek yoghurt protein bowl, sardines on toast, prawn stir fry, lamb mince with cauliflower rice.

Rules:
- Must fit within the remaining ${ctx.remaining} kcal
- If protein remaining >80g, meal MUST be high protein (aim for 50g+)
- South Asian or simple UK foods he can realistically make or buy
- Avoid high-GI carbs (white rice, white bread, sugar) — insulin resistance
- Be specific with quantities

Return ONLY valid JSON, no markdown or extra text:
{"meal":"specific meal name with quantities","kcal":integer,"prot":integer,"carb":integer,"fat":integer,"ins":"Low|Medium|High (expected insulin response of this meal)","why":"one sentence why this fits his targets and insulin status right now","how":"one sentence quick prep tip"}`;

    } else if (mode === 'image') {
      if (!image) {
        return { statusCode: 400, headers: cors, body: JSON.stringify({ error: 'No image' }) };
      }
      content = [
        { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: image } },
        { type: 'text', text: `You are a nutrition expert estimating calories from a food photo for a UK-based South Asian man tracking his intake.
${food ? `His note about this meal: "${food}" — treat this as accurate and let it override what you see in the photo.\n` : ''}
Steps:
1. Identify every food and drink visible.
2. Estimate portion sizes from visual cues — plate size (standard dinner plate is about 27cm), cutlery, hands, packaging.
3. If a nutrition label or branded packaging is visible, use those values.
4. For curries and South Asian dishes, assume typical home-cooked oil levels unless it clearly looks like restaurant or takeaway food (then add about 25%).
5. Sum everything visible.

Reference values: chapati/roti ≈120kcal, naan ≈280, paratha ≈220, cup cooked rice ≈210, bowl of daal ≈180, chicken karahi portion ≈350, biryani plate ≈450, samosa ≈150.

If there is no food in the image, return kcal 0 and name "No food detected".

gi = estimated glycemic index of the whole meal as eaten (0-100). Protein, fat and fibre in the same meal lower it; sugary drinks, white rice, naan and white bread raise it.
tip = one short practical tip (max 15 words) to soften the blood sugar and insulin spike from THIS food, for someone with insulin resistance — e.g. a 10-15 min walk straight after, eat the protein and veg first, swap naan for one wholemeal roti. If the food is low-carb, say so briefly.

Return ONLY valid JSON, no markdown or extra text:
{"name":"short meal name","kcal":integer,"prot":integer,"carb":integer,"fat":integer,"gi":integer,"note":"one sentence: what you identified and the portion sizes you assumed","tip":"short tip"}` }
      ];

    } else {
      content = `Nutrition expert. Return ONLY valid JSON, no markdown or extra text.
Food: "${food}"
Return: {"name":"short name","kcal":integer,"prot":integer,"carb":integer,"fat":integer,"gi":integer,"note":"accuracy note","tip":"short tip"}
gi = estimated glycemic index of the whole meal as eaten (0-100). Protein, fat and fibre in the same meal lower it; sugary drinks, white rice, naan and white bread raise it.
tip = one short practical tip (max 15 words) to soften the blood sugar and insulin spike from THIS food, for someone with insulin resistance — e.g. a 10-15 min walk straight after, eat the protein and veg first, swap naan for one wholemeal roti. If the food is low-carb, say so briefly.
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
        temperature,
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
