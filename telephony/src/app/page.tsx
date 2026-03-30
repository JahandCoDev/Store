// src/app/page.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import {
  Phone,
  PhoneCall,
  PhoneForwarded,
  PhoneOff,
  Pause,
  Mic,
  X,
  Settings,
  Bell,
  BellOff,
} from "lucide-react";
import {
  LiveKitRoom,
  ControlBar,
  useTracks,
  AudioTrack,
  useRoomContext,
} from "@livekit/components-react";
import { ConnectionState, RoomEvent, Track } from "livekit-client";
import "@livekit/components-styles";

// Same origin — this app IS the voice router
const BASE = "";

// Custom audio renderer that ignores hold music playing from bot
function AdminAudioRenderer() {
  const tracks = useTracks([Track.Source.Microphone, Track.Source.Unknown], {
    onlySubscribed: true,
  });
  return (
    <>
      {tracks.map((ref) => {
        if (ref.participant.identity.startsWith("system-hold")) {
          return null;
        }
        return <AudioTrack key={ref.publication.trackSid} trackRef={ref} />;
      })}
    </>
  );
}

interface CallState {
  call_control_id: string;
  from: string;
  status: string;
  started_at: string;
  livekit_room?: string;
}

function StopHoldOnConnected({ callControlID }: { callControlID: string }) {
  const room = useRoomContext();
  const firedRef = useRef(false);

  useEffect(() => {
    if (!room || !callControlID) return;

    const stop = async () => {
      if (firedRef.current) return;
      firedRef.current = true;
      try {
        await fetch(`/api/stop-hold?call_control_id=${encodeURIComponent(callControlID)}`);
      } catch {
        // non-fatal
      }
    };

    room.on(RoomEvent.Connected, stop);
    if (room.state === ConnectionState.Connected) {
      stop();
    }

    return () => {
      room.off(RoomEvent.Connected, stop);
    };
  }, [room, callControlID]);

  return null;
}

type AlertTone = "ring" | "tick";

const playAlert = async (type: AlertTone) => {
  try {
    // Requires public/alert.mp3 — place a ringtone/alert audio file there.
    const audio = new Audio("/alert.mp3");
    audio.preload = "auto";
    audio.volume = type === "ring" ? 0.8 : 0.35;
    audio.currentTime = 0;
    await audio.play();
  } catch (e) {
    console.warn("Alert sound blocked until user interaction", e);
  }
};

async function registerPushSubscription(): Promise<boolean> {
  try {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return false;

    const reg = await navigator.serviceWorker.register("/sw.js");
    await navigator.serviceWorker.ready;

    const res = await fetch("/api/push/subscribe");
    const { publicKey } = (await res.json()) as { publicKey: string };
    if (!publicKey) return false;

    const existing = await reg.pushManager.getSubscription();
    if (existing) {
      await fetch("/api/push/subscribe", {
        method: "POST",
        body: JSON.stringify(existing),
      });
      return true;
    }

    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: publicKey,
    });
    await fetch("/api/push/subscribe", {
      method: "POST",
      body: JSON.stringify(sub),
    });
    return true;
  } catch (err) {
    console.warn("[push] registration failed:", err);
    return false;
  }
}

import { useSession } from "next-auth/react";

export default function VoicePanel() {
  const { data: session } = useSession();
  const agentId = (session?.user as { id?: string } | undefined)?.id ?? "admin";
  const [activeTab, setActiveTab] = useState("queues");
  const [calls, setCalls] = useState<CallState[]>([]);
  const [activeCallList, setActiveCallList] = useState<CallState[]>([]);
  const [selectedCall, setSelectedCall] = useState<CallState | null>(null);

  const [livekitToken, setLivekitToken] = useState("");
  const [livekitUrl, setLivekitUrl] = useState("");

  const prevCallsLength = useRef(0);

  // Push notification state
  const [notifPermission, setNotifPermission] = useState<NotificationPermission | "unsupported">(
    "unsupported"
  );
  const [pushEnabled, setPushEnabled] = useState(false);

  // Transfer Modal State
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [transferNumber, setTransferNumber] = useState("");
  const [transferTargetCall, setTransferTargetCall] = useState<CallState | null>(null);

  const [onHold, setOnHold] = useState(false);

  // Check notification permission on mount and register SW
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("Notification" in window)) {
      setNotifPermission("unsupported");
      return;
    }
    setNotifPermission(Notification.permission);

    if (Notification.permission === "granted") {
      registerPushSubscription().then((ok) => setPushEnabled(ok));
    }
  }, []);

  const handleEnableNotifications = async () => {
    if (!("Notification" in window)) return;
    const perm = await Notification.requestPermission();
    setNotifPermission(perm);
    if (perm === "granted") {
      const ok = await registerPushSubscription();
      setPushEnabled(ok);
    }
  };

  useEffect(() => {
    const fetchWaiting = async () => {
      try {
        const res = await fetch(`${BASE}/api/active-calls`);
        if (res.ok) {
          const data = (await res.json()) as CallState[];
          const newCalls = data || [];
          setCalls(newCalls);

          if (newCalls.length > prevCallsLength.current) {
            playAlert("ring");
          }
          prevCallsLength.current = newCalls.length;
        }
      } catch {}
    };
    fetchWaiting();
    const interval = setInterval(fetchWaiting, 2500);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (calls.length > 0) {
      const beepInterval = setInterval(() => {
        playAlert("tick");
      }, 10000);
      return () => clearInterval(beepInterval);
    }
  }, [calls.length]);

  const handleAnswer = async (call: CallState) => {
    try {
      const res = await fetch(
        `${BASE}/api/answer?call_control_id=${encodeURIComponent(call.call_control_id)}&agent=${encodeURIComponent(agentId)}`
      );
      if (!res.ok) return;

      const data = (await res.json()) as { token?: string; url?: string; room?: string };
      if (!data?.token || !data?.url) return;

      setLivekitToken(data.token);
      setLivekitUrl(data.url);

      const selected: CallState = { ...call, livekit_room: data.room || call.livekit_room };
      setSelectedCall(selected);

      if (!activeCallList.some((c) => c.call_control_id === call.call_control_id)) {
        setActiveCallList((prev) => [...prev, selected]);
      }
      setActiveTab("active");
    } catch (err) {
      console.error("Failed to answer call", err);
    }
  };

  const handleEndCall = async () => {
    if (!selectedCall) return;
    await endCallById(selectedCall.call_control_id);
  };

  const endCallById = async (callControlID: string) => {
    try {
      await fetch(`${BASE}/api/end-call`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ call_control_id: callControlID }),
      });
    } catch (err) {
      console.error(err);
    }

    setActiveCallList((prev) => prev.filter((c) => c.call_control_id !== callControlID));
    if (selectedCall?.call_control_id === callControlID) {
      setSelectedCall(null);
      setLivekitToken("");
      setLivekitUrl("");
      setOnHold(false);
    }
  };

  const handleToggleHold = async () => {
    if (selectedCall) {
      const newHoldState = !onHold;
      setOnHold(newHoldState);
      try {
        await fetch(`${BASE}/api/hold`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            call_control_id: selectedCall.call_control_id,
            hold: newHoldState,
          }),
        });
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleTransferClick = () => {
    if (selectedCall) {
      setTransferTargetCall(selectedCall);
      setTransferNumber("");
      setTransferModalOpen(true);
    }
  };

  const executeTransfer = async () => {
    if (!transferTargetCall) return;
    try {
      const res = await fetch(`${BASE}/api/transfer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          call_control_id: transferTargetCall.call_control_id,
          extension: transferNumber,
        }),
      });
      if (res.ok) {
        console.log(
          `Requested transfer for call ${transferTargetCall.call_control_id} to ${transferNumber}`
        );
      } else {
        console.error("Failed to transfer call on the backend.");
      }
    } catch (err) {
      console.error("Network error during transfer:", err);
    } finally {
      setTransferModalOpen(false);
      handleEndCall();
    }
  };

  return (
    <div>
      {/* Notification / audio enable banner */}
      <div className="mb-4 flex items-center justify-between rounded-lg border border-gray-800 bg-navy-900/40 p-3 text-sm text-gray-200">
        <span>Click anywhere or answer a call to enable audio permissions for ringtones.</span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => playAlert("tick")}
            className="rounded bg-navy-800 px-3 py-1 text-white hover:bg-navy-900"
          >
            Enable Alert Sounds
          </button>
          {notifPermission !== "unsupported" && (
            <button
              onClick={handleEnableNotifications}
              disabled={pushEnabled || notifPermission === "denied"}
              className="flex items-center gap-1 rounded bg-gray-800 px-3 py-1 text-white hover:bg-gray-700 disabled:opacity-50"
              title={
                notifPermission === "denied"
                  ? "Notifications blocked in browser settings"
                  : pushEnabled
                    ? "Notifications enabled"
                    : "Enable push notifications"
              }
            >
              {pushEnabled ? <Bell size={14} /> : <BellOff size={14} />}
              {pushEnabled ? "Notifications On" : "Enable Notifications"}
            </button>
          )}
        </div>
      </div>

      <div className="flex gap-6 h-[calc(100vh-14rem)]">
        <div className="w-2/3 flex flex-col gap-6">
          <div className="bg-gray-800 border border-gray-700 rounded-lg flex-1 overflow-hidden flex flex-col shadow-sm">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700 bg-gray-800/50">
              <div className="flex space-x-6">
                <button
                  onClick={() => setActiveTab("queues")}
                  className={`font-semibold pb-1 border-b-2 transition ${activeTab === "queues" ? "text-white border-navy-800" : "text-gray-400 border-transparent hover:text-gray-200"}`}
                >
                  Waiting Rooms{" "}
                  <span className="ml-1 rounded-full bg-navy-800/30 px-2 py-0.5 text-xs text-gray-200">
                    {calls.length}
                  </span>
                </button>
                <button
                  onClick={() => setActiveTab("active")}
                  className={`font-semibold pb-1 border-b-2 transition ${activeTab === "active" ? "text-white border-navy-800" : "text-gray-400 border-transparent hover:text-gray-200"}`}
                >
                  My Active Calls{" "}
                  <span className="ml-1 bg-green-600/20 text-green-400 py-0.5 px-2 rounded-full text-xs">
                    {activeCallList.length}
                  </span>
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {activeTab === "queues" ? (
                <div className="space-y-3">
                  {calls.length === 0 ? (
                    <div className="text-center text-gray-400 py-6 mt-8 flex flex-col items-center">
                      <Phone size={32} className="opacity-20 mb-3" />
                      No calls currently waiting.
                    </div>
                  ) : (
                    calls.map((call) => (
                      <div
                        key={call.call_control_id}
                        className="bg-gray-900 border border-gray-700 rounded-lg p-4 flex items-center justify-between hover:border-gray-600 transition animate-in fade-in slide-in-from-bottom-2"
                      >
                        <div className="flex items-center gap-4">
                          <div className="relative">
                            <div className="h-10 w-10 rounded-full bg-navy-800 flex items-center justify-center text-gray-200">
                              <Phone size={18} className="animate-pulse" />
                            </div>
                          </div>
                          <div>
                            <p className="text-white font-bold tracking-wide">{call.from}</p>
                            <p className="text-xs text-gray-400 mt-1 capitalize">
                              Status:{" "}
                              <span className="text-yellow-500">{call.status}</span> • Queue
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleAnswer(call)}
                            className="px-5 py-2.5 bg-green-600 hover:bg-green-500 text-white text-sm font-semibold rounded-md shadow-sm transition flex items-center gap-2"
                          >
                            <PhoneCall size={16} /> Answer
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {activeCallList.length === 0 ? (
                    <div className="text-center text-gray-400 py-6 mt-8 flex flex-col items-center">
                      <PhoneCall size={32} className="opacity-20 mb-3" />
                      No active calls.
                    </div>
                  ) : (
                    activeCallList.map((call) => (
                      <div
                        key={call.call_control_id}
                        onClick={() => setSelectedCall(call)}
                        className={`bg-gray-900 border rounded-lg p-4 flex items-center justify-between cursor-pointer transition ${selectedCall?.call_control_id === call.call_control_id ? "border-green-500 ring-1 ring-green-500/50 bg-green-900/10" : "border-gray-700 hover:border-gray-600"}`}
                      >
                        <div className="flex items-center gap-4">
                          <div className="relative">
                            <div className="h-10 w-10 rounded-full bg-green-900/60 flex items-center justify-center text-green-400">
                              <PhoneCall size={18} />
                            </div>
                            <span className="absolute bottom-0 right-0 block h-3 w-3 rounded-full bg-green-500 ring-2 ring-gray-900"></span>
                          </div>
                          <div>
                            <p className="text-white font-bold tracking-wide">{call.from}</p>
                            <p className="text-xs text-green-400 mt-1">Active Room Connected</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              endCallById(call.call_control_id);
                            }}
                            className="px-4 py-2 bg-red-900/40 hover:bg-red-600 text-red-300 hover:text-white border border-red-800/50 hover:border-red-600 rounded transition flex items-center gap-2 text-sm font-medium"
                          >
                            <PhoneOff size={16} /> End
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="w-1/3 flex flex-col gap-6">
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 flex-1 shadow-sm flex flex-col">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Settings size={18} className="text-gray-400" /> WebRTC Session
            </h3>

            {!selectedCall || !livekitToken ? (
              <div className="flex-1 border-2 border-dashed border-gray-700 rounded-lg flex items-center justify-center text-center p-6 bg-gray-900/30">
                <div>
                  <Mic size={48} className="mx-auto text-gray-600 mb-4" />
                  <p className="text-gray-400 font-medium">No Session Active</p>
                  <p className="text-sm text-gray-500 mt-2">
                    Connecting to a caller will
                    <br />
                    initialize WebRTC hooks.
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex-1 border border-gray-700 rounded-lg flex flex-col items-center justify-center text-center p-6 bg-gray-900 shadow-inner">
                <div className="mb-6">
                  <div className="h-16 w-16 rounded-full bg-green-500/20 text-green-400 flex items-center justify-center mx-auto mb-4 animate-pulse">
                    <Mic size={32} />
                  </div>
                  <p className="text-xl text-white font-bold">{selectedCall.from}</p>
                  <p className="text-green-400 text-sm mt-1 flex items-center justify-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-green-400 block animate-pulse"></span>{" "}
                    Calling Live
                  </p>
                </div>
                <div className="w-full bg-black/40 border border-black rounded-lg py-4 px-2 mt-auto">
                  <LiveKitRoom
                    token={livekitToken}
                    serverUrl={livekitUrl}
                    connect={true}
                    audio={true}
                    video={false}
                    onDisconnected={handleEndCall}
                  >
                    <StopHoldOnConnected callControlID={selectedCall.call_control_id} />
                    <AdminAudioRenderer />
                    <div className="flex flex-col items-center justify-center scale-90">
                      <ControlBar
                        controls={{
                          microphone: true,
                          camera: false,
                          screenShare: false,
                          chat: false,
                          leave: false,
                        }}
                      />
                    </div>
                  </LiveKitRoom>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 mt-4">
              <button
                onClick={handleToggleHold}
                disabled={!selectedCall}
                className={`py-3.5 rounded-lg font-medium transition flex items-center justify-center gap-2 ${onHold ? "bg-yellow-600 hover:bg-yellow-500 text-white border-yellow-500" : "bg-gray-700/50 hover:bg-gray-600 text-white disabled:text-gray-600 disabled:bg-gray-800 disabled:border-gray-800/50 border border-gray-600"}`}
              >
                <Pause size={18} /> {onHold ? "Resume Call" : "Hold Call"}
              </button>
              <button
                onClick={handleTransferClick}
                disabled={!selectedCall}
                className="bg-navy-900/30 hover:bg-navy-800 text-gray-200 hover:text-white disabled:text-gray-600 disabled:bg-gray-800 disabled:border-gray-800/50 py-3.5 rounded-lg font-medium border border-gray-800 transition flex items-center justify-center gap-2"
              >
                <PhoneForwarded size={18} /> Transfer
              </button>
            </div>
          </div>
        </div>
      </div>

      {transferModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-80 shadow-2xl relative">
            <button
              onClick={() => setTransferModalOpen(false)}
              className="absolute top-4 right-4 text-gray-500 hover:text-white transition"
            >
              <X size={20} />
            </button>
            <h3 className="text-xl font-bold text-white mb-6 text-center tracking-wide">
              Enter Extension
            </h3>

            <div className="bg-black/50 p-4 rounded-xl mb-6 text-center border border-gray-800 h-16 flex items-center justify-center shadow-inner">
              <span className="text-3xl text-white tracking-[0.2em] font-mono">
                {transferNumber || "..."}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-3 mb-6">
              {["1", "2", "3", "4", "5", "6", "7", "8", "9", "*", "0", "#"].map((key) => (
                <button
                  key={key}
                  onClick={() => setTransferNumber((prev) => prev + key)}
                  className="bg-gray-800 hover:bg-gray-700 active:bg-gray-600 text-white font-semibold py-4 rounded-xl border border-gray-700 transition text-xl shadow-sm"
                >
                  {key}
                </button>
              ))}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setTransferNumber((prev) => prev.slice(0, -1))}
                className="flex-1 bg-gray-800 hover:bg-gray-700 active:bg-gray-600 text-gray-300 py-3.5 rounded-xl border border-gray-700 transition font-medium"
              >
                Clear
              </button>
              <button
                onClick={executeTransfer}
                disabled={!transferNumber}
                className="flex-2 bg-navy-800 hover:bg-navy-900 disabled:bg-gray-800 disabled:text-gray-500 disabled:border-transparent text-white py-3.5 rounded-xl transition font-semibold flex items-center justify-center gap-2 shadow-lg"
              >
                <PhoneForwarded size={18} /> Transfer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
