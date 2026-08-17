const nodemailer = require("nodemailer");

// Create reusable transporter
const createTransporter = () => {
  const user = process.env.SMTP_USER || "care.lifecarerosystems@gmail.com";
  const pass = process.env.SMTP_PASS;

  if (!pass) {
    console.warn(
      "[EmailService] Warning: SMTP_PASS is not configured in .env. Emails will not be delivered until SMTP credentials are provided."
    );
    return null;
  }

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: parseInt(process.env.SMTP_PORT || "587", 10),
    secure: process.env.SMTP_PORT === "465",
    auth: { user, pass },
  });
};

/**
 * Send Admin Notification when an inquiry is submitted
 */
const sendContactAdminNotification = async (contact) => {
  const transporter = createTransporter();
  if (!transporter) return;

  const adminEmail =
    process.env.ADMIN_EMAIL ||
    process.env.SMTP_USER ||
    "care.lifecarerosystems@gmail.com";

  const mailOptions = {
    from: `"Life Care RO Systems" <${process.env.SMTP_USER || "care.lifecarerosystems@gmail.com"}>`,
    to: adminEmail,
    subject: `🔔 New Contact Inquiry from ${contact.name}`,
    html: `
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
    `,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`[EmailService] Admin notification sent: ${info.messageId}`);
  } catch (error) {
    console.error("[EmailService] Error sending admin notification:", error.message);
  }
};

/**
 * Send Customer Thank-You Email with Social and Review Links
 */
const sendContactCustomerThankYou = async (contact) => {
  if (!contact.email || !contact.email.includes("@")) return;

  const transporter = createTransporter();
  if (!transporter) return;

  const mailOptions = {
    from: `"Life Care RO Systems" <${process.env.SMTP_USER || "care.lifecarerosystems@gmail.com"}>`,
    to: contact.email,
    subject: `Thank you for contacting Life Care RO Systems! 💧`,
    html: `
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
    `,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`[EmailService] Customer thank-you email sent: ${info.messageId}`);
  } catch (error) {
    console.error("[EmailService] Error sending customer thank-you email:", error.message);
  }
};

module.exports = {
  sendContactAdminNotification,
  sendContactCustomerThankYou,
};
