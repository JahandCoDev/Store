"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useSession, signOut } from "next-auth/react";
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
  LogOut,
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

// ─── Constants ────────────────────────────────────────────────────────────────

const VOICE_ROUTER_BASE_URL =
  (process.env.NEXT_PUBLIC_VOICE_ROUTER_URL ?? "").replace(/\/$/, "") || "";

// ─── Types ────────────────────────────────────────────────────────────────────

interface CallState {
  call_control_id: string;
  from: string;
  status: string;
  started_at: string;
  livekit_room?: string;
}

// ─── Audio renderer (excludes hold-music participants) ────────────────────────

function AdminAudioRenderer() {
  const tracks = useTracks(
    [Track.Source.Microphone, Track.Source.Unknown],
    { onlySubscribed: true }
  );
  return (
    <>
      {tracks.map((ref) => {
        if (ref.participant.identity.startsWith("system-hold")) return null;
        return <AudioTrack key={ref.publication.trackSid} trackRef={ref} />;
      })}
    </>
  );
}

// ─── Auto-stop hold when agent connects ──────────────────────────────────────

function StopHoldOnConnected({ callControlID }: { callControlID: string }) {
  const room = useRoomContext();
  const firedRef = useRef(false);

  useEffect(() => {
    if (!room || !callControlID) return;

    const stop = async () => {
      if (firedRef.current) return;
      firedRef.current = true;
      try {
        await fetch(`${VOICE_ROUTER_BASE_URL}/api/stop-hold?call_control_id=${encodeURIComponent(callControlID)}`);
      } catch { /* non-fatal */ }
    };

    room.on(RoomEvent.Connected, stop);
    if (room.state === ConnectionState.Connected) stop();

    return () => { room.off(RoomEvent.Connected, stop); };
  }, [room, callControlID]);

  return null;
}

// ─── Alert sound ─────────────────────────────────────────────────────────────

type AlertTone = "ring" | "tick";
const playAlert = async (type: AlertTone) => {
  try {
    const audio = new Audio("/alert.mp3");
    audio.preload = "auto";
    audio.volume = type === "ring" ? 0.8 : 0.35;
    audio.currentTime = 0;
    await audio.play();
  } catch (e) {
    console.warn("Alert sound blocked until user interaction", e);
  }
};

// ─── Web Push helper ──────────────────────────────────────────────────────────

async function registerPush(): Promise<boolean> {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) return false;

  const permission = await Notification.requestPermission();
  if (permission !== "granted") return false;

  try {
    const reg = await navigator.serviceWorker.register("/sw.js");
    await navigator.serviceWorker.ready;

    const { vapidPublicKey } = await fetch(`${VOICE_ROUTER_BASE_URL}/api/push/subscribe`).then((r) => r.json()) as { vapidPublicKey: string };
    if (!vapidPublicKey) return false;

    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey) as unknown as BufferSource,
    });

    await fetch(`${VOICE_ROUTER_BASE_URL}/api/push/subscribe`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(sub.toJSON()),
    });

    return true;
  } catch (err) {
    console.error("Failed to register push subscription", err);
    return false;
  }
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function VoicePanel() {
  const { data: session } = useSession();
  const agentName = (session?.user as { id?: string })?.id ?? "admin";

  const [activeTab, setActiveTab] = useState("queues");
  const [calls, setCalls] = useState<CallState[]>([]);
  const [activeCallList, setActiveCallList] = useState<CallState[]>([]);
  const [selectedCall, setSelectedCall] = useState<CallState | null>(null);
  const [livekitToken, setLivekitToken] = useState("");
  const [livekitUrl, setLivekitUrl] = useState("");
  const [onHold, setOnHold] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [transferNumber, setTransferNumber] = useState("");
  const [transferTargetCall, setTransferTargetCall] = useState<CallState | null>(null);

  const prevCallsLength = useRef(0);

  // ── Poll waiting calls ──────────────────────────────────────────────────────

  useEffect(() => {
    const fetchWaiting = async () => {
      try {
        const res = await fetch(`${VOICE_ROUTER_BASE_URL}/api/active-calls`);
        if (res.ok) {
          const data = (await res.json()) as CallState[];
          const newCalls = data ?? [];
          setCalls(newCalls);
          if (newCalls.length > prevCallsLength.current) {
            playAlert("ring");
          }
          prevCallsLength.current = newCalls.length;
        }
      } catch { /* ignore */ }
    };

    fetchWaiting();
    const interval = setInterval(fetchWaiting, 2500);
    return () => clearInterval(interval);
  }, []);

  // ── Periodic beep when calls are waiting ───────────────────────────────────

  useEffect(() => {
    if (calls.length === 0) return;
    const beepInterval = setInterval(() => playAlert("tick"), 10_000);
    return () => clearInterval(beepInterval);
  }, [calls.length]);

  // ── Check push state on mount ──────────────────────────────────────────────

  useEffect(() => {
    if ("serviceWorker" in navigator && "PushManager" in window) {
      navigator.serviceWorker.ready
        .then((reg) => reg.pushManager.getSubscription())
        .then((sub) => setPushEnabled(!!sub))
        .catch(() => { /* ignore */ });
    }
  }, []);

  // ── Handlers ───────────────────────────────────────────────────────────────

  const handleAnswer = useCallback(async (call: CallState) => {
    try {
      const res = await fetch(
        `${VOICE_ROUTER_BASE_URL}/api/answer?call_control_id=${encodeURIComponent(call.call_control_id)}&agent=${encodeURIComponent(agentName)}`
      );
      if (!res.ok) return;

      const data = (await res.json()) as { token?: string; url?: string; room?: string };
      if (!data?.token || !data?.url) return;

      setLivekitToken(data.token);
      setLivekitUrl(data.url);

      const selected: CallState = { ...call, livekit_room: data.room ?? call.livekit_room };
      setSelectedCall(selected);
      setActiveCallList((prev) =>
        prev.some((c) => c.call_control_id === call.call_control_id) ? prev : [...prev, selected]
      );
      setActiveTab("active");
    } catch (err) {
      console.error("Failed to answer call", err);
    }
  }, [agentName]);

  const endCallById = useCallback(async (callControlID: string) => {
    try {
      await fetch(`${VOICE_ROUTER_BASE_URL}/api/end-call`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ call_control_id: callControlID }),
      });
    } catch { /* ignore */ }

    setActiveCallList((prev) => prev.filter((c) => c.call_control_id !== callControlID));
    setSelectedCall((prev) => {
      if (prev?.call_control_id === callControlID) {
        setLivekitToken("");
        setLivekitUrl("");
        setOnHold(false);
        return null;
      }
      return prev;
    });
  }, []);

  const handleEndCall = useCallback(() => {
    if (selectedCall) endCallById(selectedCall.call_control_id);
  }, [selectedCall, endCallById]);

  const handleToggleHold = useCallback(async () => {
    if (!selectedCall) return;
    const newHold = !onHold;
    setOnHold(newHold);
    try {
      await fetch(`${VOICE_ROUTER_BASE_URL}/api/hold`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ call_control_id: selectedCall.call_control_id, hold: newHold }),
      });
    } catch { /* ignore */ }
  }, [selectedCall, onHold]);

  const handleTransferClick = useCallback(() => {
    if (selectedCall) {
      setTransferTargetCall(selectedCall);
      setTransferNumber("");
      setTransferModalOpen(true);
    }
  }, [selectedCall]);

  const executeTransfer = useCallback(async () => {
    if (!transferTargetCall) return;
    try {
      await fetch(`${VOICE_ROUTER_BASE_URL}/api/transfer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          call_control_id: transferTargetCall.call_control_id,
          extension: transferNumber,
        }),
      });
    } catch (err) {
      console.error("Network error during transfer:", err);
    } finally {
      setTransferModalOpen(false);
      handleEndCall();
    }
  }, [transferTargetCall, transferNumber, handleEndCall]);

  const handleTogglePush = useCallback(async () => {
    if (pushEnabled) {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await fetch(`${VOICE_ROUTER_BASE_URL}/api/push/subscribe`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "unsubscribe", endpoint: sub.endpoint }),
        });
        await sub.unsubscribe();
      }
      setPushEnabled(false);
    } else {
      const ok = await registerPush();
      setPushEnabled(ok);
    }
  }, [pushEnabled]);

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-black p-4">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-900 ring-1 ring-gray-800">
            <span className="text-xs font-bold text-gray-200">JC</span>
          </div>
          <span className="text-sm font-semibold text-gray-200">Voice Panel</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleTogglePush}
            title={pushEnabled ? "Disable push notifications" : "Enable push notifications"}
            className="flex items-center gap-1.5 rounded-md border border-gray-800 bg-gray-900/50 px-3 py-1.5 text-xs text-gray-300 hover:bg-gray-800 transition"
          >
            {pushEnabled ? <Bell size={14} className="text-green-400" /> : <BellOff size={14} />}
            {pushEnabled ? "Notifications on" : "Enable notifications"}
          </button>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="flex items-center gap-1.5 rounded-md border border-gray-800 bg-gray-900/50 px-3 py-1.5 text-xs text-gray-400 hover:bg-gray-800 transition"
          >
            <LogOut size={14} /> Sign out
          </button>
        </div>
      </div>

      {/* Alert / audio permissions banner */}
      <div className="mb-4 flex items-center justify-between rounded-lg border border-gray-800 bg-gray-900/40 p-3 text-sm text-gray-200">
        <span>Click anywhere or answer a call to enable audio permissions for ringtones.</span>
        <button
          onClick={() => playAlert("tick")}
          className="rounded bg-blue-900 px-3 py-1 text-white hover:bg-blue-800 text-xs"
        >
          Enable Alert Sounds
        </button>
      </div>

      {/* Main layout */}
      <div className="flex gap-6 h-[calc(100vh-13rem)]">
        {/* Call queue + active calls */}
        <div className="w-2/3 flex flex-col gap-6">
          <div className="bg-gray-800 border border-gray-700 rounded-lg flex-1 overflow-hidden flex flex-col shadow-sm">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700 bg-gray-800/50">
              <div className="flex space-x-6">
                <button
                  onClick={() => setActiveTab("queues")}
                  className={`font-semibold pb-1 border-b-2 transition ${activeTab === "queues" ? "text-white border-blue-600" : "text-gray-400 border-transparent hover:text-gray-200"}`}
                >
                  Waiting{" "}
                  <span className="ml-1 rounded-full bg-blue-900/30 px-2 py-0.5 text-xs text-gray-200">
                    {calls.length}
                  </span>
                </button>
                <button
                  onClick={() => setActiveTab("active")}
                  className={`font-semibold pb-1 border-b-2 transition ${activeTab === "active" ? "text-white border-blue-600" : "text-gray-400 border-transparent hover:text-gray-200"}`}
                >
                  Active{" "}
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
                        className="bg-gray-900 border border-gray-700 rounded-lg p-4 flex items-center justify-between hover:border-gray-600 transition"
                      >
                        <div className="flex items-center gap-4">
                          <div className="h-10 w-10 rounded-full bg-blue-900/60 flex items-center justify-center text-gray-200">
                            <Phone size={18} className="animate-pulse" />
                          </div>
                          <div>
                            <p className="text-white font-bold tracking-wide">{call.from}</p>
                            <p className="text-xs text-gray-400 mt-1 capitalize">
                              Status:{" "}
                              <span className="text-yellow-500">{call.status}</span> • Queue
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => handleAnswer(call)}
                          className="px-5 py-2.5 bg-green-600 hover:bg-green-500 text-white text-sm font-semibold rounded-md shadow-sm transition flex items-center gap-2"
                        >
                          <PhoneCall size={16} /> Answer
                        </button>
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
                        className={`bg-gray-900 border rounded-lg p-4 flex items-center justify-between cursor-pointer transition ${
                          selectedCall?.call_control_id === call.call_control_id
                            ? "border-green-500 ring-1 ring-green-500/50 bg-green-900/10"
                            : "border-gray-700 hover:border-gray-600"
                        }`}
                      >
                        <div className="flex items-center gap-4">
                          <div className="relative">
                            <div className="h-10 w-10 rounded-full bg-green-900/60 flex items-center justify-center text-green-400">
                              <PhoneCall size={18} />
                            </div>
                            <span className="absolute bottom-0 right-0 block h-3 w-3 rounded-full bg-green-500 ring-2 ring-gray-900" />
                          </div>
                          <div>
                            <p className="text-white font-bold tracking-wide">{call.from}</p>
                            <p className="text-xs text-green-400 mt-1">Active Room Connected</p>
                          </div>
                        </div>
                        <button
                          onClick={(e) => { e.stopPropagation(); endCallById(call.call_control_id); }}
                          className="px-4 py-2 bg-red-900/40 hover:bg-red-600 text-red-300 hover:text-white border border-red-800/50 hover:border-red-600 rounded transition flex items-center gap-2 text-sm font-medium"
                        >
                          <PhoneOff size={16} /> End
                        </button>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* WebRTC session panel */}
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
                    <span className="h-2 w-2 rounded-full bg-green-400 block animate-pulse" />
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
                className={`py-3.5 rounded-lg font-medium transition flex items-center justify-center gap-2 ${
                  onHold
                    ? "bg-yellow-600 hover:bg-yellow-500 text-white border-yellow-500"
                    : "bg-gray-700/50 hover:bg-gray-600 text-white disabled:text-gray-600 disabled:bg-gray-800 disabled:border-gray-800/50 border border-gray-600"
                }`}
              >
                <Pause size={18} /> {onHold ? "Resume Call" : "Hold Call"}
              </button>
              <button
                onClick={handleTransferClick}
                disabled={!selectedCall}
                className="bg-blue-900/30 hover:bg-blue-900 text-gray-200 hover:text-white disabled:text-gray-600 disabled:bg-gray-800 disabled:border-gray-800/50 py-3.5 rounded-lg font-medium border border-gray-800 transition flex items-center justify-center gap-2"
              >
                <PhoneForwarded size={18} /> Transfer
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Transfer modal */}
      {transferModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
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
                className="flex-1 bg-blue-900 hover:bg-blue-800 disabled:bg-gray-800 disabled:text-gray-500 disabled:border-transparent text-white py-3.5 rounded-xl transition font-semibold flex items-center justify-center gap-2 shadow-lg"
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
