import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI, Type } from '@google/genai';

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || '',
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!process.env.GEMINI_API_KEY) {
    return res.status(500).json({ error: 'GEMINI_API_KEY is not configured' });
  }

  try {
    const { text, image, mimeType } = req.body;

    let contents: any;
    if (image) {
      contents = {
        parts: [
          {
            text: 'Parse this bill image and extract items and their amounts. If some items are unclear, do your best to estimate the name and price.',
          },
          { inlineData: { data: image, mimeType: mimeType || 'image/jpeg' } },
        ],
      };
    } else {
      contents = `Parse the following bill text and extract items and their amounts. Text: "${text}"`;
    }

    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING, description: 'The item name' },
              amount: { type: Type.NUMBER, description: 'The item price or amount' },
            },
            required: ['name', 'amount'],
          },
        },
      },
    });

    res.json(JSON.parse(response.text));
  } catch (error: any) {
    console.error('AI Parse Error:', error);
    res.status(500).json({ error: error.message || 'Failed to parse bill' });
  }
}
