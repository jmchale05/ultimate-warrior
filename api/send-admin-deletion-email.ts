type DeletionEmailRequestBody = {
  recipients?: string[];
  requestId?: string;
  studentName?: string;
  studentRomanNickname?: string;
  className?: string;
  schoolName?: string;
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
    schoolName,
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
    subject: `⚠️ Student deletion request: ${studentName}`,
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
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; background: #f5f5f5; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); overflow: hidden; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; color: white; text-align: center; }
            .header h1 { margin: 0; font-size: 24px; font-weight: 600; }
            .header p { margin: 8px 0 0 0; font-size: 14px; opacity: 0.9; }
            .content { padding: 30px; }
            .alert-box { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin-bottom: 25px; border-radius: 4px; }
            .alert-box p { margin: 0; color: #856404; font-size: 14px; }
            .details-section { margin: 25px 0; }
            .details-section h3 { margin: 0 0 15px 0; font-size: 16px; font-weight: 600; color: #333; border-bottom: 2px solid #667eea; padding-bottom: 10px; }
            .detail-row { display: flex; margin: 12px 0; padding: 8px 0; border-bottom: 1px solid #eee; }
            .detail-row:last-child { border-bottom: none; }
            .detail-label { font-weight: 600; color: #667eea; width: 140px; flex-shrink: 0; }
            .detail-value { flex: 1; color: #333; word-break: break-word; }
            .reason-box { background: #f8f9fa; border-left: 3px solid #667eea; padding: 12px; border-radius: 4px; margin: 15px 0; }
            .reason-box p { margin: 0; font-size: 14px; color: #555; line-height: 1.5; }
            .footer { background: #f8f9fa; padding: 20px 30px; border-top: 1px solid #eee; font-size: 12px; color: #666; text-align: center; }
            .footer p { margin: 5px 0; }
            .request-id { font-family: 'Courier New', monospace; background: #f0f0f0; padding: 8px 12px; border-radius: 4px; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🔔 Student Deletion Request</h1>
              <p>Action Required - Admin Review Needed</p>
            </div>
            
            <div class="content">
              <div class="alert-box">
                <p><strong>⚠️ Important:</strong> A student deletion request has been submitted and requires your immediate review and approval.</p>
              </div>

              <div class="details-section">
                <h3>Student Information</h3>
                <div class="detail-row">
                  <div class="detail-label">Name:</div>
                  <div class="detail-value">${studentName}</div>
                </div>
                ${studentRomanNickname ? `
                <div class="detail-row">
                  <div class="detail-label">Roman Nickname:</div>
                  <div class="detail-value">${studentRomanNickname}</div>
                </div>
                ` : ""}
                <div class="detail-row">
                  <div class="detail-label">Year/Class:</div>
                  <div class="detail-value">${className}</div>
                </div>
              </div>

              <div class="details-section">
                <h3>Request Details</h3>
                <div class="detail-row">
                  <div class="detail-label">Requested By:</div>
                  <div class="detail-value">${requestedByName}</div>
                </div>
                <div class="detail-row">
                  <div class="detail-label">School:</div>
                  <div class="detail-value">${schoolName}</div>
                </div>
              </div>

              <div class="details-section">
                <h3>Reason for Deletion</h3>
                <div class="reason-box">
                  <p>${reason}</p>
                </div>
              </div>
            </div>

            <div class="footer">
              <p><strong>Next Steps:</strong> Log into the admin dashboard to review and approve/reject this deletion request.</p>
              <p style="font-size: 11px; color: #999; margin-top: 15px; border-top: 1px solid #eee; padding-top: 10px;">Request ID: <span class="request-id">${requestId}</span></p>
              <p>This is an automated message. Do not reply to this email.</p>
            </div>
          </div>
        </body>
      </html>
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