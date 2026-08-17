const cron = require('node-cron');
const Schedule = require('../models/Schedule');
const ResearchHistory = require('../models/ResearchHistory');
const { sendDigestEmail } = require('./mailer');

async function executeResearchTask(schedule) {
  try {
    console.log(`[CRON] Executing scheduled digest: "${schedule.query}" for ${schedule.email}`);

    // Call FastAPI research streaming endpoint
    const response = await fetch(
      `http://localhost:8000/api/research/stream?query=${encodeURIComponent(schedule.query)}&depth=${encodeURIComponent(schedule.depth)}`
    );

    if (!response.ok) {
      throw new Error(`FastAPI responded with HTTP ${response.status}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let reportText = '';

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('data: ')) {
          try {
            const data = JSON.parse(trimmed.replace('data: ', ''));
            if (data.type === 'content' && (data.delta || data.content)) {
              reportText += (data.delta || data.content);
            } else if (data.type === 'final' && data.content) {
              reportText = data.content;
            }
          } catch (e) {
            // Ignore parse errors on incomplete chunks
          }
        }
      }
    }

    if (reportText) {
      // 1. Save execution output to user's history
      await ResearchHistory.create({
        userId: schedule.userId,
        query: schedule.query,
        report: reportText,
        depth: schedule.depth,
        citations: {}
      });

      // 2. Email the digest report
      await sendDigestEmail(schedule.email, schedule.query, reportText);

      // 3. Update execution timestamp
      schedule.lastRunAt = new Date();
      await schedule.save();

      console.log(`[CRON] Digest successfully sent to ${schedule.email}`);
    }
  } catch (err) {
    console.error(`[CRON] Error running scheduled job ${schedule._id}:`, err);
  }
}

function initCronRunner() {
  // Check every 5 minutes for jobs due to run
  cron.schedule('*/5 * * * *', async () => {
    try {
      const activeSchedules = await Schedule.find({ isActive: true });
      const now = new Date();

      for (const schedule of activeSchedules) {
        // Run if job was never run or hasn't run today
        const shouldRun = !schedule.lastRunAt || (now - new Date(schedule.lastRunAt)) > 23 * 60 * 60 * 1000;
        if (shouldRun) {
          await executeResearchTask(schedule);
        }
      }
    } catch (err) {
      console.error('[CRON] Error in cron scheduler worker:', err);
    }
  });

  console.log('[CRON] Scheduler service initialized.');
}

module.exports = { initCronRunner, executeResearchTask };