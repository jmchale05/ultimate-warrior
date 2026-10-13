/**
 * Logs miles through the server, which adds up what the student has already
 * logged on the campaign and saves at most what it still needs.
 */
export async function logCampaignMiles(input: {
  idToken: string;
  studentId: string;
  campaignNumber: number;
  miles: number;
}): Promise<{ logged: number; total: number; required: number }> {
  const response = await fetch("/api/log-miles", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  const raw = await response.text();
  let body: { error?: string; logged?: number; total?: number; required?: number } = {};
  try {
    body = raw ? JSON.parse(raw) as typeof body : {};
  } catch {
    body = {};
  }
  if (!response.ok) {
    throw new Error(body.error || `Could not log miles (${response.status}).`);
  }
  return {
    logged: Number(body.logged) || 0,
    total: Number(body.total) || 0,
    required: Number(body.required) || input.campaignNumber,
  };
}
