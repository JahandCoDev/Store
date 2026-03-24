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
  shopId?: string | null;
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
  useEffect(() => {
    initDatadogRumOnce(props);

    const shouldManageUser = props.userId !== undefined || props.userEmail !== undefined || props.userRole !== undefined;
    if (shouldManageUser) {
      if (props.userId || props.userEmail) {
        datadogRum.setUser({
          id: props.userId,
          email: props.userEmail ?? undefined,
          role: props.userRole ?? undefined,
        });
      } else {
        datadogRum.clearUser();
      }
    }

    if (props.shopId) {
      datadogRum.setGlobalContextProperty("shopId", props.shopId);
    }
  }, [props.env, props.service, props.shopId, props.userEmail, props.userId, props.userRole, props.version]);

  return null;
}
