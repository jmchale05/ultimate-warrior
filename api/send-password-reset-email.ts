import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

type PasswordResetRequestBody = {
  email?: string;
  continueUrl?: string;
};

type VercelRequest = {
  method?: string;
  body?: PasswordResetRequestBody;
};

type VercelResponse = {
  status: (code: number) => VercelResponse;
  json: (body: unknown) => void;
  setHeader: (name: string, value: string) => void;
};

function getFirebasePrivateKey(): string | undefined {
  return process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");
}

function ensureFirebaseAdmin() {
  if (getApps().length > 0) return;

  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = getFirebasePrivateKey();

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error("Firebase Admin credentials are not configured");
  }

  initializeApp({
    credential: cert({
      projectId,
      clientEmail,
      privateKey,
    }),
  });
}

function getBaseUrl(req: VercelRequest): string {
  const configuredUrl = process.env.APP_URL || process.env.VITE_APP_URL;
  if (configuredUrl?.trim()) return configuredUrl.trim().replace(/\/$/, "");

  const host = (req as { headers?: { host?: string; "x-forwarded-proto"?: string } }).headers?.host;
  const protocol = (req as { headers?: { "x-forwarded-proto"?: string } }).headers?.["x-forwarded-proto"] ?? "https";
  return host ? `${protocol}://${host}` : "https://ultimate-warrior.vercel.app";
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

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

  const email = req.body?.email?.trim().toLowerCase();
  if (!email || !email.includes("@")) {
    res.status(400).json({ error: "A valid email address is required" });
    return;
  }

  try {
    ensureFirebaseAdmin();

    const baseUrl = getBaseUrl(req);
    const continueUrl = req.body?.continueUrl?.trim() || `${baseUrl}/login`;
    const resetLink = await getAuth().generatePasswordResetLink(email, {
      url: continueUrl,
      handleCodeInApp: false,
    });
    const escapedResetLink = escapeHtml(resetLink);

    const emailPayload = {
      from: `${fromName} <${fromEmail}>`,
      to: [email],
      subject: "Reset your Ultimate Warrior Challenges password",
      text: [
        "We received a request to reset your Ultimate Warrior Challenges password.",
        "",
        "Open this link to choose a new password:",
        resetLink,
        "",
        "If you did not request this, you can ignore this email.",
      ].join("\n"),
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
              .message { margin: 0 0 22px; color: #e8dcc8; font-size: 15px; }
              .button-wrap { text-align: center; margin: 28px 0; }
              .button { display: inline-block; background: linear-gradient(135deg, #8b1c1c 0%, #5e1313 100%); color: #f0d060 !important; border: 1px solid rgba(212,175,55,0.52); border-radius: 8px; padding: 13px 22px; text-decoration: none; font-weight: 800; font-size: 12px; letter-spacing: 0.14em; text-transform: uppercase; box-shadow: 0 0 18px rgba(139,28,28,0.34); }
              .notice { background: rgba(12,10,9,0.42); border: 1px solid rgba(212,175,55,0.18); border-left: 3px solid #d4af37; padding: 14px; border-radius: 8px; margin-top: 20px; color: #c9b896; font-size: 13px; }
              .fallback { color: #8f8370; font-size: 12px; word-break: break-all; margin-top: 22px; }
              .fallback a { color: #c9b896; }
              .footer { background: rgba(12,10,9,0.45); padding: 22px 30px; border-top: 1px solid rgba(212,175,55,0.18); font-size: 12px; color: #c9b896; text-align: center; }
              .footer p { margin: 6px 0; }
              .footer strong { color: #d4af37; }
              @media (max-width: 520px) { .content, .header, .footer { padding-left: 20px; padding-right: 20px; } }
            </style>
          </head>
          <body>
            <div class="email-wrap">
              <div class="container">
                <div class="top-line"></div>
                <div class="header">
                  <p class="kicker">Account Recovery</p>
                  <h1>Reset Your Password</h1>
                  <p>Use the secure link below to choose a new password.</p>
                </div>

                <div class="content">
                  <p class="message">We received a request to reset the password for your Ultimate Warrior Challenges account.</p>
                  <div class="button-wrap">
                    <a class="button" href="${escapedResetLink}">Reset Password</a>
                  </div>
                  <div class="notice">
                    This link can only be used to reset your password. If you did not request this, you can ignore this email and your password will stay the same.
                  </div>
                  <p class="fallback">If the button does not work, copy and paste this link into your browser:<br><a href="${escapedResetLink}">${escapedResetLink}</a></p>
                </div>

                <div class="footer">
                  <p><strong>Ultimate Warrior Challenges</strong></p>
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
      res.status(resendResponse.status).json({ error: errorText || "Failed to send password reset email with Resend" });
      return;
    }

    res.status(200).json({ sent: true });
  } catch (err) {
    const code = (err as { code?: string }).code;
    if (code === "auth/user-not-found") {
      res.status(200).json({ sent: true });
      return;
    }

    console.error("Failed to send password reset email:", err);
    res.status(500).json({ error: "Failed to send password reset email" });
  }
}
