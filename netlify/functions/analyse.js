exports.handler = async (event) => {
  const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: cors, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: cors, body: 'Method not allowed' };
  }

  try {
    const { food } = JSON.parse(event.body);

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
        messages: [{
          role: 'user',
          content: `Nutrition expert. Return ONLY valid JSON, no markdown.
Food: "${food}"
Return: {"name":"short name","kcal":integer,"prot":integer,"carb":integer,"fat":integer,"note":"accuracy note"}
UK/South Asian: chapati≈120,paratha≈220,roti≈120,rice cup≈210,dal≈180,chicken karahi≈350,biryani≈450,samosa≈150,chai≈80. Sum all items. Home-cooked portions.`
        }]
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
