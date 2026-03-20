/** Shared add-on definitions used across the dev storefront and quote form. */
export const DEV_ADDONS = [
  {
    icon: "☁️",
    name: "Cloud Hosting & Deployment",
    price: "from $25/mo",
    description:
      "We deploy and host your site on Jah and Co Dev infrastructure — fast, reliable, and managed for you.",
  },
  {
    icon: "📡",
    name: "Uptime Monitoring",
    price: "from $10/mo",
    description:
      "24/7 monitoring with instant alerts if your site goes down. Peace of mind, always.",
  },
  {
    icon: "🔒",
    name: "Security Enhancements",
    price: "from $150 one-time",
    description:
      "SSL, firewall rules, rate limiting, vulnerability scans, and hardened server configs.",
  },
  {
    icon: "🤖",
    name: "AI Features",
    price: "custom",
    description:
      "Add AI chat, smart search, content generation, or recommendation engines to any existing project.",
  },
  {
    icon: "🛠️",
    name: "Maintenance Retainer",
    price: "from $150/mo",
    description:
      "Monthly retainer covering content updates, dependency upgrades, bug fixes, and up to 4 hours of development work.",
  },
] as const;

export type DevAddon = (typeof DEV_ADDONS)[number];
