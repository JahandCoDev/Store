// telephony/src/lib/pushNotifications.ts
// Web Push (VAPID) notification sender for incoming calls

import webpush from "web-push";
import { getPushSubscriptions, removePushSubscription } from "./state";

let _vapidConfigured = false;

function ensureVapid(): void {
  if (_vapidConfigured) return;
  const publicKey = process.env.VAPID_PUBLIC_KEY?.trim();
  const privateKey = process.env.VAPID_PRIVATE_KEY?.trim();
  const subject = process.env.VAPID_SUBJECT?.trim() || "mailto:admin@jahandco.dev";

  if (!publicKey || !privateKey) {
    console.warn("[push] VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY not set — push disabled");
    return;
  }

  webpush.setVapidDetails(subject, publicKey, privateKey);
  _vapidConfigured = true;
}

export interface PushPayload {
  title: string;
  body: string;
  tag?: string;
  data?: Record<string, unknown>;
}

export async function sendPushNotification(payload: PushPayload): Promise<void> {
  ensureVapid();
  if (!_vapidConfigured) return;

  const subscriptions = getPushSubscriptions();
  if (!subscriptions.length) return;

  const message = JSON.stringify(payload);

  await Promise.all(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          sub as Parameters<typeof webpush.sendNotification>[0],
          message
        );
      } catch (err: unknown) {
        const status = (err as { statusCode?: number }).statusCode;
        if (status === 410 || status === 404) {
          // Subscription expired — remove it
          removePushSubscription(sub.endpoint);
          console.log("[push] Removed expired subscription", { endpoint: sub.endpoint });
        } else {
          console.error("[push] Failed to send notification", { err });
        }
      }
    })
  );
}
