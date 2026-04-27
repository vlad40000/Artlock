import { NextResponse } from 'next/server';
import { env } from '@/lib/utils/env';
import { generateContentWithRetry } from '@/lib/ai/gemini';

export async function POST(req: Request) {
  try {
    const { imageBase64, mimeType, prompt = 'segment the main subject of this tattoo design' } = await req.json();

    if (!imageBase64) {
      return NextResponse.json({ error: 'Image is required' }, { status: 400 });
    }

    const systemInstruction = `You are a professional tattoo segmentation engine. 
Identify the main subject or the background as requested.
Return ONLY a JSON array of bounding boxes in the format [[ymin, xmin, ymax, xmax]].
Coordinates should be normalized 0-1000.
If multiple parts make up the subject, return multiple boxes.
If no regions are found, return an empty array [].`;

    const response = await generateContentWithRetry({
      model: env.geminiImageModel,
      contents: [
        {
          role: 'user',
          parts: [
            { text: prompt },
            {
              inlineData: {
                mimeType: mimeType || 'image/png',
                data: imageBase64,
              },
            },
          ],
        },
      ],
      config: {
        systemInstruction,
        temperature: 0.1,
      },
    }, 'tattoo-segmentation') as any;

    const text = response.text?.trim() || '';
    const match = text.match(/\[.*\]/s); // More flexible match for [] or [[...]]
    if (!match) {
      return NextResponse.json({ error: 'No segmentation found', text }, { status: 500 });
    }

    let boxes;
    try {
      boxes = JSON.parse(match[0]);
      if (!Array.isArray(boxes)) boxes = [];
    } catch (e) {
      return NextResponse.json({ error: 'Failed to parse segmentation JSON', text }, { status: 500 });
    }

    return NextResponse.json({ boxes });
  } catch (error: any) {
    console.error('Segmentation error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
