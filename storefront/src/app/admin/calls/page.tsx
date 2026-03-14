"use client";

import { useEffect, useState } from "react";
import {
  LiveKitRoom,
  RoomAudioRenderer,
  TrackToggle,
  DisconnectButton,
  useRoomContext,
  useLocalParticipant
} from "@livekit/components-react";
import { Track } from "livekit-client";

interface CallState {
  call_control_id: string;
  from: string;
  status: string;
  started_at: string;
}

export default function AdminCallsPage() {
  const [calls, setCalls] = useState<CallState[]>([]);
  const [activeCall, setActiveCall] = useState<{ room: string; token: string; url: string } | null>(null);
  const [agentName, setAgentName] = useState("Support-1");

  // Poll for active waiting calls
  useEffect(() => {
    const fetchCalls = async () => {
      try {
        const res = await fetch("https://voice.jahandco.dev/api/active-calls");
        if (res.ok) {
          const data = await res.json();
          setCalls(data || []);
        }
      } catch (err) {
        console.error("Failed to fetch active calls", err);
      }
    };

    const int = setInterval(fetchCalls, 3000);
    fetchCalls();
    return () => clearInterval(int);
  }, []);

  const handleAccept = async (callId: string) => {
    try {
      const roomName = `call-${callId}`;
      const res = await fetch(`https://voice.jahandco.dev/api/join-room?room=${roomName}&agent=${agentName}`);
      if (res.ok) {
        const data = await res.json();
        setActiveCall({ room: roomName, token: data.token, url: data.url });
      } else {
        alert("Failed to get room token");
      }
    } catch (err) {
      console.error(err);
      alert("Error joining room");
    }
  };

  if (activeCall) {
    return (
      <div className="min-h-screen bg-neutral-900 text-white p-8 flex flex-col items-center justify-center">
        <h1 className="text-3xl font-bold mb-4">Live Call: {activeCall.room}</h1>
        <div className="bg-neutral-800 p-8 rounded-2xl shadow-2xl flex flex-col items-center gap-6 border border-neutral-700 w-full max-w-md">
          <LiveKitRoom
            serverUrl={activeCall.url}
            token={activeCall.token}
            connect={true}
            audio={true}
            video={false}
            onDisconnected={() => setActiveCall(null)}
          >
            <RoomAudioRenderer />
            <div className="flex flex-col items-center gap-4 w-full">
              <div className="p-4 bg-green-500/20 text-green-400 rounded-lg w-full text-center border border-green-500/30">
                Connected & Bridge Active
              </div>
              
              <div className="flex gap-4 mt-4 w-full justify-center">
                <TrackToggle 
                  source={Track.Source.Microphone} 
                  className="px-6 py-3 bg-neutral-700 hover:bg-neutral-600 rounded-lg font-medium transition-colors cursor-pointer"
                />
                <DisconnectButton 
                  className="px-6 py-3 bg-red-500 hover:bg-red-600 rounded-lg font-medium transition-colors cursor-pointer"
                >
                  End Call
                </DisconnectButton>
              </div>
            </div>
          </LiveKitRoom>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-900 text-white p-8">
      <div className="max-w-4xl mx-auto flex flex-col gap-6">
        <div className="flex justify-between items-end border-b border-neutral-800 pb-6">
          <div>
            <h1 className="text-4xl font-bold tracking-tight">Agent Dashboard</h1>
            <p className="text-neutral-400 mt-2">Manage incoming support calls</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-neutral-400">Agent ID:</span>
            <input 
              type="text" 
              value={agentName}
              onChange={(e) => setAgentName(e.target.value)}
              className="bg-neutral-800 border border-neutral-700 rounded-md px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="bg-neutral-800 rounded-xl overflow-hidden shadow-lg border border-neutral-700">
          <div className="p-4 border-b border-neutral-700 bg-neutral-800/50">
            <h2 className="font-semibold text-lg flex items-center gap-2">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
              </span>
              Holding Room Queue
            </h2>
          </div>
          
          <div className="divide-y divide-neutral-700">
            {calls.length === 0 ? (
              <div className="p-12 text-center text-neutral-500">
                No calls currently waiting.
              </div>
            ) : (
              calls.map((call) => (
                <div key={call.call_control_id} className="p-4 hover:bg-neutral-750 transition-colors flex items-center justify-between">
                  <div>
                    <div className="text-lg font-medium text-white">{call.from}</div>
                    <div className="text-sm text-neutral-400 flex items-center gap-2 mt-1">
                      <span className="inline-block px-2 py-0.5 bg-yellow-500/20 text-yellow-500 rounded text-xs">{call.status}</span>
                      <span>Wait time: {Math.floor((Date.now() - new Date(call.started_at).getTime()) / 1000)}s</span>
                    </div>
                  </div>
                  <button 
                    onClick={() => handleAccept(call.call_control_id)}
                    className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-lg font-medium transition-all hover:scale-105 active:scale-95 shadow-lg shadow-blue-900/20"
                  >
                    Accept Call
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
