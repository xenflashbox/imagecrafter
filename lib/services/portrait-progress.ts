/**
 * Live progress for the generation wizard.
 *
 * The pipeline is one blocking POST that runs 3-6 minutes. Without this the
 * wizard can only show a clock, and a clock invites the customer to assume it
 * has hung. Every event published here corresponds to a boundary the pipeline
 * actually crossed — nothing is on a timer, and nothing is inferred.
 *
 * Transport is the cluster's Universal WebSocket Service. We publish over HTTP;
 * the browser subscribes at wss://<host>/ws/imagecrafter/<portraitId>. The
 * service persists a Redis stream per channel, so a browser that connects late
 * or reconnects replays what it missed via last_event_id.
 */

import { progressChannel, type PortraitProgressEvent } from "../portrait-stages";

const NOTIFY_URL = process.env.NOTIFY_URL;
const NOTIFY_KEY = process.env.NOTIFY_KEY;

/**
 * Publish one stage event. Deliberately non-fatal: a notifier outage must not
 * kill a generation the customer has already paid attention for. It is loud in
 * the logs so a silently-dead progress feed is still an operator-visible fact.
 */
export async function publishProgress(
  portraitId: string,
  event: PortraitProgressEvent
): Promise<void> {
  if (!NOTIFY_URL || !NOTIFY_KEY) {
    console.warn(
      "[PortraitProgress] NOTIFY_URL/NOTIFY_KEY not configured — wizard will fall back to elapsed time only"
    );
    return;
  }

  try {
    const res = await fetch(`${NOTIFY_URL}/api/notify`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-notify-key": NOTIFY_KEY,
      },
      body: JSON.stringify({
        channel: progressChannel(portraitId),
        event: "portrait_progress",
        data: event,
      }),
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) {
      console.error(
        `[PortraitProgress] publish ${event.stage} failed: ${res.status} ${await res.text()}`
      );
    }
  } catch (error) {
    console.error(`[PortraitProgress] publish ${event.stage} threw:`, error);
  }
}
