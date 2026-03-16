import { FileChange } from './analyzer';

const SNIPELINK_API = 'https://snipelink.com/api/snipe-pr/generate';

export interface AIDescriptionRequest {
  title: string;
  diff: string;
  files: FileChange[];
  repo: string;
}

export interface AIDescriptionResponse {
  ok: boolean;
  description?: string;
  error?: string;
  code?: string;
}

export async function generateAIDescription(
  request: AIDescriptionRequest,
  apiKey: string
): Promise<AIDescriptionResponse> {
  try {
    const response = await fetch(SNIPELINK_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        title: request.title,
        diff: request.diff.substring(0, 15000),
        files: request.files.map((f) => ({
          filename: f.filename,
          status: f.status,
          additions: f.additions,
          deletions: f.deletions,
        })),
        repo: request.repo,
      }),
    });

    if (!response.ok) {
      const body = (await response.json().catch(() => ({}))) as Record<string, string>;
      return {
        ok: false,
        error: body.error || `API returned ${response.status}`,
        code: body.code,
      };
    }

    const data = (await response.json()) as { description: string };
    return { ok: true, description: data.description };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Unknown error calling SnipeLink API',
    };
  }
}
