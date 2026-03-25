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
};

declare global {
  var __ddRumInitialized: boolean | undefined;
}

function initDatadogRumOnce(props: DatadogRumInitProps) {
  if (typeof window === "undefined") return;
  if (globalThis.__ddRumInitialized) return;

  datadogRum.init({
    applicationId: "6dd975da-5517-4963-ab36-fe7fb34b2653",
    clientToken: "pubc347ec454c64d238e445f7203fc37781",
    site: "us5.datadoghq.com",
    service: props.service ?? "admin",
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

export default function DatadogRumInit(props: DatadogRumInitProps) {
  const { env, service, userEmail, userId, userRole, version } = props;

  useEffect(() => {
    initDatadogRumOnce({ env, service, userEmail, userId, userRole, version });

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

  }, [env, service, userEmail, userId, userRole, version]);

  return null;
}
