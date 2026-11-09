const { Resend } = require('resend');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { name, email, company, role, message, type } = req.body || {};

  if (!name || !email) {
    return res.status(400).json({ error: 'Name and email are required' });
  }

  const isDemo = type === 'demo';
  const subject = isDemo
    ? `New Demo Request: ${name} - ${company || 'Unknown Company'}`
    : `New Partnership Enquiry: ${name} - ${company || 'Unknown Company'}`;

  const heading = isDemo ? 'New Demo Request' : 'New Partnership Enquiry';

  const htmlContent = `
  <div style="font-family: 'DM Sans', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; color: #1a1a2e; border-radius: 12px; overflow: hidden; border: 1px solid #e5e7eb;">
    <div style="background: linear-gradient(135deg, #eff6ff 0%, #ffffff 100%); padding: 32px 36px 24px; border-bottom: 1px solid #e5e7eb;">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
        <div style="width:8px;height:8px;background:#2563eb;border-radius:50%;"></div>
        <span style="font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:#2563eb;font-weight:700">KAYO PULSE</span>
      </div>
      <h1 style="font-family:'Syne','Inter',sans-serif;font-size:22px;font-weight:700;color:#1a1a2e;margin:0 0 4px;">${heading}</h1>
      <p style="color:#6b7280;font-size:13px;margin:0;">Received via kayopulse.com</p>
    </div>
    <div style="padding: 28px 36px;">
      <table style="width:100%;border-collapse:collapse;">
        <tr>
          <td style="padding:10px 0;border-bottom:1px solid #e5e7eb;color:#6b7280;font-size:13px;width:120px;font-weight:500;">Name</td>
          <td style="padding:10px 0;border-bottom:1px solid #e5e7eb;color:#1a1a2e;font-size:14px;font-weight:600;">${name}</td>
        </tr>
        <tr>
          <td style="padding:10px 0;border-bottom:1px solid #e5e7eb;color:#6b7280;font-size:13px;font-weight:500;">Email</td>
          <td style="padding:10px 0;border-bottom:1px solid #e5e7eb;"><a href="mailto:${email}" style="color:#2563eb;font-size:14px;text-decoration:none;font-weight:500;">${email}</a></td>
        </tr>
        ${company ? `<tr>
          <td style="padding:10px 0;border-bottom:1px solid #e5e7eb;color:#6b7280;font-size:13px;font-weight:500;">Company</td>
          <td style="padding:10px 0;border-bottom:1px solid #e5e7eb;color:#1a1a2e;font-size:14px;">${company}</td>
        </tr>` : ''}
        ${role ? `<tr>
          <td style="padding:10px 0;border-bottom:1px solid #e5e7eb;color:#6b7280;font-size:13px;font-weight:500;">Role</td>
          <td style="padding:10px 0;border-bottom:1px solid #e5e7eb;color:#1a1a2e;font-size:14px;">${role}</td>
        </tr>` : ''}
        ${message ? `<tr>
          <td style="padding:10px 0;color:#6b7280;font-size:13px;vertical-align:top;font-weight:500;">Message</td>
          <td style="padding:10px 0;color:#1a1a2e;font-size:14px;line-height:1.6;">${message}</td>
        </tr>` : ''}
      </table>
    </div>
    <div style="background:#f8fafb;padding:16px 36px;border-top:1px solid #e5e7eb;">
      <p style="color:#9ca3af;font-size:11px;margin:0;">This notification was sent automatically by the Kayo Pulse platform. Reply directly to this email to respond to ${name}.</p>
    </div>
  </div>`;

  const resendApiKey = process.env.RESEND_API_KEY || process.env.RESEND_KEY;
  console.log('[book-demo] incoming', { name, email, company, role, messageProvided: Boolean(message), type, hasApiKey: Boolean(resendApiKey), envKey: process.env.RESEND_API_KEY ? 'RESEND_API_KEY' : process.env.RESEND_KEY ? 'RESEND_KEY' : 'none' });

  if (!resendApiKey) {
    console.error('[book-demo] RESEND_API_KEY/RESEND_KEY not set; cannot send emails', { type, name, email, company, role });
    return res.status(500).json({
      success: false,
      error: 'Email delivery not configured',
      details: 'Missing RESEND_API_KEY or RESEND_KEY environment variable'
    });
  }

  const resend = new Resend(resendApiKey);

  try {
    // Send email to internal team
    const internalResult = await resend.emails.send({
      from: 'Kayo Pulse Platform <noreply@kayopulse.com>',
      to: 'information@kayopulse.com',
      replyTo: email,
      subject,
      html: htmlContent,
    });

    if (internalResult?.error) {
      console.error('[book-demo] Resend API error (internal)', internalResult.error);
      return res.status(500).json({ error: 'Internal email delivery failed', details: internalResult.error });
    }

    console.log('[book-demo] internal send ok', { id: internalResult?.data?.id });

    // Send confirmation email to client
    const confirmationHtml = `
  <div style="font-family: 'DM Sans', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; color: #1a1a2e; border-radius: 12px; overflow: hidden; border: 1px solid #e5e7eb;">
    <div style="background: linear-gradient(135deg, #eff6ff 0%, #ffffff 100%); padding: 32px 36px 24px; border-bottom: 1px solid #e5e7eb;">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
        <div style="width:8px;height:8px;background:#2563eb;border-radius:50%;"></div>
        <span style="font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:#2563eb;font-weight:700">KAYO PULSE</span>
      </div>
      <h1 style="font-family:'Syne','Inter',sans-serif;font-size:22px;font-weight:700;color:#1a1a2e;margin:0 0 4px;">You're on the list!</h1>
      <p style="color:#6b7280;font-size:13px;margin:0;">We've received your request</p>
    </div>
    <div style="padding: 28px 36px;">
      <p style="color:#1a1a2e;font-size:14px;line-height:1.8;margin:0 0 16px;">Hi ${name},</p>
      <p style="color:#6b7280;font-size:14px;line-height:1.8;margin:0 0 16px;">Thank you for your interest in Kayo Pulse! We've received your ${isDemo ? 'demo request' : 'partnership enquiry'} and appreciate you reaching out.</p>
      <p style="color:#6b7280;font-size:14px;line-height:1.8;margin:0 0 16px;">Our team will review your information and get back to you within 24 hours. In the meantime, if you have any questions, feel free to reply to this email.</p>
      <div style="background:#f8fafb;padding:16px;border-left:3px solid #2563eb;margin:20px 0;border-radius:4px;">
        <p style="color:#2563eb;font-size:12px;margin:0;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;">Request Details</p>
        <table style="width:100%;margin-top:12px;border-collapse:collapse;">
          <tr>
            <td style="color:#9ca3af;font-size:12px;padding:6px 0;font-weight:500;">Email:</td>
            <td style="color:#1a1a2e;font-size:12px;padding:6px 0;font-weight:600;">${email}</td>
          </tr>
          ${company ? `<tr>
            <td style="color:#9ca3af;font-size:12px;padding:6px 0;font-weight:500;">Company:</td>
            <td style="color:#1a1a2e;font-size:12px;padding:6px 0;font-weight:600;">${company}</td>
          </tr>` : ''}
          ${role ? `<tr>
            <td style="color:#9ca3af;font-size:12px;padding:6px 0;font-weight:500;">Role:</td>
            <td style="color:#1a1a2e;font-size:12px;padding:6px 0;font-weight:600;">${role}</td>
          </tr>` : ''}
        </table>
      </div>
    </div>
    <div style="background:#f8fafb;padding:16px 36px;border-top:1px solid #e5e7eb;">
      <p style="color:#9ca3af;font-size:11px;margin:0;">Best regards,<br/>The Kayo Pulse Team</p>
    </div>
  </div>`;

    const confirmResult = await resend.emails.send({
      from: 'Kayo Pulse Platform <noreply@kayopulse.com>',
      to: email,
      subject: `We've received your ${isDemo ? 'demo request' : 'partnership enquiry'}`,
      html: confirmationHtml,
    });

    if (confirmResult?.error) {
      console.error('[book-demo] Resend API error (confirmation)', confirmResult.error);
      return res.status(500).json({
        error: 'Confirmation email delivery failed',
        details: confirmResult.error,
        internalEmailId: internalResult?.data?.id
      });
    }

    console.log('[book-demo] confirmation send ok', { id: confirmResult?.data?.id, to: email });

    if (!confirmResult?.data?.id) {
      console.error('[book-demo] confirmation send returned no data.id', confirmResult);
      return res.status(500).json({
        error: 'Confirmation email delivery failed (missing id)',
        details: confirmResult,
        internalEmailId: internalResult?.data?.id
      });
    }

    return res.status(200).json({ success: true, id: internalResult.data.id, confirmationId: confirmResult.data.id });
  } catch (error) {
    console.error('Function error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
