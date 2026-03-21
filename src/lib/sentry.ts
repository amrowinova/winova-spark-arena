import * as Sentry from "@sentry/react";

export function initSentry() {
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  if (!dsn) return;

  Sentry.init({
    dsn,
    environment: import.meta.env.MODE,
    release: import.meta.env.VITE_APP_VERSION ?? "1.0.0",

    // التقاط 10% من sessions للأداء (مجاناً)
    tracesSampleRate: 0.1,

    // إخفاء بيانات المستخدم الحساسة
    beforeSend(event) {
      if (event.user) {
        delete event.user.email;
        delete event.user.ip_address;
      }
      return event;
    },

    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({
        // لا تسجيل نصوص/صور حساسة
        maskAllText: true,
        blockAllMedia: true,
      }),
    ],

    // تسجيل 1% من sessions للـ Replay (مجاناً)
    replaysSessionSampleRate: 0.01,
    // تسجيل 100% من sessions اللي فيها أخطاء
    replaysOnErrorSampleRate: 1.0,
  });
}

/** استخدمه في catch blocks لإرسال الخطأ لـ Sentry */
export function captureError(error: unknown, context?: Record<string, unknown>) {
  Sentry.captureException(error, { extra: context });
}
