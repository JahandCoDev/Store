"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { 
  Monitor, PenTool, Image as ImageIcon, Store, Wand2, Smartphone,
  Server, Mail, Palette, FilePlus, Bot, ArrowRight,
  CheckCircle2, Sparkles, Code
} from "lucide-react";

import { devDemoExamples, getDevDemoHref } from "@/lib/dev/demoExamples";

const CREAM = "#f6eddd";
const OLIVE = "var(--color-surface-1)";
const SURFACE_2 = "var(--color-surface-2)";
const DARK_BG = "var(--color-background)";

const taglines = ["Website", "Portfolio", "Small Business Site", "Digital Dream"];

const services = [
  {
    icon: Monitor,
    title: "Websites",
    description: "Perfect for personal brands, small businesses, creators, and anyone who needs a clean online presence.",
    color: "from-blue-500 to-cyan-400",
  },
  {
    icon: PenTool,
    title: "Blogs",
    description: "Easy-to-update blogs with categories, tags, SEO-ready pages, and a simple editor.",
    color: "from-emerald-500 to-teal-400",
  },
  {
    icon: ImageIcon,
    title: "Portfolios",
    description: "Showcase your work with a modern, scroll-friendly layout that looks great on all devices.",
    color: "from-purple-500 to-indigo-400",
  },
  {
    icon: Store,
    title: "Small Business Sites",
    description: "Service pages, contact forms, booking links, and everything a local business needs.",
    color: "from-orange-500 to-amber-400",
  },
  {
    icon: Smartphone,
    title: "Apps",
    description: "Lightweight web apps, portals, booking tools, and dashboards when you need something more interactive than a standard site.",
    color: "from-cyan-500 to-blue-400",
  },
  {
    icon: Wand2,
    title: "Custom Features",
    description: "If you need something extra — a dashboard, login system, or AI features — I can build that too.",
    color: "from-pink-500 to-rose-400",
  },
];

const pricingTiers = [
  {
    name: "Starter Website",
    price: "$150",
    description: "For personal pages, simple landing pages, or a single-section site.",
    tint: "linear-gradient(180deg, rgba(96,165,250,0.16), rgba(255,255,255,0.04))",
    glow: "from-blue-400/90 via-cyan-400/50 to-transparent",
    features: [
      "1–2 sections",
      "Mobile-friendly",
      "Contact button",
      "Basic styling",
      "Delivered in 2–3 days",
    ],
  },
  {
    name: "Portfolio / Blog",
    price: "$300",
    description: "For creators, students, freelancers, and professionals.",
    tint: "linear-gradient(180deg, rgba(52,211,153,0.14), rgba(255,255,255,0.04))",
    glow: "from-emerald-400/90 via-teal-400/50 to-transparent",
    features: [
      "Up to 4 pages",
      "Blog OR gallery",
      "Clean, modern design",
      "SEO-ready",
      "1 revision",
    ],
  },
  {
    name: "Small Business",
    price: "$500",
    description: "For local businesses, services, and small brands.",
    tint: "linear-gradient(180deg, rgba(59,130,246,0.14), rgba(167,139,250,0.12), rgba(255,255,255,0.05))",
    glow: "from-violet-400/90 via-blue-400/55 to-transparent",
    features: [
      "Up to 6 pages",
      "Contact form",
      "Google Maps embed",
      "Basic branding",
      "2 revisions",
    ],
  },
  {
    name: "Professional",
    price: "$900",
    description: "For businesses that want a polished, branded site.",
    tint: "linear-gradient(180deg, rgba(167,139,250,0.16), rgba(255,255,255,0.04))",
    glow: "from-fuchsia-400/90 via-violet-400/50 to-transparent",
    features: [
      "Up to 10 pages",
      "Custom theme",
      "Blog + portfolio",
      "Light animations",
      "CMS included",
      "Analytics setup",
    ],
  },
];

const addOns = [
  { name: "Hosting & Deploy", price: "$10/mo", icon: Server },
  { name: "Custom Email", price: "$25", icon: Mail },
  { name: "Logo / Branding", price: "$50–$150", icon: Palette },
  { name: "Extra Pages", price: "$40 each", icon: FilePlus },
  { name: "AI Integration", price: "Custom", icon: Bot },
];

export default function DevStorefront({ store }: { store: string }) {
  const [taglineIndex, setTaglineIndex] = useState(0);
  const [isFading, setIsFading] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setIsFading(true);
      setTimeout(() => {
        setTaglineIndex((prev) => (prev + 1) % taglines.length);
        setIsFading(false);
      }, 400); // Wait for fade out
    }, 3500);
    return () => clearInterval(timer);
  }, []);

  const sectionHeadingStyle = "text-3xl sm:text-5xl font-extrabold mb-3 tracking-tight";
  const sectionSubStyle = "text-base sm:text-lg opacity-80 max-w-2xl leading-relaxed mb-10";
  const cardClassName = "glass-panel group relative rounded-3xl p-7 flex flex-col gap-3 overflow-hidden transition-all duration-500 hover:-translate-y-2 hover:shadow-2xl hover:shadow-white/10 hover:border-white/20";

  return (
    <div style={{ color: CREAM, background: DARK_BG, minHeight: "100vh" }} className="relative overflow-x-hidden selection:bg-white/30">
      
      {/* Decorative Background Blob */}
      <div className="absolute inset-0 overflow-hidden -z-10 pointer-events-none">
        <div className="absolute -top-[16%] -left-[10%] h-[26rem] w-[26rem] rounded-full bg-emerald-500/10 blur-[120px]" />
        <div className="absolute top-[12%] right-[-8%] h-[24rem] w-[24rem] rounded-full bg-blue-500/10 blur-[120px]" />
        <div className="absolute bottom-[8%] left-[24%] h-[22rem] w-[22rem] rounded-full bg-violet-500/10 blur-[120px]" />
      </div>

      {/* Hero */}
      <section className="px-4 sm:px-6 lg:px-8 py-20 sm:py-24 flex flex-col justify-center min-h-[74vh] relative z-10">
        <div className="mx-auto max-w-7xl w-full grid lg:grid-cols-2 gap-12 items-center">
          <div className="flex flex-col gap-6 animate-fade-in">
            <div className="glass-pill inline-flex w-fit items-center gap-2 rounded-full px-4 py-2 text-sm font-medium">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              Approachable & Affordable Web Dev
            </div>
            
            <h1 className="text-5xl sm:text-7xl lg:text-[80px] font-black leading-[1.1] tracking-tight">
              Build Your <br />
              <div className="h-[1.2em] relative overflow-hidden mt-2">
                <span 
                  className={`absolute inset-0 bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-cyan-400 transition-all duration-500 ${isFading ? 'opacity-0 translate-y-4' : 'opacity-100 translate-y-0'}`}
                >
                  {taglines[taglineIndex]}
                </span>
              </div>
            </h1>

            <p className="text-lg sm:text-xl opacity-80 max-w-lg leading-relaxed">
              Get a clean, modern website for your brand, portfolio, or small business. No complicated jargon, no bloated pricing.
            </p>

            <div className="mt-2 flex flex-col gap-3 sm:flex-row">
              <Link 
                href={`/${store}/quote`} 
                className="btn btn-primary group px-8 py-4 rounded-xl text-lg font-bold hover:scale-[1.02]"
              >
                Get a Free Quote
                <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
              </Link>
              <Link 
                href="#pricing" 
                className="glass-panel flex items-center justify-center px-8 py-4 rounded-xl font-bold text-lg transition-all hover:bg-white/10"
              >
                See Pricing
              </Link>
            </div>
          </div>

          {/* Hero Abstract UI Graphic */}
          <div className="relative hidden lg:block h-[500px] w-full animate-fade-in group">
            {/* Main Browser Window Mockup */}
            <div className="glass-panel absolute right-0 top-1/2 h-[400px] w-[90%] -translate-y-1/2 overflow-hidden rounded-2xl p-4 shadow-2xl transition-transform duration-700 group-hover:rotate-1">
              {/* Browser Dots */}
              <div className="flex gap-2 mb-6">
                <div className="w-3 h-3 rounded-full bg-red-400/80" />
                <div className="w-3 h-3 rounded-full bg-amber-400/80" />
                <div className="w-3 h-3 rounded-full bg-emerald-400/80" />
              </div>
              {/* Mock Content */}
              <div className="grid grid-cols-3 gap-4 h-full pb-8">
                <div className="col-span-2 space-y-4">
                  <div className="h-8 w-3/4 rounded bg-white/10" />
                  <div className="h-4 w-full rounded bg-white/5" />
                  <div className="h-4 w-5/6 rounded bg-white/5" />
                  <div className="h-32 w-full rounded-xl bg-gradient-to-tr from-emerald-500/20 to-cyan-500/20 border border-white/10 mt-8 flex items-center justify-center">
                    <Code className="w-10 h-10 text-emerald-300 opacity-50" />
                  </div>
                </div>
                <div className="col-span-1 space-y-4">
                  <div className="h-24 w-full rounded-xl bg-white/5" />
                  <div className="h-24 w-full rounded-xl bg-white/5" />
                </div>
              </div>
            </div>
            
            {/* Floating Elements */}
            <div className="glass-panel absolute left-[5%] top-[20%] flex items-center gap-3 rounded-2xl p-4 animate-bounce [animation-duration:4s]">
              <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
                <CheckCircle2 className="text-emerald-400 w-5 h-5" />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-bold">Fast Delivery</span>
                <span className="text-xs opacity-70">2-3 days</span>
              </div>
            </div>

            <div className="glass-panel absolute bottom-[20%] -left-[5%] flex items-center gap-3 rounded-2xl p-4 animate-bounce [animation-duration:5s] [animation-delay:1s]">
              <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                <Monitor className="text-blue-400 w-5 h-5" />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-bold">Responsive</span>
                <span className="text-xs opacity-70">Mobile ready</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Services */}
      <section className="px-4 sm:px-6 lg:px-8 py-24 rounded-t-[3rem] sm:rounded-t-[4rem] relative z-20 shadow-[0_-10px_40px_rgba(0,0,0,0.3)]" style={{ background: SURFACE_2 }}>
        <div className="mx-auto max-w-7xl">
          <h2 className={sectionHeadingStyle}>What I Create</h2>
          <p className={sectionSubStyle}>
            Every project starts with a quick conversation. Tell me what you need — a simple site, a blog, a portfolio, or something more custom — and I’ll build it to fit your goals and budget.
          </p>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {services.map((s) => (
              <div key={s.title} className={cardClassName}>
                <div className={`absolute inset-x-6 top-0 h-px bg-gradient-to-r ${s.color} opacity-90`} />
                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${s.color} p-[1px]`}>
                  <div className="w-full h-full bg-black/40 rounded-[15px] flex items-center justify-center backdrop-blur-sm">
                    <s.icon className="w-6 h-6 text-white" />
                  </div>
                </div>
                <h3 className="font-bold text-2xl mt-2">{s.title}</h3>
                <p className="opacity-80 leading-relaxed max-w-md">
                  {s.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="px-4 sm:px-6 lg:px-8 py-24 bg-black/20">
        <div className="mx-auto max-w-7xl">
          <div className="mb-12 flex flex-col items-center text-center">
            <h2 className={sectionHeadingStyle}>Simple, Transparent Pricing</h2>
            <p className="max-w-2xl text-base opacity-80 sm:text-lg">
              A straightforward pricing structure that attracts simpler clients while perfectly respecting my time and skill.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-4">
            {pricingTiers.map((tier) => (
              <div
                key={tier.name}
                className={cardClassName}
                style={{ 
                  background: tier.tint,
                  transform: tier.name.includes("Small Business") ? "scale(1.05)" : undefined,
                  zIndex: tier.name.includes("Small Business") ? 10 : 1
                }}
              >
                <div className={`absolute inset-x-6 top-0 h-px bg-gradient-to-r ${tier.glow}`} />
                {tier.name.includes("Small Business") && (
                  <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-amber-400 to-orange-500" />
                )}
                <div>
                  <h3 className="font-bold text-2xl">{tier.name}</h3>
                  <div className="text-4xl font-black mt-4 mb-2">{tier.price}</div>
                  <p className="text-sm opacity-80 h-10">{tier.description}</p>
                </div>
                <div className="w-full h-px bg-white/10 my-6" />
                <ul className="flex flex-col gap-4 flex-grow mb-8">
                  {tier.features.map((f, i) => (
                    <li key={i} className="flex items-start gap-3 text-sm opacity-90 font-medium">
                      <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-400" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  href={`/${store}/quote`}
                  className={`w-full py-4 text-center rounded-xl font-bold transition-all ${
                    tier.name.includes("Small Business") 
                    ? "bg-white text-black hover:bg-white/90" 
                    : "bg-white/10 hover:bg-white/20"
                  }`}
                >
                  Get Started
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Add-ons */}
      <section className="px-4 sm:px-6 lg:px-8 py-24" style={{ background: SURFACE_2 }}>
        <div className="mx-auto max-w-7xl">
          <div className="mb-10 flex flex-col justify-between gap-6 md:flex-row md:items-center">
            <div>
              <h2 className={sectionHeadingStyle}>Optional Add-Ons</h2>
              <p className="text-base opacity-80 sm:text-lg">Boost your site with a few useful extras.</p>
            </div>
            <Link href={`/${store}/services`} className="glass-pill rounded-full px-4 py-2 text-sm font-bold uppercase tracking-widest text-white/90">
              View All Services
            </Link>
          </div>
          
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
            {addOns.map((a) => (
              <div key={a.name} className="glass-panel relative flex flex-col items-center gap-4 rounded-2xl p-6 text-center transition-colors hover:bg-white/10">
                <div className="absolute inset-x-4 top-0 h-px bg-gradient-to-r from-cyan-400/80 via-violet-400/45 to-transparent" />
                <div className="w-12 h-12 rounded-full bg-black/30 flex items-center justify-center">
                  <a.icon className="w-6 h-6 opacity-80" />
                </div>
                <div>
                  <h3 className="font-bold text-sm mb-1">{a.name}</h3>
                  <span className="inline-block px-3 py-1 rounded-full bg-white/10 text-xs font-mono">{a.price}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Portfolio Examples */}
      <section className="px-4 sm:px-6 lg:px-8 py-24 relative overflow-hidden">
        <div className="absolute top-[20%] right-[-10%] w-[60%] h-[60%] rounded-full bg-purple-500/10 blur-[150px] pointer-events-none" />
        
        <div className="mx-auto max-w-7xl relative z-10">
          <h2 className={sectionHeadingStyle}>Recent Work</h2>
          <p className={sectionSubStyle}>
            Explore some examples of the kinds of sites I build. 
          </p>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {devDemoExamples.map((p) => (
              <Link 
                href={getDevDemoHref(p.slug)} 
                key={p.title} 
                className="glass-panel group relative flex flex-col justify-between rounded-3xl p-7 transition-all hover:border-white/30 hover:-translate-y-1"
              >
                <div className={`absolute inset-x-6 top-0 h-px bg-gradient-to-r ${p.panelClassName.replace('bg-gradient-to-br ', '')} opacity-90`} />
                <div>
                  <span className={`inline-block rounded-full border px-3 py-1 text-xs font-bold mb-5 ${p.accentClassName}`}>
                    {p.category}
                  </span>
                  <h3 className="font-bold text-2xl mb-3 flex items-center gap-2">
                    {p.title}
                    <ArrowRight className="w-5 h-5 opacity-0 -translate-x-4 transition-all group-hover:opacity-100 group-hover:translate-x-0" />
                  </h3>
                  <p className="opacity-80 leading-relaxed mb-6">{p.description}</p>
                </div>
                <div className={`w-full h-48 sm:h-64 rounded-xl border border-white/5 overflow-hidden relative bg-gradient-to-br ${p.panelClassName}`}>
                  {/* Subtle placeholder UI layout inside the card */}
                  <div className="absolute inset-x-4 top-4 h-6 rounded bg-white/10 flex items-center px-3 gap-2">
                    <div className="w-2 h-2 rounded-full bg-white/20" />
                    <div className="w-2 h-2 rounded-full bg-white/20" />
                  </div>
                  <div className="absolute left-4 top-14 bottom-4 w-1/3 rounded overflow-hidden flex flex-col gap-2">
                    <div className="w-full h-1/2 bg-white/5 rounded" />
                    <div className="w-full h-1/2 bg-white/5 rounded" />
                  </div>
                  <div className="absolute right-4 top-14 bottom-4 w-[60%] bg-white/5 rounded" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-4 sm:px-6 lg:px-8 py-24 text-center bg-black/30 border-t border-white/5">
        <div className="mx-auto flex max-w-3xl flex-col items-center gap-6">
          <div className="mb-3 h-20 w-20 rounded-full bg-gradient-to-br from-emerald-400 to-cyan-400 p-[1px]">
            <div className="w-full h-full bg-black rounded-full flex items-center justify-center">
              <Sparkles className="w-8 h-8 text-emerald-400" />
            </div>
          </div>
          <h2 className="text-5xl sm:text-6xl font-black tracking-tight leading-tight">
            Ready to get started?
          </h2>
          <p className="max-w-lg text-lg opacity-80 sm:text-xl">
            Tell me what you need and I’ll send you a simple, clear quote — no pressure, no upselling.
          </p>
          <div className="mt-3 flex flex-wrap items-center justify-center gap-3">
            <Link 
              href={`/${store}/quote`} 
              className="px-8 py-4 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-white font-bold text-lg transition-transform hover:scale-105 hover:shadow-xl hover:shadow-cyan-500/20"
            >
              Request a Quote
            </Link>
            <Link 
              href="#pricing" 
              className="px-8 py-4 rounded-xl border border-white/20 font-bold text-lg transition-colors hover:bg-white/10"
            >
              Review Pricing
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
