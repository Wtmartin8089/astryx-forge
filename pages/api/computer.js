import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { question } = req.body;

  // You can enhance here: query Supabase or other databases
  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: "You are the Starfleet ship's computer. Reply formally, informatively, and as if speaking to a Starfleet officer." },
      { role: 'user', content: question },
    ],
  });

  const answer = completion.choices[0].message.content;
  res.status(200).json({ answer });
}

