/**
 * The stage vocabulary shared by the pipeline and the wizard.
 *
 * Kept apart from the publisher so the browser bundle never pulls in the
 * notifier credentials.
 */

export const PORTRAIT_STAGES = [
  "analyzing",
  "composing",
  "painting",
  "checking",
  "likeness",
  "reviewing",
  "finishing",
] as const;

export type PortraitStage = (typeof PORTRAIT_STAGES)[number];

/** Customer-facing name for each boundary. Never a raw provider error. */
export const STAGE_LABELS: Record<PortraitStage, string> = {
  analyzing: "Looking at your photo",
  composing: "Writing the scene",
  painting: "Painting the scene",
  checking: "Comparing the painting to your photo",
  likeness: "Working in the likeness",
  reviewing: "Checking the likeness",
  finishing: "Sharpening and framing",
};

export type PortraitProgressEvent = {
  /** Pipeline boundary just entered. */
  stage: PortraitStage | "done" | "failed";
  /** Customer-facing sentence for this stage. Never a raw provider error. */
  label: string;
  /**
   * A real complication worth telling the customer about — a retry, a slow
   * leg. Absent when the run is ordinary. Never used for decoration.
   */
  note?: string;
};

export function progressChannel(portraitId: string): string {
  return `imagecrafter:${portraitId}`;
}
