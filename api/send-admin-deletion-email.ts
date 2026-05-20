type DeletionEmailRequestBody = {
  recipients?: string[];
  requestId?: string;
  studentName?: string;
  studentRomanNickname?: string;
  className?: string;
  schoolId?: string;
  requestedByName?: string;
  reason?: string;
};

type VercelRequest = {
  method?: string;
  body?: DeletionEmailRequestBody;
};

type VercelResponse = {
  status: (code: number) => VercelResponse;
  json: (body: unknown) => void;
  setHeader: (name: string, value: string) => void;
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Content-Type", "application/json");

  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";
  const fromName = process.env.RESEND_FROM_NAME || "TUWC Demo";

  if (!apiKey) {
    res.status(500).json({ error: "RESEND_API_KEY is not configured" });
    return;
  }

  const {
    recipients = [],
    requestId,
    studentName,
    studentRomanNickname,
    className,
    schoolId,
    requestedByName,
    reason,
  } = req.body ?? {};

  const validRecipients = Array.from(
    new Set(recipients.map((email) => email.trim().toLowerCase()).filter((email) => email.includes("@")))
  );

  if (!requestId || !studentName || !className || !schoolId || !requestedByName || !reason || validRecipients.length === 0) {
    res.status(400).json({ error: "Missing required email payload fields" });
    return;
  }

  const emailPayload = {
    from: `${fromName} <${fromEmail}>`,
    to: validRecipients,
    subject: `Student deletion request: ${studentName}`,
    text: [
      "A deletion request has been submitted and requires admin review.",
      "",
      `Student: ${studentName}`,
      studentRomanNickname ? `Roman nickname: ${studentRomanNickname}` : undefined,
      `Year: ${className}`,
      `School ID: ${schoolId}`,
      `Requested by: ${requestedByName}`,
      `Reason: ${reason}`,
      "",
      `Request ID: ${requestId}`,
    ]
      .filter(Boolean)
      .join("\n"),
    html: `
      <p>A deletion request has been submitted and requires admin review.</p>
      <p><strong>Student:</strong> ${studentName}</p>
      ${studentRomanNickname ? `<p><strong>Roman nickname:</strong> ${studentRomanNickname}</p>` : ""}
      <p><strong>Year:</strong> ${className}</p>
      <p><strong>School ID:</strong> ${schoolId}</p>
      <p><strong>Requested by:</strong> ${requestedByName}</p>
      <p><strong>Reason:</strong> ${reason}</p>
      <p><strong>Request ID:</strong> ${requestId}</p>
    `,
  };

  const resendResponse = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(emailPayload),
  });

  if (!resendResponse.ok) {
    const errorText = await resendResponse.text();
    res.status(resendResponse.status).json({ error: errorText || "Failed to send email with Resend" });
    return;
  }

  const resendData = await resendResponse.json();
  res.status(200).json({ sent: validRecipients.length, id: resendData.id ?? null });
}