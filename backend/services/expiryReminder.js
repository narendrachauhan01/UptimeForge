const User      = require('../models/User');
const { sendEmail } = require('./email');

const PLAN_LABEL = { free_trial:'Free Trial', bronze:'Bronze', silver:'Silver', gold:'Gold' };

async function sendExpiryReminders() {
    try {
        const now   = new Date();
        const in7   = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        const in7End = new Date(in7.getTime() + 24 * 60 * 60 * 1000);

        // Find users whose plan expires in exactly 7 days (today's window)
        const users = await User.find({
            $or: [
                { plan: 'free_trial', trialEndsAt: { $gte: in7, $lt: in7End } },
                { plan: { $ne: 'free_trial' }, planEndsAt: { $gte: in7, $lt: in7End } },
            ],
            isBlocked: false,
        });

        console.log(`[ExpiryReminder] Checking... Found ${users.length} users expiring in 7 days`);

        for (const user of users) {
            const plan     = PLAN_LABEL[user.plan] || user.plan;
            const endDate  = user.plan === 'free_trial' ? user.trialEndsAt : user.planEndsAt;
            const dateStr  = new Date(endDate).toLocaleDateString('en-IN', { day:'2-digit', month:'long', year:'numeric' });

            const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family:'Inter',Arial,sans-serif;background:#f1f5f9;margin:0;padding:40px 20px">
  <div style="max-width:520px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.08)">
    <div style="background:linear-gradient(135deg,#7c3aed,#6d28d9);padding:28px 32px;text-align:center">
      <div style="font-size:40px;margin-bottom:8px">⏰</div>
      <h1 style="color:#fff;margin:0;font-size:20px;font-weight:800">Plan Expiring Soon</h1>
    </div>
    <div style="padding:28px 32px">
      <p style="color:#374151;font-size:14px;line-height:1.7">Hi <strong>${user.name}</strong>,</p>
      <p style="color:#374151;font-size:14px;line-height:1.7">
        Your <strong>${plan}</strong> plan on UptimeForge is expiring on <strong>${dateStr}</strong> — that's just <strong>7 days away</strong>.
      </p>
      <div style="background:#FEF3C7;border:1px solid #FDE68A;border-radius:10px;padding:16px 20px;margin:20px 0">
        <div style="font-size:13px;color:#92400E;font-weight:600">⚠️ What happens when your plan expires?</div>
        <ul style="color:#78350F;font-size:13px;margin:8px 0 0;padding-left:18px;line-height:2">
          <li>Site monitoring will stop</li>
          <li>Alerts will not be sent</li>
          <li>Your data stays safe for 30 days</li>
        </ul>
      </div>
      <div style="text-align:center;margin:28px 0">
        <a href="https://servermonitor.narendrasingh.site/pay?plan=select"
           style="display:inline-block;padding:14px 32px;background:linear-gradient(135deg,#7c3aed,#6d28d9);color:#fff;border-radius:10px;font-weight:700;font-size:15px;text-decoration:none">
          🚀 Renew Your Plan
        </a>
      </div>
      <p style="color:#94a3b8;font-size:12px;text-align:center;margin:0">
        Questions? Reply to this email or contact support.
      </p>
    </div>
    <div style="padding:16px 32px;background:#f8fafc;text-align:center;color:#94a3b8;font-size:12px">
      © 2026 UptimeForge.in – <a href="https://servermonitor.narendrasingh.site/terms" style="color:#94a3b8;text-decoration:underline">Privacy Policy</a> | <a href="https://servermonitor.narendrasingh.site/terms" style="color:#94a3b8;text-decoration:underline">Terms &amp; Conditions</a>
    </div>
  </div>
</body>
</html>`;

            try {
                await sendEmail(user.email, `⏰ Your UptimeForge ${plan} plan expires in 7 days`, html);
                console.log(`[ExpiryReminder] Sent to ${user.email} (${plan} expires ${dateStr})`);
            } catch (e) {
                console.error(`[ExpiryReminder] Failed to send to ${user.email}: ${e.message}`);
            }
        }
    } catch (e) {
        console.error('[ExpiryReminder] Error:', e.message);
    }
}

function startExpiryReminder() {
    // Run once at startup
    sendExpiryReminders();
    // Then run daily at 9:00 AM
    const MS_PER_DAY = 24 * 60 * 60 * 1000;
    const now = new Date();
    const next9AM = new Date(now);
    next9AM.setHours(9, 0, 0, 0);
    if (next9AM <= now) next9AM.setDate(next9AM.getDate() + 1);
    const msUntil9AM = next9AM - now;

    setTimeout(() => {
        sendExpiryReminders();
        setInterval(sendExpiryReminders, MS_PER_DAY);
    }, msUntil9AM);

    console.log(`[ExpiryReminder] Scheduled daily at 9 AM (next run in ${Math.round(msUntil9AM/3600000)}h)`);
}

module.exports = { startExpiryReminder };
