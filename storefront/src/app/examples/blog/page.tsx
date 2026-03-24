"use client";

import React, { useState } from 'react';
import { 
  Menu, X, Search, Clock, ChevronRight, 
  Globe, MessageCircle, Mail, ArrowRight, Tag
} from 'lucide-react';

export default function App() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);

  // Mock data for blog posts
  const featuredPost = {
    id: 1,
    title: "The Architecture Behind Modern Web Applications",
    excerpt: "Exploring the shift from monolithic structures to microservices, and why your next project might need a different approach to scaling.",
    category: "Engineering",
    date: "March 20, 2026",
    readTime: "8 min read",
    author: "Jah Dev",
    gradient: "from-blue-600 to-indigo-900"
  };

  const recentPosts = [
    {
      id: 2,
      title: "Why I Started Building My Own Infrastructure Tools",
      excerpt: "Tired of vendor lock-in, I decided to build secure-vault and jahdev-identity. Here is what I learned along the way.",
      category: "DevOps",
      date: "March 15, 2026",
      readTime: "6 min read",
      gradient: "from-emerald-500 to-teal-800"
    },
    {
      id: 3,
      title: "A Deep Dive into Social Deduction Game Mechanics",
      excerpt: "Breaking down the psychology and system design behind Oathbreakers, and how to balance player trust with deception.",
      category: "Game Dev",
      date: "March 10, 2026",
      readTime: "12 min read",
      gradient: "from-purple-500 to-violet-900"
    },
    {
      id: 4,
      title: "Optimizing React Applications for Speed",
      excerpt: "Five practical tips for reducing bundle size and improving time-to-interactive in complex Next.js dashboards.",
      category: "Frontend",
      date: "March 5, 2026",
      readTime: "5 min read",
      gradient: "from-orange-500 to-red-800"
    },
    {
      id: 5,
      title: "The State of AI Assistants in 2026",
      excerpt: "How custom voice cloning and local LLMs are changing the way we interact with personal productivity tools.",
      category: "AI",
      date: "February 28, 2026",
      readTime: "7 min read",
      gradient: "from-slate-600 to-slate-900"
    }
  ];

  const categories = ["Engineering", "DevOps", "Game Dev", "Frontend", "AI", "Design", "Personal"];

  return (
    <div className="min-h-screen bg-[#fafafa] font-sans text-slate-900 selection:bg-indigo-200">
      
      {/* Navigation */}
      <nav className="sticky top-0 w-full z-50 bg-[#fafafa]/90 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-2 cursor-pointer">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white text-sm font-bold">J</div>
            Dev.Log
          </div>
          
          {/* Desktop Nav */}
          <div className="hidden md:flex gap-8 text-sm font-medium text-slate-600 items-center">
            <a href="#" className="hover:text-indigo-600 transition-colors">Articles</a>
            <a href="#" className="hover:text-indigo-600 transition-colors">Projects</a>
            <a href="#" className="hover:text-indigo-600 transition-colors">About</a>
            <div className="w-px h-4 bg-slate-300 mx-2"></div>
            <button className="hover:text-indigo-600 transition-colors"><Search className="w-4 h-4" /></button>
            <button className="bg-slate-900 text-white px-5 py-2 rounded-full hover:bg-indigo-600 transition-colors shadow-sm">
              Subscribe
            </button>
          </div>

          {/* Mobile Menu Toggle */}
          <button className="md:hidden text-slate-600" onClick={toggleMenu}>
            {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Nav */}
        {isMenuOpen && (
          <div className="md:hidden bg-white border-b border-slate-200 px-6 py-6 flex flex-col gap-4 absolute w-full shadow-xl">
            <a href="#" className="text-lg font-medium text-slate-800">Articles</a>
            <a href="#" className="text-lg font-medium text-slate-800">Projects</a>
            <a href="#" className="text-lg font-medium text-slate-800">About</a>
            <hr className="border-slate-100 my-2" />
            <button className="w-full bg-slate-900 text-white px-5 py-3 rounded-xl font-medium">
              Subscribe to Newsletter
            </button>
          </div>
        )}
      </nav>

      <main className="max-w-5xl mx-auto px-6 py-12">
        
        {/* Featured Post */}
        <div className="mb-16 group cursor-pointer">
          <div className={`w-full h-72 md:h-96 rounded-3xl mb-8 bg-gradient-to-br ${featuredPost.gradient} p-8 flex flex-col justify-end relative overflow-hidden shadow-lg transition-transform duration-300 group-hover:-translate-y-1`}>
            {/* Abstract decorative elements */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-20 -mt-20"></div>
            <div className="absolute bottom-0 left-0 w-40 h-40 bg-black/10 rounded-full blur-2xl"></div>
            
            <div className="relative z-10">
              <span className="inline-block px-3 py-1 bg-white/20 backdrop-blur-md text-white text-xs font-bold uppercase tracking-wider rounded-full mb-4">
                {featuredPost.category}
              </span>
            </div>
          </div>
          
          <div className="max-w-3xl">
            <div className="flex items-center gap-4 text-sm text-slate-500 mb-3 font-medium">
              <span>{featuredPost.date}</span>
              <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
              <span className="flex items-center gap-1"><Clock className="w-4 h-4" /> {featuredPost.readTime}</span>
            </div>
            <h1 className="text-3xl md:text-5xl font-extrabold text-slate-900 tracking-tight mb-4 group-hover:text-indigo-600 transition-colors leading-tight">
              {featuredPost.title}
            </h1>
            <p className="text-lg text-slate-600 leading-relaxed mb-4">
              {featuredPost.excerpt}
            </p>
            <div className="text-indigo-600 font-semibold flex items-center gap-1 group-hover:gap-2 transition-all">
              Read Article <ArrowRight className="w-4 h-4" />
            </div>
          </div>
        </div>

        {/* Main Content Layout */}
        <div className="flex flex-col lg:flex-row gap-16">
          
          {/* Article Feed (Left Column) */}
          <div className="lg:w-2/3">
            <h2 className="text-2xl font-bold text-slate-900 mb-8 pb-4 border-b border-slate-200">Latest Articles</h2>
            
            <div className="space-y-12">
              {recentPosts.map((post) => (
                <article key={post.id} className="group cursor-pointer flex flex-col sm:flex-row gap-6 items-start">
                  <div className={`w-full sm:w-48 h-48 sm:h-32 rounded-2xl shrink-0 bg-gradient-to-br ${post.gradient} shadow-sm group-hover:shadow-md transition-all`}></div>
                  <div>
                    <div className="flex items-center gap-3 text-xs text-slate-500 mb-2 font-medium uppercase tracking-wider">
                      <span className="text-indigo-600 font-bold">{post.category}</span>
                      <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                      <span>{post.date}</span>
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 mb-2 group-hover:text-indigo-600 transition-colors leading-snug">
                      {post.title}
                    </h3>
                    <p className="text-slate-600 line-clamp-2 leading-relaxed mb-2 text-sm">
                      {post.excerpt}
                    </p>
                    <div className="text-slate-400 text-xs flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {post.readTime}
                    </div>
                  </div>
                </article>
              ))}
            </div>

            <button className="w-full mt-12 py-4 rounded-xl border-2 border-slate-200 text-slate-600 font-semibold hover:border-slate-300 hover:text-slate-900 transition-colors flex items-center justify-center gap-2">
              Load More Articles <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Sidebar (Right Column) */}
          <aside className="lg:w-1/3 space-y-10">
            
            {/* About Author Widget */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <div className="w-16 h-16 bg-slate-900 rounded-full mb-4 flex items-center justify-center text-white font-bold text-xl shadow-md">
                J
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">Jah Dev</h3>
              <p className="text-slate-600 text-sm leading-relaxed mb-4">
                I'm a developer building custom applications, games like Oathbreakers, and robust backend infrastructure. I write about my process, tech stack, and lessons learned.
              </p>
              <div className="flex gap-3">
                <a href="#" className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 hover:bg-indigo-100 hover:text-indigo-600 transition-colors"><Globe className="w-4 h-4" /></a>
                <a href="#" className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 hover:bg-indigo-100 hover:text-indigo-600 transition-colors"><MessageCircle className="w-4 h-4" /></a>
              </div>
            </div>

            {/* Popular Topics Widget */}
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 mb-4 flex items-center gap-2">
                <Tag className="w-4 h-4 text-slate-400" /> Topics
              </h3>
              <div className="flex flex-wrap gap-2">
                {categories.map((category, idx) => (
                  <span key={idx} className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-600 hover:border-indigo-600 hover:text-indigo-600 cursor-pointer transition-colors shadow-sm">
                    {category}
                  </span>
                ))}
              </div>
            </div>

            {/* Newsletter Mini Widget */}
            <div className="bg-indigo-50 p-6 rounded-2xl border border-indigo-100">
              <h3 className="text-lg font-bold text-indigo-900 mb-2">Stay in the loop</h3>
              <p className="text-indigo-700 text-sm mb-4">Get my latest articles and project updates delivered right to your inbox.</p>
              <form className="flex flex-col gap-2" onSubmit={(e) => e.preventDefault()}>
                <input type="email" placeholder="Email address" className="w-full px-4 py-2.5 rounded-lg border border-indigo-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm" />
                <button className="w-full bg-indigo-600 text-white font-medium py-2.5 rounded-lg hover:bg-indigo-700 transition-colors text-sm">
                  Subscribe
                </button>
              </form>
            </div>

          </aside>
        </div>
      </main>

      {/* Newsletter Big Section */}
      <section className="bg-slate-900 text-white py-20 mt-12">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <Mail className="w-10 h-10 text-indigo-400 mx-auto mb-6" />
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Subscribe to the newsletter</h2>
          <p className="text-slate-400 mb-8 text-lg">
            Join over 2,000 developers receiving weekly insights on software architecture, React performance, and building indie projects. No spam, unsubscribe anytime.
          </p>
          <form className="flex flex-col sm:flex-row gap-3 max-w-lg mx-auto" onSubmit={(e) => e.preventDefault()}>
            <input type="email" placeholder="Enter your email address" className="flex-1 px-5 py-3 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-indigo-500 transition-colors" />
            <button className="px-8 py-3 bg-indigo-600 font-bold rounded-xl hover:bg-indigo-500 transition-colors shadow-lg">
              Subscribe
            </button>
          </form>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-950 py-12 px-6 text-slate-400 border-t border-slate-900">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
             <div className="w-6 h-6 bg-indigo-600 rounded flex items-center justify-center text-white text-xs font-bold">J</div>
             Dev.Log
          </div>
          <div className="flex gap-6 text-sm">
            <a href="#" className="hover:text-white transition-colors">Home</a>
            <a href="#" className="hover:text-white transition-colors">Articles</a>
            <a href="#" className="hover:text-white transition-colors">RSS Feed</a>
            <a href="#" className="hover:text-white transition-colors">Contact</a>
          </div>
          <p className="text-sm">
            © {new Date().getFullYear()} Jah Dev. Designed by <a href="https://jahandco.net/dev" target="_blank" rel="noreferrer" className="text-indigo-400 hover:text-indigo-300">Jah and Co</a>
          </p>
        </div>
      </footer>

    </div>
  );
}