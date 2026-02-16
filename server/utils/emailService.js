import nodemailer from 'nodemailer';

/**
 * Send credentials to a new moderator
 * @param {Object} moderator - The moderator object
 * @param {String} password - The raw password (before hashing)
 * @param {String} tenantName - The name of the organization
 */
export const sendModeratorCredentials = async (moderator, password, tenantName, origin) => {
    try {
        // Build the login link using the provided origin (or fallback to localhost)
        const domain = origin || process.env.DOMAIN || 'http://localhost:5173';
        const loginLink = `${domain}/moderator/login/${moderator.tenantSlug || ''}`;

        // Create transporter
        const transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST || 'smtp.gmail.com',
            port: parseInt(process.env.SMTP_PORT) || 587,
            secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS,
            },
        });

        const mailOptions = {
            from: `"${tenantName}" <${process.env.SMTP_USER}>`,
            to: moderator.email,
            subject: `Moderator Account Created - ${tenantName}`,
            html: `
                <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 0; background-color: #ffffff; color: #333333; border: 1px solid #eeeeee; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
                    <!-- Professional Header -->
                    <div style="background-color: #1a1a1a; padding: 30px; text-align: center;">
                        <h2 style="margin: 0; color: #ffffff; font-weight: 600; letter-spacing: 0.5px;">
                            ${tenantName}
                        </h2>
                    </div>

                    <div style="padding: 40px 30px;">
                        <h1 style="font-size: 22px; color: #1a1a1a; margin-top: 0; margin-bottom: 20px; font-weight: 700;">
                            Welcome to the Team, ${moderator.name}
                        </h1>
                        
                        <p style="font-size: 15px; color: #555555; margin-bottom: 30px; line-height: 1.6;">
                            You have been registered as a moderator for <strong>${tenantName}</strong>. Your account is now active, and you can access the moderator dashboard using the credentials provided below.
                        </p>
                        
                        <!-- Credentials Card -->
                        <div style="background-color: #f9f9f9; padding: 25px; border-radius: 6px; border: 1px solid #f0f0f0; margin-bottom: 35px;">
                            <table style="width: 100%; border-collapse: collapse;">
                                <tr>
                                    <td style="padding: 8px 0; color: #888888; font-size: 13px; width: 35%;">Email Address:</td>
                                    <td style="padding: 8px 0; font-weight: 600; color: #1a1a1a;">
                                        <a href="mailto:${moderator.email}" style="color: #1a1a1a; text-decoration: none;">${moderator.email}</a>
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding: 8px 0; color: #888888; font-size: 13px;">Temporary Password:</td>
                                    <td style="padding: 8px 0; font-weight: 600; color: #FF003C; font-size: 18px; font-family: 'Consolas', 'Monaco', monospace;">
                                        ${password}
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding: 8px 0; color: #888888; font-size: 13px;">Access Code:</td>
                                    <td style="padding: 8px 0; font-weight: 600; color: #333333; font-family: 'Consolas', 'Monaco', monospace;">
                                        ${moderator.accessCode}
                                    </td>
                                </tr>
                            </table>
                        </div>
                        
                        <!-- Action Button -->
                        <div style="text-align: center; margin-bottom: 35px;">
                            <a href="${loginLink}" style="display: inline-block; background-color: #FF003C; color: #ffffff; padding: 15px 35px; text-decoration: none; font-weight: 600; border-radius: 4px; font-size: 15px;">
                                Log In to Dashboard
                            </a>
                        </div>
                        
                        <div style="border-top: 1px solid #eeeeee; padding-top: 25px;">
                            <p style="font-size: 12px; color: #999999; text-align: center; margin: 0; line-height: 1.5;">
                                This is an automated message. Please do not reply to this email. <br/>
                                If you did not expect this invitation, please contact your administrator.
                            </p>
                        </div>
                    </div>
                </div>
            `,
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('✅ Email sent: %s', info.messageId);
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error('❌ Error sending credential email:', error);
        return { success: false, error: error.message };
    }
};
