"use client";

import { useEffect, useRef, useState } from "react";

declare global {
  interface Window {
    JitsiMeetExternalAPI: new (
      domain: string,
      options: Record<string, unknown>
    ) => JitsiApi;
  }
}

interface JitsiApi {
  dispose: () => void;
  addEventListener: (event: string, handler: (data: unknown) => void) => void;
}

interface JitsiRoomProps {
  roomName: string;
  userName: string;
  userEmail: string;
  isModerator: boolean;
  onClose?: () => void;
}

export function JitsiRoom({
  roomName,
  userName,
  userEmail,
  isModerator,
  onClose,
}: JitsiRoomProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<JitsiApi | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let disposed = false;

    function initJitsi() {
      if (disposed || !containerRef.current) return;

      const api = new window.JitsiMeetExternalAPI("meet.jit.si", {
        roomName,
        parentNode: containerRef.current,
        width: "100%",
        height: "100%",
        userInfo: {
          displayName: userName,
          email: userEmail,
        },
        configOverwrite: {
          startWithAudioMuted: !isModerator,
          startWithVideoMuted: !isModerator,
          disableModeratorIndicator: false,
          enableLobbyChat: true,
          prejoinPageEnabled: false,
          toolbarButtons: isModerator
            ? [
                "microphone",
                "camera",
                "desktop",
                "chat",
                "raisehand",
                "participants-pane",
                "tileview",
                "hangup",
                "recording",
                "security",
              ]
            : [
                "microphone",
                "camera",
                "chat",
                "raisehand",
                "tileview",
                "hangup",
              ],
        },
        interfaceConfigOverwrite: {
          SHOW_JITSI_WATERMARK: false,
          SHOW_WATERMARK_FOR_GUESTS: false,
          SHOW_BRAND_WATERMARK: false,
          TOOLBAR_ALWAYS_VISIBLE: true,
          DISABLE_DOMINANT_SPEAKER_INDICATOR: false,
          DEFAULT_BACKGROUND: "#0a0a0b",
        },
      });

      apiRef.current = api;
      setLoading(false);

      api.addEventListener("readyToClose", () => {
        onClose?.();
      });
    }

    if (window.JitsiMeetExternalAPI) {
      initJitsi();
    } else {
      const script = document.createElement("script");
      script.src = "https://meet.jit.si/external_api.js";
      script.async = true;
      script.onload = () => initJitsi();
      document.head.appendChild(script);
    }

    return () => {
      disposed = true;
      apiRef.current?.dispose();
      apiRef.current = null;
    };
  }, [roomName, userName, userEmail, isModerator, onClose]);

  return (
    <div className="relative w-full h-full bg-black rounded-xl overflow-hidden">
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900 z-10">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-gray-400 text-sm">Conectando à live...</p>
          </div>
        </div>
      )}
      <div ref={containerRef} style={{ width: "100%", height: "100%" }} />
    </div>
  );
}
