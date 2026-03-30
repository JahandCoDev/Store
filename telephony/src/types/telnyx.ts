// telephony/src/types/telnyx.ts
// Converted from telnyx_types.go

export interface TelnyxWebhook {
  data: {
    event_type: string;
    payload: CallPayload;
  };
}

export interface CallPayload {
  call_control_id: string;
  call_session_id: string;
  direction: string;
  from: string;
  to: string;
  digits?: string;
  digit?: string;
  recording_url?: string;
  hangup_cause?: string;
  transcription_data?: {
    confidence: number;
    is_final: boolean;
    transcript: string;
  };
}
