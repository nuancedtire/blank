import { useState, useRef, useCallback, useEffect } from "react";

export type RealtimeStatus = "idle" | "connecting" | "connected" | "disconnected" | "error";

export interface TranscriptTurn {
  speaker: "ai" | "user";
  text: string;
  timestamp: number;
}

interface UseRealtimeSessionOptions {
  mode: "interpreter" | "companion";
  tokenEndpoint: string;
  sessionId: string;
  convexUrl: string;
  onToolCall?: (name: string, args: Record<string, unknown>, callId: string) => Promise<unknown>;
  onStatusChange?: (status: RealtimeStatus) => void;
  onError?: (error: string) => void;
}

export function useRealtimeSession(options: UseRealtimeSessionOptions) {
  const [status, setStatus] = useState<RealtimeStatus>("idle");
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcriptTurns, setTranscriptTurns] = useState<TranscriptTurn[]>([]);
  const [currentAiText, setCurrentAiText] = useState("");

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const dcRef = useRef<RTCDataChannel | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const sendToolResult = useCallback((callId: string, result: unknown) => {
    const dc = dcRef.current;
    if (!dc || dc.readyState !== "open") return;

    dc.send(JSON.stringify({
      type: "conversation.item.create",
      item: {
        type: "function_call_output",
        call_id: callId,
        output: JSON.stringify(result),
      },
    }));

    dc.send(JSON.stringify({ type: "response.create" }));
  }, []);

  const handleServerEvent = useCallback((event: Record<string, unknown>) => {
    switch (event.type) {
      case "response.audio_transcript.delta":
        setCurrentAiText((prev) => prev + ((event.delta as string) || ""));
        setIsSpeaking(true);
        break;

      case "response.audio_transcript.done":
        setTranscriptTurns((prev) => [
          ...prev,
          { speaker: "ai", text: (event.transcript as string) || "", timestamp: Date.now() },
        ]);
        setCurrentAiText("");
        setIsSpeaking(false);
        break;

      case "conversation.item.input_audio_transcription.completed":
        if (event.transcript) {
          setTranscriptTurns((prev) => [
            ...prev,
            { speaker: "user", text: event.transcript as string, timestamp: Date.now() },
          ]);
        }
        break;

      case "response.function_call_arguments.done":
        if (options.onToolCall && event.name && event.call_id) {
          const args = JSON.parse((event.arguments as string) || "{}");
          options.onToolCall(event.name as string, args, event.call_id as string).then((result) => {
            sendToolResult(event.call_id as string, result);
          });
        }
        break;

      case "response.done":
        setIsSpeaking(false);
        break;
    }
  }, [options.onToolCall, sendToolResult]);

  const connect = useCallback(async () => {
    setStatus("connecting");
    try {
      // 1. Get ephemeral key from Convex HTTP action
      const siteUrl = options.convexUrl.replace(".cloud", ".site");
      const resp = await fetch(`${siteUrl}${options.tokenEndpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: options.sessionId }),
      });
      if (!resp.ok) throw new Error(`Token fetch failed: ${resp.status}`);
      const { ephemeralKey, model } = (await resp.json()) as {
        ephemeralKey: string;
        model: string;
      };

      // 2. Create peer connection
      const pc = new RTCPeerConnection();
      pcRef.current = pc;

      // 3. Set up audio output
      const audio = new Audio();
      audio.autoplay = true;
      audioRef.current = audio;
      pc.ontrack = (e) => {
        audio.srcObject = e.streams[0];
      };

      // 4. Get microphone access and add track
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      // 5. Create data channel for events
      const dc = pc.createDataChannel("oai-events");
      dcRef.current = dc;

      dc.onopen = () => {
        setStatus("connected");
        options.onStatusChange?.("connected");
      };

      dc.onmessage = (event) => {
        const data = JSON.parse(event.data);
        handleServerEvent(data);
      };

      dc.onclose = () => {
        setStatus("disconnected");
        options.onStatusChange?.("disconnected");
      };

      // 6. Create SDP offer
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      // 7. Send offer to OpenAI Realtime
      const sdpResp = await fetch(
        `https://api.openai.com/v1/realtime?model=${model || "gpt-4o-realtime-preview-2024-12-17"}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${ephemeralKey}`,
            "Content-Type": "application/sdp",
          },
          body: offer.sdp,
        },
      );
      if (!sdpResp.ok) throw new Error(`SDP exchange failed: ${sdpResp.status}`);

      const answerSdp = await sdpResp.text();
      await pc.setRemoteDescription({ type: "answer", sdp: answerSdp });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Connection failed";
      setStatus("error");
      options.onError?.(msg);
    }
  }, [options.convexUrl, options.tokenEndpoint, options.sessionId, options.onStatusChange, options.onError, handleServerEvent]);

  const disconnect = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    pcRef.current?.close();
    audioRef.current?.pause();
    streamRef.current = null;
    pcRef.current = null;
    dcRef.current = null;
    audioRef.current = null;
    setStatus("disconnected");
    setIsSpeaking(false);
  }, []);

  const injectTemplate = useCallback((phrase: string, languageName: string) => {
    const dc = dcRef.current;
    if (!dc || dc.readyState !== "open") return;

    dc.send(JSON.stringify({
      type: "conversation.item.create",
      item: {
        type: "message",
        role: "user",
        content: [{
          type: "input_text",
          text: `[TEMPLATE] Say this in ${languageName}: "${phrase}"`,
        }],
      },
    }));
    dc.send(JSON.stringify({ type: "response.create" }));
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => disconnect();
  }, [disconnect]);

  return {
    status,
    isSpeaking,
    transcriptTurns,
    currentAiText,
    connect,
    disconnect,
    injectTemplate,
    sendToolResult,
  };
}
