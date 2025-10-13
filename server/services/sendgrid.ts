// SendGrid email service - Referenced from javascript_sendgrid integration
import { MailService } from '@sendgrid/mail';

const mailService = new MailService();

interface EmailParams {
  to: string;
  from: string;
  subject: string;
  text?: string;
  html?: string;
}

export async function sendEmail(params: EmailParams): Promise<{ success: boolean; error?: string }> {
  try {
    if (!process.env.SENDGRID_API_KEY) {
      const errorMsg = 'SENDGRID_API_KEY environment variable is not set';
      console.error(errorMsg);
      return { success: false, error: errorMsg };
    }

    mailService.setApiKey(process.env.SENDGRID_API_KEY);

    const mailData: any = {
      to: params.to,
      from: params.from,
      subject: params.subject,
    };

    if (params.text) {
      mailData.text = params.text;
    }

    if (params.html) {
      mailData.html = params.html;
    }

    await mailService.send(mailData);
    
    console.log(`Email sent successfully to ${params.to}`);
    return { success: true };
  } catch (error: any) {
    console.error('SendGrid email error:', error);
    
    // Extract meaningful error message from SendGrid response
    let errorMessage = 'Failed to send email';
    if (error.response?.body?.errors) {
      errorMessage = error.response.body.errors.map((e: any) => e.message).join(', ');
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    if (error.code === 403) {
      errorMessage = 'SendGrid authentication failed. Please check API key permissions and sender verification.';
    }
    
    return { success: false, error: errorMessage };
  }
}

export interface SurveyInvitationParams {
  recipientName: string;
  recipientEmail: string;
  surveyTitle: string;
  surveyUrl: string;
  creatorName?: string;
}

export async function sendSurveyInvitation(params: SurveyInvitationParams, fromEmail?: string): Promise<{ success: boolean; error?: string }> {
  const { recipientName, recipientEmail, surveyTitle, surveyUrl, creatorName } = params;
  
  const subject = `You're invited to participate in: ${surveyTitle}`;
  
  const textContent = `
Hello ${recipientName},

You've been invited to participate in a survey titled "${surveyTitle}"${creatorName ? ` by ${creatorName}` : ''}.

Please click the link below to take the survey:
${surveyUrl}

This is a personalized link for you. Please do not share it with others.

Thank you for your participation!

---
Sent from Poll Vault
  `.trim();

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Survey Invitation</title>
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: #f8f9fa; padding: 30px; border-radius: 8px; margin-bottom: 30px;">
            <h1 style="color: #2563eb; margin: 0 0 20px 0; font-size: 24px;">Survey Invitation</h1>
            <p style="font-size: 18px; margin: 0;">Hello <strong>${recipientName}</strong>,</p>
        </div>
        
        <div style="background: white; padding: 30px; border: 1px solid #e5e7eb; border-radius: 8px; margin-bottom: 30px;">
            <p style="margin: 0 0 20px 0;">You've been invited to participate in a survey titled:</p>
            <h2 style="color: #1f2937; margin: 0 0 20px 0; font-size: 20px;">"${surveyTitle}"</h2>
            ${creatorName ? `<p style="margin: 0 0 20px 0; color: #6b7280;">Created by <strong>${creatorName}</strong></p>` : ''}
            
            <div style="text-align: center; margin: 30px 0;">
                <a href="${surveyUrl}" 
                   style="display: inline-block; background: #2563eb; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
                    Take Survey
                </a>
            </div>
            
            <div style="background: #fef3c7; border: 1px solid #f59e0b; border-radius: 6px; padding: 15px; margin: 20px 0;">
                <p style="margin: 0; color: #92400e; font-size: 14px;">
                    <strong>Important:</strong> This is a personalized link for you. Please do not share it with others.
                </p>
            </div>
            
            <p style="margin: 20px 0 0 0; color: #6b7280;">Thank you for your participation!</p>
        </div>
        
        <div style="text-align: center; color: #9ca3af; font-size: 12px; margin-top: 40px;">
            <p style="margin: 0;">Sent from <strong>Poll Vault</strong></p>
            <p style="margin: 5px 0 0 0;">Professional survey and polling platform</p>
        </div>
    </body>
    </html>
  `;

  // Use provided fromEmail or fallback to environment variable or default
  const senderEmail = fromEmail || process.env.SENDGRID_FROM_EMAIL;

  if (!senderEmail) {
    return { success: false, error: 'Sender email not configured. Please set SENDGRID_FROM_EMAIL environment variable.' };
  }

  return await sendEmail({
    to: recipientEmail,
    from: senderEmail,
    subject,
    text: textContent,
    html: htmlContent,
  });
}