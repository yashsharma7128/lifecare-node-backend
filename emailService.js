const nodemailer = require("nodemailer");

/**
 * Send email via Brevo HTTPS REST API (Port 443 - Never blocked on cloud/Render)
 */
const sendViaBrevoApi = async (apiKey, { to, subject, html, fromName = "Life Care RO Systems", fromEmail = "care.lifecarerosystems@gmail.com" }) => {
  const toList = Array.isArray(to) ? to.map(e => ({ email: e })) : [{ email: to }];
  
  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "accept": "application/json",
      "api-key": apiKey.trim(),
      "content-type": "application/json",
    },
    body: JSON.stringify({
      sender: { name: fromName, email: fromEmail },
      to: toList,
      subject,
      htmlContent: html,
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || JSON.stringify(data));
  }
  return { messageId: data.messageId };
};

/**
 * Send email via Resend HTTPS REST API (Port 443 - Never blocked on cloud/Render)
 */
const sendViaResendApi = async (apiKey, { to, subject, html, fromName = "Life Care RO Systems" }) => {
  const toList = Array.isArray(to) ? to : [to];
  
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey.trim()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: `${fromName} <onboarding@resend.dev>`,
      to: toList,
      subject,
      html,
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || JSON.stringify(data));
  }
  return { messageId: data.id };
};

// Create reusable SMTP transporter (for local or SMTP unblocked servers)
const createTransporter = () => {
  const user = (process.env.SMTP_USER || "care.lifecarerosystems@gmail.com").trim();
  const rawPass = process.env.SMTP_PASS;

  if (!rawPass) return null;

  const pass = rawPass.replace(/\s+/g, "").trim();

  return nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: { user, pass },
    tls: { rejectUnauthorized: false },
  });
};

/**
 * Generic Unified Email Dispatcher
 */
const dispatchEmail = async ({ to, subject, html }) => {
  const brevoKey = process.env.BREVO_API_KEY;
  const resendKey = process.env.RESEND_API_KEY;

  if (brevoKey) {
    console.log("[EmailService] Sending via Brevo HTTPS API...");
    return await sendViaBrevoApi(brevoKey, { to, subject, html });
  }

  if (resendKey) {
    console.log("[EmailService] Sending via Resend HTTPS API...");
    return await sendViaResendApi(resendKey, { to, subject, html });
  }

  const transporter = createTransporter();
  if (transporter) {
    console.log("[EmailService] Sending via SMTP (Port 465)...");
    const mailOptions = {
      from: `"Life Care RO Systems" <${process.env.SMTP_USER || "care.lifecarerosystems@gmail.com"}>`,
      to,
      subject,
      html,
    };
    return await transporter.sendMail(mailOptions);
  }

  throw new Error("No valid email transport configured (BREVO_API_KEY, RESEND_API_KEY, or SMTP_PASS required).");
};

/**
 * Send Admin Notification when an inquiry is submitted
 */
const sendContactAdminNotification = async (contact) => {
  const adminEmail = process.env.ADMIN_EMAIL || process.env.SMTP_USER || "care.lifecarerosystems@gmail.com";

  const html = `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #E2E8F0; border-radius: 12px; overflow: hidden;">
      <div style="background: #0A2540; padding: 24px 20px; text-align: center;">
        <h2 style="color: #ffffff; margin: 0; font-size: 20px;">New Customer Inquiry</h2>
        <p style="color: #00C9A7; margin: 4px 0 0 0; font-size: 13px; font-weight: 600;">Life Care RO Systems Lead Alert</p>
      </div>
      <div style="padding: 24px 20px;">
        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
          <tr>
            <td style="padding: 10px 0; border-bottom: 1px solid #F0F4F8; color: #64748B; width: 120px;"><strong>Customer Name:</strong></td>
            <td style="padding: 10px 0; border-bottom: 1px solid #F0F4F8; color: #0A2540; font-weight: 600;">${contact.name || "N/A"}</td>
          </tr>
          <tr>
            <td style="padding: 10px 0; border-bottom: 1px solid #F0F4F8; color: #64748B;"><strong>Phone:</strong></td>
            <td style="padding: 10px 0; border-bottom: 1px solid #F0F4F8; color: #0A2540;">
              <a href="tel:${contact.phone}" style="color: #1A6FD4; text-decoration: none;">📞 ${contact.phone || "N/A"}</a>
              ${contact.phone ? ` | <a href="https://wa.me/91${contact.phone.replace(/\D/g, '')}" style="color: #00C9A7; text-decoration: none;">💬 WhatsApp</a>` : ""}
            </td>
          </tr>
          <tr>
            <td style="padding: 10px 0; border-bottom: 1px solid #F0F4F8; color: #64748B;"><strong>Email:</strong></td>
            <td style="padding: 10px 0; border-bottom: 1px solid #F0F4F8; color: #0A2540;">
              <a href="mailto:${contact.email}" style="color: #1A6FD4; text-decoration: none;">✉️ ${contact.email || "N/A"}</a>
            </td>
          </tr>
          <tr>
            <td style="padding: 10px 0; border-bottom: 1px solid #F0F4F8; color: #64748B; vertical-align: top;"><strong>Message:</strong></td>
            <td style="padding: 10px 0; border-bottom: 1px solid #F0F4F8; color: #0A2540; background: #F8FAFC; padding: 12px; border-radius: 6px; white-space: pre-wrap;">${contact.message || "N/A"}</td>
          </tr>
          <tr>
            <td style="padding: 10px 0; color: #64748B;"><strong>Received At:</strong></td>
            <td style="padding: 10px 0; color: #64748B; font-size: 13px;">${new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })} IST</td>
          </tr>
        </table>
      </div>
      <div style="background: #F0F7FF; padding: 14px 20px; text-align: center; font-size: 12px; color: #64748B;">
        This inquiry was received from your website contact form.
      </div>
    </div>
  `;

  try {
    const info = await dispatchEmail({
      to: adminEmail,
      subject: `🔔 New Contact Inquiry from ${contact.name}`,
      html,
    });
    console.log(`[EmailService] Admin notification sent:`, info.messageId);
    return info;
  } catch (error) {
    console.error("[EmailService] Error sending admin notification:", error.message);
    throw error;
  }
};

/**
 * Send Customer Thank-You Email with Social and Review Links
 */
const sendContactCustomerThankYou = async (contact) => {
  if (!contact.email || !contact.email.includes("@")) return;

  const html = `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #E2E8F0; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(10,37,64,0.06);">
      <!-- Header -->
      <div style="background: #0A2540; padding: 32px 24px; text-align: center;">
        <h1 style="color: #ffffff; margin: 0 0 6px 0; font-size: 24px; font-weight: 700; letter-spacing: 0.5px;">LIFE CARE RO SYSTEMS</h1>
        <p style="color: #00C9A7; margin: 0; font-size: 12px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase;">PURE WATER · PURE AIR</p>
      </div>

      <!-- Body -->
      <div style="padding: 32px 24px; color: #1A202C;">
        <h2 style="color: #0A2540; font-size: 20px; margin: 0 0 16px 0;">Hello ${contact.name || "Valued Customer"},</h2>
        
        <p style="font-size: 15px; line-height: 1.6; color: #4A5568; margin: 0 0 16px 0;">
          Thank you for reaching out to <strong>Life Care RO Systems</strong>! We have received your inquiry and our team is already reviewing it.
        </p>

        <p style="font-size: 15px; line-height: 1.6; color: #4A5568; margin: 0 0 24px 0;">
          One of our service specialists will contact you shortly to assist you with your water purifier or service requirement.
        </p>

        <!-- Inquiry Summary Box -->
        <div style="background: #F0F7FF; border-left: 4px solid #00C9A7; padding: 16px; border-radius: 8px; margin-bottom: 28px;">
          <p style="margin: 0 0 6px 0; font-size: 12px; color: #64748B; font-weight: 700; text-transform: uppercase;">Your Message:</p>
          <p style="margin: 0; font-size: 14px; color: #0A2540; font-style: italic;">"${contact.message}"</p>
        </div>

        <!-- Direct Contact -->
        <div style="background: #FAFAFC; border: 1px solid #E2E8F0; border-radius: 12px; padding: 20px; text-align: center; margin-bottom: 28px;">
          <p style="margin: 0 0 12px 0; font-size: 14px; font-weight: 700; color: #0A2540;">Need Immediate Assistance?</p>
          <div style="display: flex; justify-content: center; gap: 12px; flex-wrap: wrap;">
            <a href="tel:9312670679" style="background: #0A2540; color: #ffffff; padding: 10px 18px; border-radius: 8px; text-decoration: none; font-size: 13px; font-weight: 600; display: inline-block;">📞 Call 9312670679</a>
            <a href="https://wa.me/919312670679?text=Hi%20I%20contacted%20via%20website" style="background: #25D366; color: #ffffff; padding: 10px 18px; border-radius: 8px; text-decoration: none; font-size: 13px; font-weight: 600; display: inline-block;">💬 WhatsApp Us</a>
          </div>
        </div>

        <!-- Socials & Reviews Section -->
        <div style="border-top: 1px solid #E2E8F0; padding-top: 24px; text-align: center;">
          <h3 style="font-size: 16px; color: #0A2540; margin: 0 0 12px 0;">Connect With Us & Share Your Feedback</h3>
          <p style="font-size: 13.5px; color: #64748B; margin: 0 0 18px 0;">
            Follow us on social media for water health tips, maintenance guides, and new offers!
          </p>

          <div style="margin-bottom: 20px;">
            <!-- Instagram -->
            <a href="https://www.instagram.com/lifecarerosystems/" target="_blank" style="background: linear-gradient(45deg, #F58529, #D62976, #962FBF); color: #ffffff; padding: 10px 20px; border-radius: 24px; text-decoration: none; font-size: 13px; font-weight: 600; display: inline-block; margin: 4px 6px;">
              📸 Follow on Instagram
            </a>
            <!-- Google Review -->
            <a href="https://www.google.com/search?q=life+care+ro+systems" target="_blank" style="background: #4285F4; color: #ffffff; padding: 10px 20px; border-radius: 24px; text-decoration: none; font-size: 13px; font-weight: 600; display: inline-block; margin: 4px 6px;">
              ⭐ Drop a Google Review
            </a>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div style="background: #050F1C; color: #A0AEC0; padding: 24px; text-align: center; font-size: 12px; line-height: 1.6;">
        <p style="margin: 0 0 6px 0; color: #FFFFFF; font-weight: 600;">Life Care RO Systems</p>
        <p style="margin: 0 0 8px 0;">T-19, Malik Buildcon Plaza-2, Sector-12, Dwarka, New Delhi - 110075</p>
        <p style="margin: 0; color: #718096;">© ${new Date().getFullYear()} Life Care RO Systems. All rights reserved.</p>
      </div>
    </div>
  `;

  try {
    const info = await dispatchEmail({
      to: contact.email,
      subject: `Thank you for contacting Life Care RO Systems! 💧`,
      html,
    });
    console.log(`[EmailService] Customer thank-you email sent:`, info.messageId);
    return info;
  } catch (error) {
    console.error("[EmailService] Error sending customer thank-you email:", error.message);
  }
};

module.exports = {
  dispatchEmail,
  sendContactAdminNotification,
  sendContactCustomerThankYou,
};
