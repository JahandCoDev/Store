
"use client";

import { useState, useEffect, useRef, type ComponentType } from 'react';
import { 
  Activity, Server, Terminal, Settings, Zap, Shield, 
  Cpu, Database, Network,
  Play, Square, RefreshCw, ChevronRight, Search, Bell, Menu
} from 'lucide-react';

type SidebarItemProps = {
  icon: ComponentType<{ className?: string }>;
  label: string;
  id: string;
  activeTab: string;
  onSelect: (id: string) => void;
};

function SidebarItem({ icon: Icon, label, id, activeTab, onSelect }: SidebarItemProps) {
  return (
    <button 
      onClick={() => onSelect(id)}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
        activeTab === id 
          ? 'bg-blue-600/10 text-blue-400 border border-blue-500/20' 
          : 'text-neutral-400 hover:bg-neutral-800/50 hover:text-neutral-200 border border-transparent'
      }`}
    >
      <Icon className="w-5 h-5" />
      <span className="font-medium text-sm">{label}</span>
      {activeTab === id && <ChevronRight className="w-4 h-4 ml-auto opacity-50" />}
    </button>
  );
}

export default function App() {
  const [logs, setLogs] = useState([
    "[SYSTEM] Initialize sequence started...",
    "[AUTH] Connecting to jahdev-identity: SUCCESS",
    "[VAULT] Fetching encrypted secrets from secure-vault...",
    "[VAULT] Secrets loaded. Database connected.",
    "[NODE-01] Status: HEALTHY. Latency: 24ms."
  ]);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const logsEndRef = useRef<HTMLDivElement | null>(null);

  // Simulated live metrics
  const [metrics, setMetrics] = useState({
    cpu: 42,
    ram: 68,
    network: 1.2,
    apiCalls: 12450,
  });

  // Simulated Server Nodes
  const [nodes, setNodes] = useState([
    { id: 'us-east-1a', name: 'api-gateway-prod', status: 'healthy', load: 45, type: 'Edge' },
    { id: 'us-east-1b', name: 'nitro-voice-engine', status: 'heavy', load: 88, type: 'GPU Node' },
    { id: 'eu-west-1a', name: 'oathbreakers-ws-1', status: 'healthy', load: 32, type: 'WebSockets' },
    { id: 'us-west-2a', name: 'secure-vault-db', status: 'healthy', load: 15, type: 'Database' },
  ]);

  // Simulate real-time data flow
  useEffect(() => {
    const interval = setInterval(() => {
      // Fluctuate metrics
      setMetrics(prev => ({
        cpu: Math.max(10, Math.min(95, prev.cpu + (Math.random() * 10 - 5))),
        ram: Math.max(20, Math.min(90, prev.ram + (Math.random() * 4 - 2))),
        network: Math.max(0.1, prev.network + (Math.random() * 0.4 - 0.2)),
        apiCalls: prev.apiCalls + Math.floor(Math.random() * 15),
      }));

      // Randomly update node loads
      setNodes(prev => prev.map(node => ({
        ...node,
        load: Math.max(5, Math.min(98, node.load + (Math.random() * 10 - 5))),
        status: node.load > 85 ? 'heavy' : node.load > 95 ? 'critical' : 'healthy'
      })));

      // Occasionally add a log
      if (Math.random() > 0.7) {
        const randomLogs = [
          "[NETWORK] Incoming traffic spike detected on api-gateway-prod.",
          "[AI-MODEL] Nitro-TTS processing request batch #992...",
          "[DB] Optimizing secure-vault queries...",
          "[SYS] Automated backup completed successfully.",
          "[OATHBREAKERS] 42 new players joined lobby."
        ];
        setLogs(prev => [...prev.slice(-15), randomLogs[Math.floor(Math.random() * randomLogs.length)]]);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  // Auto-scroll terminal
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  return (
    <div className="flex h-screen bg-[#050505] text-neutral-200 font-sans overflow-hidden selection:bg-blue-500/30">
      
      {/* Sidebar (Desktop) */}
      <aside className="hidden lg:flex flex-col w-72 bg-[#0a0a0a] border-r border-neutral-800/60 p-4">
        <div className="flex items-center gap-3 px-2 mb-8 mt-2">
          <div className="w-8 h-8 rounded bg-gradient-to-br from-blue-600 to-indigo-800 flex items-center justify-center border border-blue-500/30 shadow-[0_0_15px_rgba(37,99,235,0.2)]">
            <Activity className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-white tracking-wide">NEXUS CORE</h1>
            <p className="text-[10px] text-neutral-500 uppercase tracking-widest font-mono">By Jah Dev</p>
          </div>
        </div>

        <div className="flex-1 space-y-2">
          <div className="text-xs font-bold text-neutral-600 uppercase tracking-wider mb-4 px-2">Overview</div>
          <SidebarItem icon={Activity} label="Dashboard" id="dashboard" activeTab={activeTab} onSelect={setActiveTab} />
          <SidebarItem icon={Server} label="Infrastructure" id="infra" activeTab={activeTab} onSelect={setActiveTab} />
          <SidebarItem icon={Zap} label="AI Models" id="ai" activeTab={activeTab} onSelect={setActiveTab} />
          
          <div className="text-xs font-bold text-neutral-600 uppercase tracking-wider mb-4 mt-8 px-2">Operations</div>
          <SidebarItem icon={Terminal} label="Console Logs" id="logs" activeTab={activeTab} onSelect={setActiveTab} />
          <SidebarItem icon={Shield} label="Security Vault" id="security" activeTab={activeTab} onSelect={setActiveTab} />
          <SidebarItem icon={Database} label="Databases" id="db" activeTab={activeTab} onSelect={setActiveTab} />
        </div>

        <div className="mt-auto pt-4 border-t border-neutral-800/60">
          <SidebarItem icon={Settings} label="System Settings" id="settings" activeTab={activeTab} onSelect={setActiveTab} />
          <div className="mt-4 px-4 py-3 bg-neutral-900/50 rounded-xl border border-neutral-800/50 flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-neutral-800 flex items-center justify-center font-bold text-sm text-white">
              JD
            </div>
            <div>
              <div className="text-sm font-medium text-white">Jah Admin</div>
              <div className="text-xs text-green-400 flex items-center gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div> Online
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        
        {/* Top Header */}
        <header className="h-16 border-b border-neutral-800/60 bg-[#0a0a0a]/80 backdrop-blur-md flex items-center justify-between px-6 z-10">
          <div className="flex items-center gap-4">
            <button className="lg:hidden text-neutral-400 hover:text-white" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
              <Menu className="w-5 h-5" />
            </button>
            <div className="hidden sm:flex items-center gap-2 text-sm text-neutral-400 font-mono">
              <span>nexus</span>
              <ChevronRight className="w-3 h-3" />
              <span>us-east-1</span>
              <ChevronRight className="w-3 h-3" />
              <span className="text-blue-400">{activeTab}</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden md:flex relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
              <input 
                type="text" 
                placeholder="Search resources..." 
                className="bg-neutral-900 border border-neutral-800 text-sm rounded-full pl-9 pr-4 py-1.5 text-neutral-200 focus:outline-none focus:border-blue-500/50 w-64 transition-all"
              />
            </div>
            <button className="relative text-neutral-400 hover:text-white transition-colors">
              <Bell className="w-5 h-5" />
              <span className="absolute top-0 right-0 w-2 h-2 bg-rose-500 rounded-full border-2 border-[#0a0a0a]"></span>
            </button>
          </div>
        </header>

        {/* Dashboard Content */}
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
          <div className="max-w-7xl mx-auto space-y-6">
            
            {/* Page Title */}
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
              <div>
                <h2 className="text-2xl font-bold text-white tracking-tight mb-1">System Overview</h2>
                <p className="text-sm text-neutral-400">Monitoring 4 active nodes and 12,000+ API requests.</p>
              </div>
              <div className="flex gap-2">
                <button className="px-4 py-2 bg-neutral-900 border border-neutral-800 hover:bg-neutral-800 text-sm font-medium rounded-lg transition-colors flex items-center gap-2">
                  <RefreshCw className="w-4 h-4" /> Sync
                </button>
                <button className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition-colors shadow-[0_0_15px_rgba(37,99,235,0.2)]">
                  Deploy Update
                </button>
              </div>
            </div>

            {/* Top Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: "Cluster CPU Load", value: `${metrics.cpu.toFixed(1)}%`, icon: Cpu, color: "text-blue-400", bg: "bg-blue-400/10" },
                { label: "Memory Usage", value: `${metrics.ram.toFixed(1)}%`, icon: Database, color: "text-indigo-400", bg: "bg-indigo-400/10" },
                { label: "Network I/O", value: `${metrics.network.toFixed(2)} GB/s`, icon: Network, color: "text-emerald-400", bg: "bg-emerald-400/10" },
                { label: "API Requests/hr", value: metrics.apiCalls.toLocaleString(), icon: Zap, color: "text-amber-400", bg: "bg-amber-400/10" },
              ].map((stat, idx) => (
                <div key={idx} className="bg-[#0f0f0f] border border-neutral-800/60 p-5 rounded-2xl relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                    <stat.icon className="w-16 h-16" />
                  </div>
                  <div className={`w-10 h-10 rounded-xl ${stat.bg} ${stat.color} flex items-center justify-center mb-4 border border-white/5`}>
                    <stat.icon className="w-5 h-5" />
                  </div>
                  <div className="text-sm text-neutral-400 font-medium mb-1">{stat.label}</div>
                  <div className="text-2xl font-bold text-white tracking-tight">{stat.value}</div>
                </div>
              ))}
            </div>

            {/* Main Grid area */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
              
              {/* Server Nodes List (Takes up 2 columns on extra large screens) */}
              <div className="xl:col-span-2 bg-[#0f0f0f] border border-neutral-800/60 rounded-2xl p-6 flex flex-col">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="font-semibold text-white flex items-center gap-2">
                    <Server className="w-4 h-4 text-neutral-400" /> Active Infrastructure Nodes
                  </h3>
                  <button className="text-xs text-blue-400 hover:text-blue-300 font-medium">View All</button>
                </div>
                
                <div className="space-y-3 flex-1">
                  {nodes.map((node) => (
                    <div key={node.id} className="bg-neutral-900/50 border border-neutral-800 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-neutral-700 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className={`w-2 h-2 rounded-full ${node.status === 'healthy' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : node.status === 'heavy' ? 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]' : 'bg-rose-500 animate-pulse shadow-[0_0_8px_rgba(244,63,94,0.5)]'}`}></div>
                        <div>
                          <div className="font-medium text-white text-sm mb-0.5">{node.name}</div>
                          <div className="text-xs text-neutral-500 font-mono">{node.id} • {node.type}</div>
                        </div>
                      </div>
                      
                      <div className="flex-1 max-w-xs w-full">
                        <div className="flex justify-between text-xs mb-1.5">
                          <span className="text-neutral-400">Load</span>
                          <span className={node.load > 85 ? 'text-amber-400' : 'text-neutral-300'}>{node.load.toFixed(0)}%</span>
                        </div>
                        <div className="h-1.5 w-full bg-neutral-800 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full transition-all duration-500 ${node.load > 85 ? 'bg-amber-500' : 'bg-blue-500'}`}
                            style={{ width: `${node.load}%` }}
                          ></div>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <button className="p-2 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-lg transition-colors">
                          <Play className="w-4 h-4" />
                        </button>
                        <button className="p-2 text-neutral-400 hover:text-rose-400 hover:bg-neutral-800 rounded-lg transition-colors">
                          <Square className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Live Terminal / Logs */}
              <div className="bg-[#0a0a0a] border border-neutral-800/60 rounded-2xl flex flex-col shadow-inner overflow-hidden">
                <div className="bg-neutral-900 border-b border-neutral-800 px-4 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Terminal className="w-4 h-4 text-neutral-400" />
                    <span className="text-xs font-mono text-neutral-300">nexus-cli ~ /var/log</span>
                  </div>
                  <div className="flex gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-neutral-700"></div>
                    <div className="w-2.5 h-2.5 rounded-full bg-neutral-700"></div>
                    <div className="w-2.5 h-2.5 rounded-full bg-neutral-700"></div>
                  </div>
                </div>
                <div className="flex-1 p-4 font-mono text-xs overflow-y-auto custom-scrollbar leading-relaxed">
                  {logs.map((log, i) => (
                    <div key={i} className="mb-1">
                      <span className="text-neutral-500 mr-2">{new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                      <span className={
                        log.includes('SUCCESS') || log.includes('HEALTHY') ? 'text-emerald-400' :
                        log.includes('ERROR') || log.includes('critical') ? 'text-rose-400' :
                        log.includes('[SYSTEM]') || log.includes('[AUTH]') ? 'text-blue-400' :
                        'text-neutral-300'
                      }>{log}</span>
                    </div>
                  ))}
                  <div ref={logsEndRef} />
                  <div className="mt-2 flex items-center text-neutral-500">
                    <span className="text-blue-500 mr-2">➜</span> <span className="animate-pulse">_</span>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      </main>

      {/* Global styles for custom scrollbar embedded directly */}
      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(0, 0, 0, 0.2);
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.2);
        }
      `}} />
    </div>
  );
}