const WINDOW_MS = 15 * 60 * 1000;
const ALERT_THRESHOLD = 5;
const CLEANUP_AT = 1000;
const CLEANUP_AGE_MS = 30 * 60 * 1000;

interface FailureRecord {
  count: number;
  lastAt: number;
}

const loginFailures = new Map<string, FailureRecord>();

export function trackLoginFailure(ip: string, email: string) {
  const key = `${ip}:${email}`;
  const now = Date.now();
  const existing = loginFailures.get(key);

  const isStale = !existing || now - existing.lastAt > WINDOW_MS;
  const record: FailureRecord = isStale
    ? { count: 1, lastAt: now }
    : { count: existing.count + 1, lastAt: now };
  loginFailures.set(key, record);

  if (record.count === ALERT_THRESHOLD) {
    console.warn(
      `[SECURITY-ALERT] Multiple login failures: ip=${ip} email=${email} attempts=${record.count}`
    );
    // Hook for future channels: email/Slack webhook/etc.
  }

  if (loginFailures.size > CLEANUP_AT) {
    const cutoff = now - CLEANUP_AGE_MS;
    loginFailures.forEach((v, k) => {
      if (v.lastAt < cutoff) loginFailures.delete(k);
    });
  }
}
