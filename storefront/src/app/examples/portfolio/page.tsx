"use client";

import React, { useState } from 'react';
import { 
  Menu, X, Check, Globe, Layout, Smartphone, PenTool, 
  ArrowRight, Code, Server, Database, Mail, Terminal
} from 'lucide-react';

export default function App() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);

  const scrollTo = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
      setIsMenuOpen(false);
    }
  };

  const services = [
    {
      icon: <Globe className="w-6 h-6 text-blue-400" />,
      title: "Websites",
      description: "Perfect for personal brands, small businesses, creators, and anyone who needs a clean online presence."
    },
    {
      icon: <PenTool className="w-6 h-6 text-green-400" />,
      title: "Blogs",
      description: "Easy‑to‑update blogs with categories, tags, SEO‑ready pages, and a simple editor."
    },
    {
      icon: <Layout className="w-6 h-6 text-purple-400" />,
      title: "Portfolios",
      description: "Showcase your work with a modern, scroll‑friendly layout that looks great on all devices."
    },
    {
      icon: <Terminal className="w-6 h-6 text-orange-400" />,
      title: "Custom Features",
      description: "Need something extra? I can build custom dashboards, login systems, or AI integrations."
    }
  ];

  const pricingTiers = [
    {
      name: "Starter Website",
      price: "$150",
      description: "For personal pages, simple landing pages, or a single‑section site.",
      features: [
        "1–2 sections",
        "Mobile‑friendly",
        "Contact button or link",
        "Basic styling",
        "Delivered in 2–3 days"
      ]
    },
    {
      name: "Portfolio / Blog",
      price: "$300",
      description: "For creators, students, freelancers, and professionals.",
      features: [
        "Up to 4 pages (Home, About, Work, Contact)",
        "Blog OR portfolio gallery",
        "Clean, modern design",
        "SEO‑ready",
        "1 revision"
      ]
    },
    {
      name: "Small Business",
      price: "$500",
      description: "For local businesses, services, and small brands.",
      features: [
        "Up to 6 pages",
        "Contact form & Services section",
        "Google Maps embed",
        "Basic branding",
        "2 revisions"
      ],
      highlight: true
    },
    {
      name: "Professional",
      price: "$900",
      description: "For businesses that want a polished, branded site.",
      features: [
        "Up to 10 pages",
        "Custom theme",
        "Blog + portfolio",
        "Light animations & CMS included",
        "Analytics setup"
      ]
    }
  ];

  const projects = [
    {
      title: "Oathbreakers",
      category: "Custom Web App / Game",
      description: "A full-scale multiplayer online social deduction game ecosystem including a landing page, community forums, and news blog.",
      tech: ["React", "Node.js", "WebSockets"],
      link: "play-oathbreakers.jahandco.dev"
    },
    {
      title: "Nitro & Voice Ops",
      category: "AI Integration",
      description: "A personal AI assistant built with a custom voice interface, focusing on advanced text-to-speech and voice cloning.",
      tech: ["Python", "OpenAI", "Custom TTS"],
      link: "Internal Tool"
    },
    {
      title: "AI Studio",
      category: "SaaS Platform",
      description: "A comprehensive AI-powered application featuring a custom-built frontend for seamless user interaction and prompt management.",
      tech: ["Next.js", "Tailwind", "API"],
      link: "Demo Available"
    },
    {
      title: "Infrastructure Tools",
      category: "DevOps & Backend",
      description: "A suite of production-ready tools including a robust secrets management service, a custom IDP, and streamlined deployment tools.",
      tech: ["Rust", "Go", "Docker"],
      link: "Open Source"
    }
  ];

  const skills = [
    "React", "Next.js", "Python", "Rust", "Go", "Flutter", 
    "PostgreSQL", "Prisma", "Docker", "Kubernetes", "Tailwind CSS", "Node.js"
  ];

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-neutral-300 font-sans selection:bg-blue-500/30">
      
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-[#0a0a0a]/80 backdrop-blur-md border-b border-neutral-800/50">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-neutral-100 text-[#0a0a0a] flex items-center justify-center text-sm">J</span>
            Jah Dev
          </div>
          
          {/* Desktop Nav */}
          <div className="hidden md:flex gap-8 text-sm font-medium">
            <button onClick={() => scrollTo('services')} className="hover:text-white transition-colors">Services</button>
            <button onClick={() => scrollTo('pricing')} className="hover:text-white transition-colors">Pricing</button>
            <button onClick={() => scrollTo('work')} className="hover:text-white transition-colors">Work</button>
            <button onClick={() => scrollTo('about')} className="hover:text-white transition-colors">About</button>
            <button onClick={() => scrollTo('contact')} className="text-white bg-neutral-800 hover:bg-neutral-700 px-4 py-2 rounded-full transition-colors">
              Get in touch
            </button>
          </div>

          {/* Mobile Menu Toggle */}
          <button className="md:hidden text-neutral-300" onClick={toggleMenu}>
            {isMenuOpen ? <X /> : <Menu />}
          </button>
        </div>

        {/* Mobile Nav */}
        {isMenuOpen && (
          <div className="md:hidden bg-[#0f0f0f] border-b border-neutral-800 px-6 py-4 flex flex-col gap-4">
            <button onClick={() => scrollTo('services')} className="text-left py-2 text-lg">Services</button>
            <button onClick={() => scrollTo('pricing')} className="text-left py-2 text-lg">Pricing</button>
            <button onClick={() => scrollTo('work')} className="text-left py-2 text-lg">Work</button>
            <button onClick={() => scrollTo('about')} className="text-left py-2 text-lg">About</button>
            <button onClick={() => scrollTo('contact')} className="text-left py-2 text-lg text-blue-400">Get in touch</button>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6 max-w-4xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-neutral-900 border border-neutral-800 text-sm mb-6">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
          Available for new projects
        </div>
        <h1 className="text-5xl md:text-7xl font-bold text-white tracking-tight mb-6 leading-tight">
          Build Your Website — <br className="hidden md:block"/>
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-neutral-100 to-neutral-500">Beautiful, Fast, & Affordable.</span>
        </h1>
        <p className="text-lg md:text-xl text-neutral-400 mb-10 max-w-2xl mx-auto leading-relaxed">
          Hi, I'm Jah. Get a clean, modern website for your brand, portfolio, or small business. No complicated jargon, no bloated pricing — just high‑quality work built with care.
        </p>
        <div className="flex flex-col sm:flex-row justify-center gap-4">
          <button onClick={() => scrollTo('contact')} className="bg-white text-black px-8 py-3 rounded-full font-medium hover:bg-neutral-200 transition-colors flex items-center justify-center gap-2">
            Get a Free Quote <ArrowRight className="w-4 h-4" />
          </button>
          <button onClick={() => scrollTo('pricing')} className="bg-neutral-900 border border-neutral-800 text-white px-8 py-3 rounded-full font-medium hover:bg-neutral-800 transition-colors">
            See Pricing
          </button>
        </div>
      </section>

      {/* What I Build Section */}
      <section id="services" className="py-24 px-6 bg-[#0f0f0f]">
        <div className="max-w-6xl mx-auto">
          <div className="mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">What I Can Build for You</h2>
            <p className="text-neutral-400 max-w-2xl text-lg">Every project starts with a quick conversation. Tell me what you need — a simple site, a blog, a portfolio, or something custom — and I’ll build it to fit your goals and budget.</p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {services.map((service, idx) => (
              <div key={idx} className="bg-[#141414] border border-neutral-800/60 p-6 rounded-2xl hover:border-neutral-700 transition-colors">
                <div className="bg-neutral-900/50 w-12 h-12 rounded-xl flex items-center justify-center mb-6 border border-neutral-800">
                  {service.icon}
                </div>
                <h3 className="text-xl font-semibold text-white mb-3">{service.title}</h3>
                <p className="text-neutral-400 leading-relaxed text-sm">{service.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Simple, Transparent Pricing</h2>
            <p className="text-neutral-400 max-w-2xl mx-auto text-lg">A pricing structure designed to be accessible, clear, and budget-friendly without compromising on quality.</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
            {pricingTiers.map((tier, idx) => (
              <div key={idx} className={`relative p-8 rounded-3xl border ${tier.highlight ? 'bg-[#141414] border-neutral-600 shadow-xl' : 'bg-[#0f0f0f] border-neutral-800'} flex flex-col`}>
                {tier.highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-neutral-100 text-black px-3 py-1 rounded-full text-xs font-bold tracking-wide uppercase">
                    Most Popular
                  </div>
                )}
                <h3 className="text-xl font-medium text-white mb-2">{tier.name}</h3>
                <div className="text-4xl font-bold text-white mb-4">{tier.price}</div>
                <p className="text-neutral-400 text-sm mb-6 pb-6 border-b border-neutral-800 min-h-[80px]">
                  {tier.description}
                </p>
                <ul className="space-y-4 mb-8 flex-grow">
                  {tier.features.map((feature, fIdx) => (
                    <li key={fIdx} className="flex items-start gap-3 text-sm text-neutral-300">
                      <Check className="w-5 h-5 text-neutral-500 shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <button onClick={() => scrollTo('contact')} className={`w-full py-3 rounded-xl font-medium transition-colors ${tier.highlight ? 'bg-white text-black hover:bg-neutral-200' : 'bg-neutral-900 text-white hover:bg-neutral-800 border border-neutral-800'}`}>
                  Get Started
                </button>
              </div>
            ))}
          </div>

          {/* Optional Add-ons */}
          <div className="max-w-3xl mx-auto bg-[#141414] border border-neutral-800 rounded-2xl p-8 flex flex-col md:flex-row gap-8 items-center justify-between">
            <div>
              <h3 className="text-xl font-semibold text-white mb-2">Optional Add-Ons</h3>
              <p className="text-neutral-400 text-sm">Need a little extra? Add these to any package.</p>
            </div>
            <ul className="text-sm space-y-2 text-neutral-300 w-full md:w-auto">
              <li className="flex justify-between gap-8"><span className="text-neutral-500">Hosting & Deployment</span> <span>$10/mo</span></li>
              <li className="flex justify-between gap-8"><span className="text-neutral-500">Custom Email Setup</span> <span>$25</span></li>
              <li className="flex justify-between gap-8"><span className="text-neutral-500">Logo / Branding</span> <span>$50–$150</span></li>
              <li className="flex justify-between gap-8"><span className="text-neutral-500">Extra Pages</span> <span>$40 each</span></li>
            </ul>
          </div>
        </div>
      </section>

      {/* Portfolio / Work Section */}
      <section id="work" className="py-24 px-6 bg-[#0f0f0f]">
        <div className="max-w-6xl mx-auto">
          <div className="mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Recent Work</h2>
            <p className="text-neutral-400 max-w-2xl text-lg">A glimpse into the custom applications, platforms, and infrastructure I’ve built.</p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {projects.map((project, idx) => (
              <div key={idx} className="group bg-[#141414] border border-neutral-800/80 rounded-2xl p-8 hover:border-neutral-600 transition-colors">
                <div className="text-xs font-semibold tracking-wide uppercase text-neutral-500 mb-3">{project.category}</div>
                <h3 className="text-2xl font-bold text-white mb-4 group-hover:text-blue-400 transition-colors">{project.title}</h3>
                <p className="text-neutral-400 mb-8 leading-relaxed">
                  {project.description}
                </p>
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex flex-wrap gap-2">
                    {project.tech.map((t, tIdx) => (
                      <span key={tIdx} className="bg-neutral-900 border border-neutral-800 text-xs px-3 py-1 rounded-full text-neutral-300">
                        {t}
                      </span>
                    ))}
                  </div>
                  <span className="text-sm text-neutral-500 font-medium">{project.link}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="py-24 px-6 border-b border-neutral-800/50">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-8">About Me</h2>
          <p className="text-lg text-neutral-400 leading-relaxed mb-12">
            I’m a developer and the founder of Jah and Co. with a passion for building things from the ground up. Whether it’s architecting backend infrastructure, crafting smooth frontend experiences, or developing my own variations of custom applications, I love tackling technical challenges. My focus is always on delivering scalable, maintainable, and highly customized digital solutions.
          </p>
          
          <h3 className="text-sm font-bold uppercase tracking-widest text-neutral-500 mb-6">My Toolkit</h3>
          <div className="flex flex-wrap justify-center gap-3">
            {skills.map((skill, idx) => (
              <span key={idx} className="bg-[#141414] border border-neutral-800 text-neutral-300 px-4 py-2 rounded-lg text-sm flex items-center gap-2">
                <Code className="w-4 h-4 text-neutral-500" /> {skill}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="py-24 px-6 bg-[#0a0a0a]">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Let’s build something great.</h2>
            <p className="text-neutral-400 text-lg">
              Have a project in mind, need some custom development work, or just want to chat about what’s possible? Tell me what you need, and I’ll provide a simple, clear quote — no pressure, no upselling.
            </p>
          </div>

          <form className="bg-[#141414] border border-neutral-800 p-8 rounded-2xl space-y-6" onSubmit={(e) => e.preventDefault()}>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-neutral-400">Name</label>
                <input type="text" className="w-full bg-[#0a0a0a] border border-neutral-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-neutral-500 transition-colors" placeholder="John Doe" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-neutral-400">Email</label>
                <input type="email" className="w-full bg-[#0a0a0a] border border-neutral-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-neutral-500 transition-colors" placeholder="john@example.com" />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-neutral-400">What kind of project are you looking to build?</label>
              <textarea rows={4} className="w-full bg-[#0a0a0a] border border-neutral-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-neutral-500 transition-colors resize-none" placeholder="I need a 4-page portfolio website..." />
            </div>
            <button className="w-full bg-white text-black font-medium py-3 rounded-xl hover:bg-neutral-200 transition-colors flex items-center justify-center gap-2">
              <Mail className="w-5 h-5" /> Send Message
            </button>
          </form>

          <div className="mt-12 text-center">
            <p className="text-neutral-500 mb-4">Or visit my main agency hub</p>
            <a href="https://jahandco.net/dev" target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-white hover:text-neutral-300 transition-colors font-medium border-b border-neutral-700 pb-1">
              jahandco.net/dev <ArrowRight className="w-4 h-4" />
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 text-center text-sm text-neutral-600 border-t border-neutral-800/50">
        <p>© {new Date().getFullYear()} Jah Dev. All rights reserved.</p>
      </footer>

    </div>
  );
}