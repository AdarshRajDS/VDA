import { z } from 'zod';

export const gptImportSchema = z.object({
  vdaExtVersion: z.number().optional(),
  questionId: z.string().optional(),
  suggestedFinding: z.string().optional(),
  internalComment: z.string().optional(),
});

export type GptImportPayload = z.infer<typeof gptImportSchema>;

const fenceRe = /```(?:json)?\s*([\s\S]*?)```/gi;

export function extractJsonFromAssistantMessage(text: string): GptImportPayload | null {
  let parsed: unknown;
  const matches = [...text.matchAll(fenceRe)];
  for (const m of matches) {
    const inner = m[1]?.trim();
    if (!inner) continue;
    try {
      parsed = JSON.parse(inner);
      const r = gptImportSchema.safeParse(parsed);
      if (r.success && (r.data.suggestedFinding != null || r.data.internalComment != null)) {
        return r.data;
      }
    } catch {
      /* continue */
    }
  }
  try {
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start >= 0 && end > start) {
      parsed = JSON.parse(text.slice(start, end + 1));
      const r = gptImportSchema.safeParse(parsed);
      if (r.success) return r.data;
    }
  } catch {
    return null;
  }
  return null;
}
