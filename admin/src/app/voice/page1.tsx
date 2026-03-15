import { useState, useEffect, useRef } from "react";
import AdminShell from "@/components/AdminShell";
import { Phone, PhoneCall, PhoneForwarded, PhoneOff, Pause, Mic, Search, MoreVertical, X, Settings } from "lucide-react";
import { LiveKitRoom, RoomAudioRenderer, ControlBar } from "@livekit/components-react";
import "@livekit/components-styles";

interface CallState {
  call_control_id: string;
  from: string;
  status: string;
  started_at: string;
}

let audioCtx: AudioContext | null = null;
const playBeep = (type: "ring" | "tick") => {
  try {
    if (!audioCtx) {
       const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
       if (!AudioContextClass) return;
       audioCtx = new AudioContextClass();
    }
    if (audioCtx.state === "suspended") {
       audioCtx.resume();
    }

    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);

    if (type === "ring") {
      osc.frequency.setValueAtTime(880, audioCtx.currentTime);
      osc.frequency.setValueAtTime(1100, audioCtx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
      osc.start(audioCtx.currentTime);
      osc.stop(audioCtx.currentTime + 0.3);
    } else {
      osc.frequency.setValueAtTime(600, audioCtx.currentTime);
      gain.gain.setValueAtTime(0.02, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.1);
      osc.start(audioCtx.currentTime);
      osc.stop(audioCtx.currentTime + 0.1);
    }
  } catch (e) {
    console.warn("Audio play failed", e);
  }
};

