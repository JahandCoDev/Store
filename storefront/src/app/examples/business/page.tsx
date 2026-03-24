"use client";

import React, { useState } from 'react';
import { 
  Menu, X, Phone, Mail, MapPin, Clock, 
  Leaf, Scissors, Droplets, Sun, ArrowRight, CheckCircle2
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
      icon: <Scissors className="w-8 h-8 text-emerald-600" />,
      title: "Lawn Maintenance",
      description: "Weekly or bi-weekly mowing, edging, and trimming to keep your yard looking pristine all season long."
    },
    {
      icon: <Leaf className="w-8 h-8 text-emerald-600" />,
      title: "Landscape Design",
      description: "Custom planting beds, mulching, and hardscaping to transform your outdoor living space."
    },
    {
      icon: <Droplets className="w-8 h-8 text-emerald-600" />,
      title: "Irrigation & Watering",
      description: "Sprinkler system installation, maintenance, and seasonal winterization to protect your investment."
    },
    {
      icon: <Sun className="w-8 h-8 text-emerald-600" />,
      title: "Seasonal Cleanup",
      description: "Thorough spring and fall cleanups, leaf removal, and storm debris clearing."
    }
  ];

  return (
    <div className="min-h-screen bg-stone-50 font-sans text-stone-900">
      
      {/* Top Bar (Contact Info) */}
      <div className="hidden md:flex bg-emerald-900 text-emerald-50 py-2 px-6 text-sm justify-between items-center">
        <div className="flex gap-6 max-w-6xl mx-auto w-full">
          <span className="flex items-center gap-2"><Phone className="w-4 h-4" /> (555) 123-4567</span>
          <span className="flex items-center gap-2"><Mail className="w-4 h-4" /> hello@greenleafexample.com</span>
          <span className="flex items-center gap-2 ml-auto"><Clock className="w-4 h-4" /> Mon-Fri: 8am - 6pm</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="sticky top-0 w-full z-50 bg-white/95 backdrop-blur-sm border-b border-stone-200 shadow-sm">
        <div className="max-w-6xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="text-2xl font-bold tracking-tight text-emerald-800 flex items-center gap-2 cursor-pointer" onClick={() => scrollTo('home')}>
            <Leaf className="w-8 h-8 text-emerald-600" />
            GreenLeaf
          </div>
          
          {/* Desktop Nav */}
          <div className="hidden md:flex gap-8 text-stone-600 font-medium items-center">
            <button onClick={() => scrollTo('home')} className="hover:text-emerald-700 transition-colors">Home</button>
            <button onClick={() => scrollTo('services')} className="hover:text-emerald-700 transition-colors">Services</button>
            <button onClick={() => scrollTo('about')} className="hover:text-emerald-700 transition-colors">About Us</button>
            <button onClick={() => scrollTo('contact')} className="bg-emerald-600 text-white px-6 py-2.5 rounded-lg hover:bg-emerald-700 transition-colors shadow-sm">
              Get a Free Quote
            </button>
          </div>

          {/* Mobile Menu Toggle */}
          <button className="md:hidden text-stone-600" onClick={toggleMenu}>
            {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Nav */}
        {isMenuOpen && (
          <div className="md:hidden bg-white border-b border-stone-200 px-6 py-4 flex flex-col gap-4 shadow-lg absolute w-full">
            <button onClick={() => scrollTo('home')} className="text-left py-2 text-lg font-medium text-stone-700">Home</button>
            <button onClick={() => scrollTo('services')} className="text-left py-2 text-lg font-medium text-stone-700">Services</button>
            <button onClick={() => scrollTo('about')} className="text-left py-2 text-lg font-medium text-stone-700">About Us</button>
            <button onClick={() => scrollTo('contact')} className="text-left py-2 text-lg font-medium text-emerald-600">Get a Free Quote</button>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <section id="home" className="relative pt-24 pb-32 px-6 overflow-hidden">
        <div className="absolute inset-0 z-0 bg-emerald-900/10 pattern-dots"></div>
        <div className="max-w-6xl mx-auto relative z-10 flex flex-col items-center text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-100 text-emerald-800 text-sm font-semibold mb-8">
            <Leaf className="w-4 h-4" /> Voted #1 Local Landscaper
          </div>
          <h1 className="text-5xl md:text-7xl font-extrabold text-stone-900 tracking-tight mb-6 max-w-4xl">
            Beautiful lawns, <br />
            <span className="text-emerald-600">zero hassle.</span>
          </h1>
          <p className="text-xl text-stone-600 mb-10 max-w-2xl leading-relaxed">
            Professional landscaping, lawn care, and hardscaping services for residential and commercial properties. We make your outdoor space a place you love.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
            <button onClick={() => scrollTo('contact')} className="bg-emerald-600 text-white px-8 py-4 rounded-xl font-bold text-lg hover:bg-emerald-700 transition-colors shadow-lg hover:shadow-xl flex items-center justify-center gap-2">
              Get Your Free Estimate <ArrowRight className="w-5 h-5" />
            </button>
            <button onClick={() => scrollTo('services')} className="bg-white text-stone-800 border border-stone-200 px-8 py-4 rounded-xl font-bold text-lg hover:bg-stone-50 transition-colors shadow-sm">
              View Our Services
            </button>
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section id="services" className="py-24 px-6 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold text-stone-900 mb-4">Our Services</h2>
            <p className="text-lg text-stone-600 max-w-2xl mx-auto">
              From routine maintenance to complete backyard transformations, our team of experts handles it all with precision and care.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {services.map((service, idx) => (
              <div key={idx} className="bg-stone-50 border border-stone-100 p-8 rounded-2xl hover:shadow-lg transition-all hover:-translate-y-1">
                <div className="bg-white w-16 h-16 rounded-2xl flex items-center justify-center mb-6 shadow-sm border border-stone-100">
                  {service.icon}
                </div>
                <h3 className="text-xl font-bold text-stone-900 mb-3">{service.title}</h3>
                <p className="text-stone-600 leading-relaxed">{service.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="py-24 px-6 bg-emerald-900 text-white">
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="text-3xl md:text-5xl font-bold mb-6">Local experts you can trust.</h2>
            <p className="text-emerald-100 text-lg mb-8 leading-relaxed">
              Founded in 2010, GreenLeaf Landscapes has been serving our local community with dedication and pride. We treat every yard as if it were our own, using eco-friendly practices and top-of-the-line equipment.
            </p>
            <ul className="space-y-4">
              {[
                "Fully Licensed & Insured",
                "Eco-Friendly Products Available",
                "100% Satisfaction Guarantee",
                "Transparent, Upfront Pricing"
              ].map((item, i) => (
                <li key={i} className="flex items-center gap-3 text-emerald-50 text-lg">
                  <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="bg-emerald-800 rounded-3xl p-8 border border-emerald-700 text-center flex flex-col justify-center items-center min-h-[400px]">
             {/* Placeholder for an image of the team or truck */}
             <Leaf className="w-24 h-24 text-emerald-600/50 mb-4" />
             <p className="text-emerald-200 font-medium">Image Placeholder: Team or Truck</p>
          </div>
        </div>
      </section>

      {/* Contact & Map Section */}
      <section id="contact" className="py-24 px-6 bg-stone-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold text-stone-900 mb-4">Ready for a better yard?</h2>
            <p className="text-lg text-stone-600 max-w-2xl mx-auto">
              Contact us today for a free, no-obligation quote. We'll get back to you within 24 hours.
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-12 bg-white rounded-3xl shadow-sm border border-stone-200 overflow-hidden">
            
            {/* Contact Form */}
            <div className="p-8 md:p-12">
              <h3 className="text-2xl font-bold text-stone-900 mb-6">Send us a message</h3>
              <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
                <div className="grid sm:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-stone-700">First Name</label>
                    <input type="text" className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all" placeholder="John" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-stone-700">Last Name</label>
                    <input type="text" className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all" placeholder="Smith" />
                  </div>
                </div>
                <div className="grid sm:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-stone-700">Email Address</label>
                    <input type="email" className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all" placeholder="john@example.com" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-stone-700">Phone Number</label>
                    <input type="tel" className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all" placeholder="(555) 123-4567" />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-stone-700">How can we help?</label>
                  <select className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all">
                    <option>Lawn Maintenance</option>
                    <option>Landscape Design</option>
                    <option>Cleanups</option>
                    <option>Other</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-stone-700">Message (Optional)</label>
                <textarea rows={3} className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all resize-none" placeholder="Tell us about your property..." />
                </div>
                <button className="w-full bg-emerald-600 text-white font-bold py-4 rounded-xl hover:bg-emerald-700 transition-colors shadow-md">
                  Request Free Quote
                </button>
              </form>
            </div>

            {/* Info & Map */}
            <div className="bg-stone-100 p-8 md:p-12 flex flex-col justify-between">
              <div>
                <h3 className="text-2xl font-bold text-stone-900 mb-8">Contact Information</h3>
                <div className="space-y-6">
                  <div className="flex items-start gap-4">
                    <div className="bg-white p-3 rounded-xl shadow-sm text-emerald-600">
                      <Phone className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="font-semibold text-stone-900">Call Us</p>
                      <p className="text-stone-600">(555) 123-4567</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="bg-white p-3 rounded-xl shadow-sm text-emerald-600">
                      <Mail className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="font-semibold text-stone-900">Email Us</p>
                      <p className="text-stone-600">hello@greenleafexample.com</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="bg-white p-3 rounded-xl shadow-sm text-emerald-600">
                      <MapPin className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="font-semibold text-stone-900">Service Area</p>
                      <p className="text-stone-600">123 Green Street<br/>Springfield, ST 12345</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Google Maps Embed Placeholder */}
              <div className="mt-8 rounded-2xl overflow-hidden border border-stone-200 h-64 bg-stone-200 relative">
                 {/* In a real project, replace this div with the iframe from Google Maps */}
                 <div className="absolute inset-0 flex flex-col items-center justify-center text-stone-500 text-sm p-6 text-center">
                    <MapPin className="w-10 h-10 mb-2 opacity-50" />
                    <span>Google Maps iframe goes here.<br/>(e.g., &lt;iframe src="https://www.google.com/maps/embed?pb=..."&gt;&lt;/iframe&gt;)</span>
                 </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-stone-900 text-stone-400 py-12 px-6">
        <div className="max-w-6xl mx-auto grid md:grid-cols-3 gap-8 mb-8 border-b border-stone-800 pb-8">
          <div>
            <div className="text-xl font-bold text-white flex items-center gap-2 mb-4">
              <Leaf className="w-6 h-6 text-emerald-500" />
              GreenLeaf
            </div>
            <p className="text-sm leading-relaxed max-w-xs">
              Professional landscaping and lawn care services dedicated to making your property look its absolute best.
            </p>
          </div>
          <div>
            <h4 className="text-white font-semibold mb-4">Quick Links</h4>
            <ul className="space-y-2 text-sm">
              <li><button onClick={() => scrollTo('home')} className="hover:text-white transition-colors">Home</button></li>
              <li><button onClick={() => scrollTo('services')} className="hover:text-white transition-colors">Services</button></li>
              <li><button onClick={() => scrollTo('about')} className="hover:text-white transition-colors">About Us</button></li>
              <li><button onClick={() => scrollTo('contact')} className="hover:text-white transition-colors">Get a Quote</button></li>
            </ul>
          </div>
          <div>
            <h4 className="text-white font-semibold mb-4">Business Hours</h4>
            <ul className="space-y-2 text-sm">
              <li className="flex justify-between"><span>Monday - Friday:</span> <span>8:00 AM - 6:00 PM</span></li>
              <li className="flex justify-between"><span>Saturday:</span> <span>9:00 AM - 2:00 PM</span></li>
              <li className="flex justify-between"><span>Sunday:</span> <span>Closed</span></li>
            </ul>
          </div>
        </div>
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center text-sm">
          <p>© {new Date().getFullYear()} GreenLeaf Landscapes. All rights reserved.</p>
          <p className="mt-4 md:mt-0">
            Designed by <a href="https://jahandco.net/dev" target="_blank" rel="noreferrer" className="text-emerald-500 hover:text-emerald-400 transition-colors">Jah Dev</a>
          </p>
        </div>
      </footer>

    </div>
  );
}