type DeletionEmailRequestBody = {
  recipients?: string[];
  requestId?: string;
  studentName?: string;
  studentRomanNickname?: string;
  className?: string;
  schoolName?: string;
  requestedByName?: string;
  requestedBySuffix?: string;
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
    requestedBySuffix,
    reason,
  } = req.body ?? {};

  const validRecipients = Array.from(
    new Set(recipients.map((email) => email.trim().toLowerCase()).filter((email) => email.includes("@")))
  );

  if (!requestId || !studentName || !className || !schoolName || !requestedByName || !reason || validRecipients.length === 0) {
    res.status(400).json({ error: "Missing required email payload fields" });
    return;
  }

  const requestedByDisplayName = [requestedBySuffix, requestedByName]
    .map((value) => value?.trim())
    .filter(Boolean)
    .join(" ");

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
      `School: ${schoolName}`,
      `Requested by: ${requestedByDisplayName}`,
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
            body { font-family: 'Plus Jakarta Sans', 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #e8dcc8; background: #0c0a09; margin: 0; padding: 0; }
            .email-wrap { background: radial-gradient(circle at 20% 0%, rgba(139,28,28,0.26), transparent 34%), radial-gradient(circle at 82% 12%, rgba(212,175,55,0.14), transparent 30%), #0c0a09; padding: 32px 16px; }
            .container { max-width: 620px; margin: 0 auto; background: linear-gradient(135deg, rgba(139,28,28,0.10) 0%, transparent 46%), linear-gradient(225deg, rgba(212,175,55,0.08) 0%, transparent 46%), #1c1917; border: 1px solid rgba(212,175,55,0.28); border-radius: 8px; box-shadow: 0 18px 50px rgba(0,0,0,0.42), inset 0 1px 0 rgba(212,175,55,0.12); overflow: hidden; }
            .top-line { height: 3px; background: linear-gradient(90deg, transparent, #d4af37, transparent); }
            .header { background: linear-gradient(135deg, #5e1313 0%, #8b1c1c 52%, #2c2c2c 100%); padding: 34px 30px 30px; color: #f0d060; text-align: center; border-bottom: 1px solid rgba(212,175,55,0.25); }
            .kicker { margin: 0 0 10px; color: #c9b896; font-size: 11px; font-weight: 800; letter-spacing: 0.18em; text-transform: uppercase; }
            .header h1 { margin: 0; font-family: Cinzel, Georgia, 'Times New Roman', serif; font-size: 26px; line-height: 1.2; font-weight: 700; letter-spacing: 0.02em; text-shadow: 0 0 18px rgba(212,175,55,0.24); }
            .header p { margin: 10px 0 0; color: #e8dcc8; font-size: 14px; opacity: 0.92; }
            .content { padding: 30px; }
            .alert-box { background: rgba(139,28,28,0.18); border: 1px solid rgba(212,175,55,0.25); border-left: 4px solid #d4af37; padding: 16px; margin-bottom: 26px; border-radius: 8px; }
            .alert-box p { margin: 0; color: #e8dcc8; font-size: 14px; }
            .alert-box strong { color: #f0d060; }
            .details-section { margin: 26px 0; }
            .details-section h3 { margin: 0 0 14px; font-family: Cinzel, Georgia, 'Times New Roman', serif; font-size: 15px; font-weight: 700; color: #d4af37; letter-spacing: 0.04em; text-transform: uppercase; border-bottom: 1px solid rgba(212,175,55,0.22); padding-bottom: 10px; }
            .detail-row { display: flex; margin: 0; padding: 11px 0; border-bottom: 1px solid rgba(232,220,200,0.10); }
            .detail-row:last-child { border-bottom: none; }
            .detail-label { font-weight: 800; color: #c9b896; width: 140px; flex-shrink: 0; font-size: 13px; text-transform: uppercase; letter-spacing: 0.08em; }
            .detail-value { flex: 1; color: #f5f5f4; word-break: break-word; font-size: 15px; }
            .reason-box { background: rgba(12,10,9,0.42); border: 1px solid rgba(212,175,55,0.18); border-left: 3px solid #8b1c1c; padding: 14px; border-radius: 8px; margin: 14px 0 0; }
            .reason-box p { margin: 0; font-size: 14px; color: #e8dcc8; line-height: 1.6; }
            .footer { background: rgba(12,10,9,0.45); padding: 22px 30px; border-top: 1px solid rgba(212,175,55,0.18); font-size: 12px; color: #c9b896; text-align: center; }
            .footer p { margin: 6px 0; }
            .footer strong { color: #d4af37; }
            .request-id { font-family: 'Courier New', monospace; color: #8f8370; font-size: 11px; }
            @media (max-width: 520px) { .content, .header, .footer { padding-left: 20px; padding-right: 20px; } .detail-row { display: block; } .detail-label { width: auto; margin-bottom: 3px; } }
          </style>
        </head>
        <body>
          <div class="email-wrap">
            <div class="container">
              <div class="top-line"></div>
              <div class="header">
                <p class="kicker">Admin Review Required</p>
                <h1>Student Deletion Request</h1>
                <p>A teacher has requested removal of a student record.</p>
              </div>
            
              <div class="content">
                <div class="alert-box">
                  <p><strong>Action needed:</strong> Review this request in the admin dashboard before any student data is removed.</p>
                </div>

                <div class="details-section">
                  <h3>Student Information</h3>
                  <div class="detail-row">
                    <div class="detail-label">Name</div>
                    <div class="detail-value">${studentName}</div>
                  </div>
                  ${studentRomanNickname ? `
                  <div class="detail-row">
                    <div class="detail-label">Roman Name</div>
                    <div class="detail-value">${studentRomanNickname}</div>
                  </div>
                  ` : ""}
                  <div class="detail-row">
                    <div class="detail-label">Year/Class</div>
                    <div class="detail-value">${className}</div>
                  </div>
                </div>

                <div class="details-section">
                  <h3>Request Details</h3>
                  <div class="detail-row">
                    <div class="detail-label">Requested By</div>
                    <div class="detail-value">${requestedByDisplayName}</div>
                  </div>
                  <div class="detail-row">
                    <div class="detail-label">School</div>
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
                <p><strong>Next Steps:</strong> Log into the admin dashboard to approve or reject this deletion request.</p>
                <p style="font-size: 11px; color: #8f8370; margin-top: 15px; border-top: 1px solid rgba(212,175,55,0.12); padding-top: 10px;">Request ID: <span class="request-id">${requestId}</span></p>
                <p>This is an automated message. Do not reply to this email.</p>
              </div>
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