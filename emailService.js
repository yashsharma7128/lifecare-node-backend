const nodemailer = require("nodemailer");

// Target Python Mail API (hosted on your dedicated server)
const PYTHON_MAIL_API =
  process.env.PYTHON_MAIL_API || "http://107.6.185.74:8913/send-contact-emails";

/**
 * Send contact inquiry emails by delegating to dedicated Python Mail Server
 */
const sendViaPythonMailServer = async (contact) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);

  const response = await fetch(PYTHON_MAIL_API, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: contact.name,
      email: contact.email,
      phone: contact.phone,
      message: contact.message,
    }),
    signal: controller.signal,
  });

  clearTimeout(timeoutId);
  const data = await response.json();

  if (!response.ok || !data.success) {
    throw new Error(data.error || "Python mail server failed to deliver email");
  }

  return { messageId: "python-mail-service" };
};

// Fallback SMTP Transporter (for local machine)
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
 * Send Admin Notification
 */
const sendContactAdminNotification = async (contact) => {
  try {
    console.log(`[EmailService] Forwarding inquiry to Python mail server: ${PYTHON_MAIL_API}`);
    await sendViaPythonMailServer(contact);
    console.log("[EmailService] Successfully processed via Python mail server");
  } catch (err) {
    console.warn("[EmailService] Python server error, trying local SMTP fallback:", err.message);

    const transporter = createTransporter();
    if (transporter) {
      const adminEmail = process.env.ADMIN_EMAIL || process.env.SMTP_USER || "care.lifecarerosystems@gmail.com";
      await transporter.sendMail({
        from: `"Life Care RO Systems" <${process.env.SMTP_USER || "care.lifecarerosystems@gmail.com"}>`,
        to: adminEmail,
        subject: `🔔 New Contact Inquiry from ${contact.name}`,
        html: `<p><strong>Name:</strong> ${contact.name}</p><p><strong>Phone:</strong> ${contact.phone}</p><p><strong>Email:</strong> ${contact.email}</p><p><strong>Message:</strong> ${contact.message}</p>`,
      });
      console.log("[EmailService] Sent via local SMTP fallback");
    } else {
      console.error("[EmailService] No fallback available");
    }
  }
};

/**
 * Send Customer Thank You (handled automatically by Python server)
 */
const sendContactCustomerThankYou = async (contact) => {
  // The Python Mail Server handles sending both the admin alert and customer thank-you
  // in a single background request.
  return;
};

module.exports = {
  sendViaPythonMailServer,
  sendContactAdminNotification,
  sendContactCustomerThankYou,
};
