// src/lib/push.ts
import webpush from "web-push";
import { getConfig } from "./config";
import { getPushSubscriptions } from "./state";

let _initialized = false;

function initWebPush(): void {
  if (_initialized) return;
  const cfg = getConfig();
  if (cfg.vapidPublicKey && cfg.vapidPrivateKey) {
    webpush.setVapidDetails(cfg.vapidSubject, cfg.vapidPublicKey, cfg.vapidPrivateKey);
    _initialized = true;
  }
}

export async function sendCallNotification(from: string): Promise<void> {
  initWebPush();
  const subs = getPushSubscriptions();
  const payload = JSON.stringify({
    title: `Incoming Call`,
    body: `Call from ${from}`,
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    tag: "incoming-call",
    renotify: true,
    requireInteraction: true,
    actions: [{ action: "answer", title: "Open Panel" }],
  });

  await Promise.allSettled(
    subs.map(async (subJson) => {
      try {
        const sub = JSON.parse(subJson) as webpush.PushSubscription;
        await webpush.sendNotification(sub, payload);
      } catch (err) {
        console.warn("[push] failed to send to subscription:", err);
      }
    })
  );
}

export function getVapidPublicKey(): string {
  return getConfig().vapidPublicKey;
}
