```
// netlify/functions/chat.js
// Proxy seguro: el portal llama a /api/chat → esta función → Anthropic
// La API key NUNCA se expone al browser

exports.handler = async function(event) {

  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers: {"Content-Type":"application/json"}, body: JSON.stringify({error:"Method not allowed"}) };
  }

  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type"
  };

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return { statusCode: 500, headers, body: JSON.stringify({error:"ANTHROPIC_API_KEY no configurada en el servidor"}) };
  }

  let body;
  try { body = JSON.parse(event.body); }
  catch (e) { return { statusCode: 400, headers, body: JSON.stringify({error:"Request body invalido"}) }; }

  const { messages } = body;
  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return { statusCode: 400, headers, body: JSON.stringify({error:"messages[] requerido"}) };
  }

  const safeMsgs = messages.slice(-10);

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 400,
        messages: safeMsgs
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      return { statusCode: response.status, headers, body: JSON.stringify({error:"Error Anthropic: " + errText}) };
    }

    const data = await response.json();
    const text = (data.content && data.content[0] && data.content[0].text) ? data.content[0].text : "";

    return { statusCode: 200, headers, body: JSON.stringify({text}) };

  } catch (err) {
    return { statusCode: 500, headers, body: JSON.stringify({error:"Error interno: " + err.message}) };
  }
};
```
