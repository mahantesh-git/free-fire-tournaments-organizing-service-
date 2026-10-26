import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config();

import { sendEmail } from '../utils/emailService.js';

const recipient = process.argv[2] || process.env.EMAIL_FROM;

if (!recipient) {
    console.error('❌ Please provide a recipient email address: node server/scripts/testBrevoEmail.js your-email@example.com');
    process.exit(1);
}

console.log('--- Testing Brevo HTTPS API Email Dispatch ---');
console.log('Sender Email (EMAIL_FROM):', process.env.EMAIL_FROM);
console.log('API Key configured:', process.env.BREVO_API_KEY ? 'Yes (starts with ' + process.env.BREVO_API_KEY.substring(0, 10) + '...)' : 'No');
console.log('Recipient:', recipient);

try {
    const result = await sendEmail({
        to: recipient,
        subject: 'Test Email - Brevo HTTPS API Integration',
        html: `
            <div style="font-family: sans-serif; padding: 20px; background: #f4f4f4;">
                <div style="max-width: 500px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px;">
                    <h2 style="color: #10b981;">✅ Brevo HTTPS API Connected Successfully!</h2>
                    <p>Your backend email service is now functioning over HTTPS without being blocked by cloud hosts (Render/Railway).</p>
                    <hr style="border: none; border-top: 1px solid #eee;" />
                    <p style="font-size: 12px; color: #888;">Timestamp: ${new Date().toISOString()}</p>
                </div>
            </div>
        `
    });

    if (result.success) {
        console.log('🎉 SUCCESS! Email dispatched with Message ID:', result.messageId);
        console.log('Check the inbox at:', recipient);
    } else {
        console.error('❌ FAILED to send email:', result.error);
    }
} catch (err) {
    console.error('❌ EXCEPTION caught during email test:', err.message);
}
