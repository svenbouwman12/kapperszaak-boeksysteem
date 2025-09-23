// Vercel serverless function for sending emails via Gmail SMTP
const nodemailer = require('nodemailer');

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const {
      toEmail,
      toName,
      serviceName,
      kapperName,
      appointmentDate,
      appointmentTime,
      appointmentEndTime,
      salonName,
      salonPhone,
      salonAddress
    } = req.body;

    // Validate required fields
    if (!toEmail || !toName || !appointmentDate || !appointmentTime) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Create Gmail transporter
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER, // Your Gmail address
        pass: process.env.GMAIL_APP_PASSWORD // Your Gmail App Password
      }
    });

    // Email content
    const mailOptions = {
      from: {
        name: salonName || 'Kapperszaak',
        address: process.env.GMAIL_USER
      },
      to: toEmail,
      subject: `Bevestiging afspraak bij ${salonName || 'Kapperszaak'}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
            .content { background: white; padding: 20px; border: 1px solid #e9ecef; border-radius: 8px; }
            .appointment-details { background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 15px 0; }
            .detail-row { margin: 8px 0; }
            .label { font-weight: bold; color: #495057; }
            .footer { margin-top: 20px; padding-top: 20px; border-top: 1px solid #e9ecef; font-size: 14px; color: #6c757d; }
            .salon-info { background: #e9ecef; padding: 15px; border-radius: 5px; margin: 15px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>✂️ Afspraak Bevestiging</h1>
            </div>
            
            <div class="content">
              <p>Beste <strong>${toName}</strong>,</p>
              
              <p>Bedankt voor je afspraak bij <strong>${salonName || 'Kapperszaak'}</strong>!</p>
              
              <div class="appointment-details">
                <h3>📅 Afspraak Details:</h3>
                <div class="detail-row">
                  <span class="label">Datum:</span> ${appointmentDate}
                </div>
                <div class="detail-row">
                  <span class="label">Tijd:</span> ${appointmentTime} - ${appointmentEndTime}
                </div>
                <div class="detail-row">
                  <span class="label">Dienst:</span> ${serviceName || 'Onbekend'}
                </div>
                <div class="detail-row">
                  <span class="label">Kapper:</span> ${kapperName || 'Onbekend'}
                </div>
              </div>
              
              <div class="salon-info">
                <h3>📍 Onze gegevens:</h3>
                <div class="detail-row">
                  <strong>${salonName || 'Kapperszaak'}</strong>
                </div>
                <div class="detail-row">
                  📍 ${salonAddress || 'Adres niet opgegeven'}
                </div>
                <div class="detail-row">
                  📞 ${salonPhone || 'Telefoon niet opgegeven'}
                </div>
              </div>
              
              <p>We kijken uit naar je bezoek!</p>
              
              <p>Met vriendelijke groet,<br>
              Het team van <strong>${salonName || 'Kapperszaak'}</strong></p>
            </div>
            
            <div class="footer">
              <p>Deze e-mail is automatisch verzonden. Reageer niet op dit e-mailadres.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
        Bevestiging afspraak bij ${salonName || 'Kapperszaak'}
        
        Beste ${toName},
        
        Bedankt voor je afspraak bij ${salonName || 'Kapperszaak'}!
        
        Afspraak Details:
        - Datum: ${appointmentDate}
        - Tijd: ${appointmentTime} - ${appointmentEndTime}
        - Dienst: ${serviceName || 'Onbekend'}
        - Kapper: ${kapperName || 'Onbekend'}
        
        Onze gegevens:
        ${salonName || 'Kapperszaak'}
        ${salonAddress || 'Adres niet opgegeven'}
        Tel: ${salonPhone || 'Telefoon niet opgegeven'}
        
        We kijken uit naar je bezoek!
        
        Met vriendelijke groet,
        Het team van ${salonName || 'Kapperszaak'}
      `
    };

    // Send email
    const info = await transporter.sendMail(mailOptions);
    
    console.log('Email sent successfully:', info.messageId);
    
    return res.status(200).json({ 
      success: true, 
      messageId: info.messageId,
      message: 'Email sent successfully' 
    });

  } catch (error) {
    console.error('Error sending email:', error);
    return res.status(500).json({ 
      error: 'Failed to send email',
      details: error.message 
    });
  }
}
