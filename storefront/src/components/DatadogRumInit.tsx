"use client";

import { useEffect } from "react";
import { datadogRum } from "@datadog/browser-rum";
import { reactPlugin } from "@datadog/browser-rum-react";

type DatadogRumInitProps = {
  service?: string;
  env?: string;
  version?: string;
  userId?: string;
  userEmail?: string | null;
  userRole?: string | null;
  store?: string | null;
};

declare global {
  var __ddRumInitialized: boolean | undefined;
}

function initDatadogRumOnce(props: DatadogRumInitProps) {
  if (typeof window === "undefined") return;
  if (globalThis.__ddRumInitialized) return;

  datadogRum.init({
    applicationId: "590b5676-5f3f-4843-a103-14bdff2e085a",
    clientToken: "pub15ed7f371dfe01dbb4fd18fb598b8dc8",
    site: "us5.datadoghq.com",
    service: props.service ?? "storefront",
    env: props.env ?? "development",
    version: props.version,
    sessionSampleRate: 100,
    sessionReplaySampleRate: 20,
    trackResources: true,
    trackUserInteractions: true,
    trackLongTasks: true,
    defaultPrivacyLevel: "mask-user-input",
    plugins: [reactPlugin({ router: false })],
  });

  globalThis.__ddRumInitialized = true;
}

export default function DatadogRumInit({
  service,
  env,
  version,
  userId,
  userEmail,
  userRole,
  store,
}: DatadogRumInitProps) {
  useEffect(() => {
    initDatadogRumOnce({ service, env, version, userId, userEmail, userRole, store });

    const shouldManageUser = userId !== undefined || userEmail !== undefined || userRole !== undefined;
    if (shouldManageUser) {
      if (userId || userEmail) {
        datadogRum.setUser({
          id: userId,
          email: userEmail ?? undefined,
          role: userRole ?? undefined,
        });
      } else {
        datadogRum.clearUser();
      }
    }

    if (store) {
      datadogRum.setGlobalContextProperty("store", store);
    }
  }, [env, service, store, userEmail, userId, userRole, version]);

  return null;
}
