/**
 * Browser subscription to the generation progress feed.
 *
 * The generate request is a single blocking POST that runs for minutes, so the
 * wizard learns nothing from it until it returns. This socket is the only
 * channel that reports what the pipeline is actually doing. Polling is not an
 * option here — the cluster runs a notification service for exactly this.
 *
 * The service persists a Redis stream per channel and stamps every message
 * with `event_id`, so a dropped connection resumes from the last message seen
 * instead of leaving the wizard stuck on a stage that already finished.
 */

import type { PortraitProgressEvent } from "./portrait-stages";

const WS_BASE = process.env.NEXT_PUBLIC_NOTIFY_WS_URL;

const RECONNECT_DELAY_MS = 2000;

/**
 * Subscribe until the returned function is called. Never throws: if the feed
 * is unreachable the wizard falls back to its elapsed clock, which is worse
 * but not broken.
 */
export function subscribeToProgress(
  portraitId: string,
  onEvent: (event: PortraitProgressEvent) => void
): () => void {
  if (!WS_BASE || typeof WebSocket === "undefined") return () => {};

  let socket: WebSocket | null = null;
  let retryTimer: ReturnType<typeof setTimeout> | null = null;
  let lastEventId: string | null = null;
  let closed = false;

  const connect = () => {
    if (closed) return;

    const url = new URL(`${WS_BASE}/ws/imagecrafter/${portraitId}`);
    if (lastEventId) url.searchParams.set("last_event_id", lastEventId);

    try {
      socket = new WebSocket(url.toString());
    } catch {
      return;
    }

    socket.onmessage = (message) => {
      let payload: Record<string, unknown>;
      try {
        payload = JSON.parse(message.data as string);
      } catch {
        return;
      }

      if (typeof payload.event_id === "string") lastEventId = payload.event_id;
      if (payload.event !== "portrait_progress") return;

      const data = payload.data as PortraitProgressEvent | undefined;
      if (data?.stage) onEvent(data);
    };

    socket.onclose = () => {
      socket = null;
      if (closed) return;
      retryTimer = setTimeout(connect, RECONNECT_DELAY_MS);
    };
  };

  connect();

  return () => {
    closed = true;
    if (retryTimer) clearTimeout(retryTimer);
    socket?.close();
  };
}
