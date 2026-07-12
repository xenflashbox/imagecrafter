/**
 * Portrait Analysis Service
 *
 * Uses Claude Vision (direct Anthropic API) to analyze uploaded photos
 * and extract structured subject descriptions for portrait generation.
 *
 * DUAL-FLOW: Works for both guest and authenticated users.
 * Authentication state is irrelevant here — analysis is purely about the photo.
 */

import Anthropic from "@anthropic-ai/sdk";
import sharp from "sharp";

// =============================================================================
// TYPES (matching PRD section 4.3)
// =============================================================================

export interface PortraitSubjectAnalysis {
  subjectType: "pet" | "person" | "couple" | "family" | "group";
  subjectCount: number;
  primarySubject: {
    description: string;
    species?: string;
    breed?: string;
    keyFeatures: string[];
    coloring: string;
    expression: string;
    /** e.g. "toddler", "child around 8", "adult in their 30s" — drives the stand-in's age */
    ageBracket?: string;
    /** apparent gender presentation for humans, if evident */
    genderPresentation?: string;
  };
  additionalSubjects?: Array<{
    description: string;
    relationship?: string;
  }>;
  photoQuality: {
    resolution: "low" | "medium" | "high";
    lighting: "poor" | "acceptable" | "good" | "excellent";
    focus: "blurry" | "soft" | "sharp";
    composition: "poor" | "acceptable" | "good";
    usable: boolean;
    issues?: string[];
  };
}

export interface AnalyzePortraitResult {
  success: boolean;
  analysis?: PortraitSubjectAnalysis;
  error?: string;
}

// =============================================================================
// CLAUDE VISION SYSTEM PROMPT (from PRD section 4.3)
// =============================================================================

const ANALYSIS_SYSTEM_PROMPT = `You are a portrait photography analyst for an AI art generation service.
Your job is to analyze an uploaded photo and extract HIGHLY DETAILED subject descriptions
that will preserve the subject's UNIQUE IDENTITY when generating artistic portraits.

CRITICAL: The description must be specific enough that the generated portrait will be
IMMEDIATELY RECOGNIZABLE as the same individual. Focus on what makes THIS person/pet
unique compared to others of similar type.

Analyze the photo and return a JSON object with the following structure:
{
  "subjectType": one of "pet", "person", "couple", "family", "group",
  "subjectCount": number of subjects,
  "primarySubject": {
    "description": "A HIGHLY DETAILED description capturing the subject's UNIQUE identity. Include: exact face shape (round, oval, square, heart-shaped), specific eye details (shape, color, spacing, any distinctive qualities), nose shape and size, mouth shape and lip fullness, exact hair color/texture/style, skin tone, facial structure (cheekbones, jawline, chin), and any unique marks/features. For pets: exact coat patterns, ear shape/position, muzzle shape, eye color. The description must be so precise that the generated art will look like THIS SPECIFIC individual. 4-6 sentences.",
    "species": "if pet, the species (omit for humans)",
    "breed": "if pet, the breed or best guess (omit for humans)",
    "keyFeatures": ["array", "of", "5-8", "HIGHLY SPECIFIC", "identifying", "features", "that make this individual unique"],
    "coloring": "PRECISE description of colors - exact hair/fur color (e.g., 'warm chestnut brown with subtle auburn highlights' not just 'brown'), skin tone, eye color with specific shading",
    "expression": "description of their facial expression/mood",
    "ageBracket": "approximate age bracket, e.g. 'toddler', 'child around 8 years old', 'teenager', 'adult in their 30s', 'senior' (for pets: 'puppy', 'adult dog', etc.)",
    "genderPresentation": "for humans: apparent gender presentation, e.g. 'man', 'woman', 'boy', 'girl' (omit if unclear or for pets)",
    "faceShape": "specific face shape and proportions",
    "uniqueMarks": "any unique identifying marks: freckles, moles, dimples, scars, birthmarks, asymmetries"
  },
  "additionalSubjects": [
    {
      "description": "detailed description with same level of specificity",
      "relationship": "second dog, person holding pet, etc."
    }
  ],
  "photoQuality": {
    "resolution": "low|medium|high",
    "lighting": "poor|acceptable|good|excellent",
    "focus": "blurry|soft|sharp",
    "composition": "poor|acceptable|good",
    "usable": true or false (can we generate a good portrait from this?),
    "issues": ["array of any quality problems, e.g. backlit, motion blur, too far away"]
  }
}

REMEMBER: Generic descriptions create generic portraits. Specific, unique details create
recognizable portraits. Capture what makes THIS individual different from everyone else.

CRITICAL FOR IDENTITY PRESERVATION:
- Measure proportions precisely (e.g., "eyes set close together", "wide nose bridge")
- Note facial asymmetries that make faces unique
- Describe the EXACT shape of features, not general categories
- The generated portrait MUST be immediately recognizable as this specific person/pet

Return ONLY valid JSON, no explanation or preamble.`;

// =============================================================================
// ANTHROPIC CLIENT (Direct API for Vision)
// =============================================================================

// IMAGECRAFTER_ANTHROPIC_API_KEY is ImageCrafter's DEDICATED credential
// (Infisical vault `imagecrafter-production` + Vercel). Never a shared
// gateway key — a production pipeline must not share a credential with
// exploratory tooling (2026-07 incident).
const ANTHROPIC_API_KEY = process.env.IMAGECRAFTER_ANTHROPIC_API_KEY || "";
const VISION_MODEL = process.env.AI_VISION_MODEL || "claude-sonnet-4-5-20250929";

// Initialize Anthropic client
const anthropic = ANTHROPIC_API_KEY ? new Anthropic({ apiKey: ANTHROPIC_API_KEY }) : null;

// =============================================================================
// ANALYSIS SERVICE
// =============================================================================

// Anthropic's max image size is 5MB for base64 encoded images
// Base64 encoding adds ~33% overhead, so we need: threshold * 1.33 < 5MB
// Setting to 3.5MB to be safe (3.5 * 1.33 = 4.65MB)
const MAX_IMAGE_SIZE_BYTES = 3.5 * 1024 * 1024; // 3.5MB to account for base64 overhead
const MAX_IMAGE_DIMENSION = 2048; // Max width/height for analysis

/**
 * Fetch image, resize if needed, and convert to base64 for Anthropic API
 * Anthropic has a 5MB limit for base64 images
 */
async function fetchImageAsBase64(imageUrl: string): Promise<{ base64: string; mediaType: string }> {
  const response = await fetch(imageUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch image: ${response.status}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  const inputBuffer = Buffer.from(arrayBuffer);

  console.log(`[PortraitAnalysis] Original image size: ${(inputBuffer.length / 1024 / 1024).toFixed(2)}MB`);

  // Use sharp to resize if image is too large
  let outputBuffer: Buffer;
  let mediaType = "image/jpeg";

  if (inputBuffer.length > MAX_IMAGE_SIZE_BYTES) {
    console.log(`[PortraitAnalysis] Resizing image to fit under ${MAX_IMAGE_SIZE_BYTES / 1024 / 1024}MB limit`);

    // First attempt: resize to max dimension with 85% quality
    outputBuffer = await sharp(inputBuffer)
      .resize(MAX_IMAGE_DIMENSION, MAX_IMAGE_DIMENSION, {
        fit: "inside",
        withoutEnlargement: true,
      })
      .jpeg({ quality: 85 })
      .toBuffer();

    mediaType = "image/jpeg";
    console.log(`[PortraitAnalysis] Resized image size: ${(outputBuffer.length / 1024 / 1024).toFixed(2)}MB`);

    // If still too large, progressively reduce size and quality
    if (outputBuffer.length > MAX_IMAGE_SIZE_BYTES) {
      console.log(`[PortraitAnalysis] Still too large, reducing to 1536px with 75% quality`);
      outputBuffer = await sharp(outputBuffer) // Use outputBuffer, not inputBuffer
        .resize(1536, 1536, {
          fit: "inside",
          withoutEnlargement: true,
        })
        .jpeg({ quality: 75 })
        .toBuffer();
      console.log(`[PortraitAnalysis] Second resize: ${(outputBuffer.length / 1024 / 1024).toFixed(2)}MB`);
    }

    // If STILL too large, be more aggressive
    if (outputBuffer.length > MAX_IMAGE_SIZE_BYTES) {
      console.log(`[PortraitAnalysis] Still too large, reducing to 1280px with 65% quality`);
      outputBuffer = await sharp(outputBuffer)
        .resize(1280, 1280, {
          fit: "inside",
          withoutEnlargement: true,
        })
        .jpeg({ quality: 65 })
        .toBuffer();
      console.log(`[PortraitAnalysis] Third resize: ${(outputBuffer.length / 1024 / 1024).toFixed(2)}MB`);
    }

    // Last resort
    if (outputBuffer.length > MAX_IMAGE_SIZE_BYTES) {
      console.log(`[PortraitAnalysis] Final attempt: 1024px with 60% quality`);
      outputBuffer = await sharp(outputBuffer)
        .resize(1024, 1024, {
          fit: "inside",
          withoutEnlargement: true,
        })
        .jpeg({ quality: 60 })
        .toBuffer();
      console.log(`[PortraitAnalysis] Final size: ${(outputBuffer.length / 1024 / 1024).toFixed(2)}MB`);
    }
  } else {
    // Image is small enough, just determine media type
    outputBuffer = inputBuffer;
    const contentType = response.headers.get("content-type") || "image/jpeg";
    if (contentType.includes("png")) mediaType = "image/png";
    else if (contentType.includes("webp")) mediaType = "image/webp";
    else if (contentType.includes("gif")) mediaType = "image/gif";
    else mediaType = "image/jpeg";
  }

  const base64 = outputBuffer.toString("base64");
  return { base64, mediaType };
}

/**
 * Analyze an uploaded portrait photo using Claude Vision.
 * @param imageUrl - Public URL of the uploaded photo in R2
 */
export async function analyzePortraitPhoto(
  imageUrl: string
): Promise<AnalyzePortraitResult> {
  if (!anthropic) {
    return {
      success: false,
      error: "AI analysis service is not configured (missing IMAGECRAFTER_ANTHROPIC_API_KEY)",
    };
  }

  try {
    // Fetch and convert image to base64 for Anthropic API
    // Never log data URIs — that would dump the customer's photo into logs.
    console.log(
      "[PortraitAnalysis] Fetching image:",
      imageUrl.startsWith("data:")
        ? `<data URI, ${imageUrl.length} chars>`
        : imageUrl
    );
    const { base64, mediaType } = await fetchImageAsBase64(imageUrl);
    console.log("[PortraitAnalysis] Image fetched, media type:", mediaType);

    // Call Anthropic API with vision
    const response = await anthropic.messages.create({
      model: VISION_MODEL,
      max_tokens: 1024,
      system: ANALYSIS_SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: mediaType as "image/jpeg" | "image/png" | "image/gif" | "image/webp",
                data: base64,
              },
            },
            {
              type: "text",
              text: "Please analyze this portrait photo and return the JSON analysis.",
            },
          ],
        },
      ],
    });

    // Extract text content from response
    const textContent = response.content.find((block) => block.type === "text");
    const content = textContent && "text" in textContent ? textContent.text : null;

    if (!content) {
      return { success: false, error: "No analysis returned from AI service" };
    }

    console.log("[PortraitAnalysis] Raw response:", content.substring(0, 200));

    // Parse JSON — strip markdown code blocks if present
    const jsonText = content
      .replace(/```json\n?/g, "")
      .replace(/```\n?/g, "")
      .trim();

    const analysis = JSON.parse(jsonText) as PortraitSubjectAnalysis;

    // Validate required fields
    if (!analysis.subjectType || !analysis.primarySubject || !analysis.photoQuality) {
      return {
        success: false,
        error: "Incomplete analysis returned. Please try with a clearer photo.",
      };
    }

    console.log("[PortraitAnalysis] Analysis successful:", analysis.subjectType);
    return { success: true, analysis };
  } catch (error) {
    console.error("[PortraitAnalysis] Error:", error);
    if (error instanceof SyntaxError) {
      return {
        success: false,
        error: "Could not parse photo analysis. Please try with a different photo.",
      };
    }
    return {
      success: false,
      error: error instanceof Error ? error.message : "Analysis failed",
    };
  }
}

// =============================================================================
// STYLE-PRESENCE CHECK (two-step production rule, results doc §5)
// =============================================================================

export type StylePresence = "styled" | "photoreal" | "unknown";

/**
 * Check whether a generated image actually carries the artistic style.
 * ~1-in-N identity swaps nondeterministically discard the style scene and
 * return a photorealistic render (measured in the two-step test); production
 * retries the swap once when that happens.
 *
 * FAIL-CLOSED: "unknown" (vision unavailable or errored) must BLOCK the
 * output at the caller — a gate that silently goes inert manufactures the
 * appearance of verification (2026-07 gallery incident). The caller in
 * portrait-generation only accepts "styled".
 */
export async function checkStylePresence(
  imageUrl: string,
  styleDescription: string
): Promise<StylePresence> {
  if (!anthropic) return "unknown";
  try {
    const { base64, mediaType } = await fetchImageAsBase64(imageUrl);
    const response = await anthropic.messages.create({
      model: VISION_MODEL,
      max_tokens: 16,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: mediaType as "image/jpeg" | "image/png" | "image/gif" | "image/webp",
                data: base64,
              },
            },
            {
              type: "text",
              text: `Is this image rendered as stylized artwork in the style of "${styleDescription}" (painting, comic, illustration, etc.), or is it essentially a photorealistic photograph with no artistic style applied? Answer with exactly one word: STYLED or PHOTOREAL.`,
            },
          ],
        },
      ],
    });
    const textContent = response.content.find((block) => block.type === "text");
    const answer =
      (textContent && "text" in textContent ? textContent.text : "").trim().toUpperCase();
    if (answer.startsWith("STYLED")) return "styled";
    if (answer.startsWith("PHOTOREAL")) return "photoreal";
    return "unknown";
  } catch (error) {
    console.error("[StylePresence] Check failed:", error);
    return "unknown";
  }
}

// =============================================================================
// IDENTITY-PRESENCE CHECK (fix directive P2.1 — the core gate)
// =============================================================================

export type IdentityPresence = "same" | "different" | "unknown";

/**
 * Assert the generated output depicts the SAME PERSON (or pet) as the source
 * photo. This is the gate that never existed: the 2026-07 gallery shipped a
 * blonde blue-eyed elf and a green-eyed Egyptian queen for a dark-haired,
 * brown-eyed subject because only style was ever asserted.
 *
 * FAIL-CLOSED: "unknown" must BLOCK at the caller. Only "same" passes.
 */
export async function checkIdentityPresence(
  sourceImageUrl: string,
  outputImageUrl: string
): Promise<IdentityPresence> {
  if (!anthropic) return "unknown";
  try {
    const [source, output] = await Promise.all([
      fetchImageAsBase64(sourceImageUrl),
      fetchImageAsBase64(outputImageUrl),
    ]);
    const toBlock = (img: { base64: string; mediaType: string }) => ({
      type: "image" as const,
      source: {
        type: "base64" as const,
        media_type: img.mediaType as "image/jpeg" | "image/png" | "image/gif" | "image/webp",
        data: img.base64,
      },
    });
    const response = await anthropic.messages.create({
      model: VISION_MODEL,
      max_tokens: 16,
      messages: [
        {
          role: "user",
          content: [
            toBlock(source),
            toBlock(output),
            {
              type: "text",
              text: `Image 1 is a real photo of a subject. Image 2 is a stylized artistic portrait. Ignoring the artistic style, costume, and setting: does image 2 depict the SAME individual as image 1 — same facial structure, same hair color, same eye color, same skin tone, same apparent age and gender? A different hair color, eye color, or skin tone means DIFFERENT. Answer with exactly one word: SAME or DIFFERENT.`,
            },
          ],
        },
      ],
    });
    const textContent = response.content.find((block) => block.type === "text");
    const answer =
      (textContent && "text" in textContent ? textContent.text : "").trim().toUpperCase();
    if (answer.startsWith("SAME")) return "same";
    if (answer.startsWith("DIFFERENT")) return "different";
    return "unknown";
  } catch (error) {
    console.error("[IdentityPresence] Check failed:", error);
    return "unknown";
  }
}

// =============================================================================
// STAND-IN FIDELITY CHECK (fix directive P2.2 — before the swap)
// =============================================================================

export type StandInFidelity = "match" | "mismatch" | "unknown";

/**
 * Compare the rendered stand-in's coloring/demographics against the analysis
 * JSON BEFORE the face swap. The swap can only bridge what the stand-in
 * already resembles: a blonde blue-eyed stand-in for a dark-haired brown-eyed
 * subject fails here and is regenerated — it never reaches the swap.
 * Automates the human QA bar that made the Jul-7 test 15/15.
 *
 * FAIL-CLOSED: "unknown" must ABORT the generation at the caller (never burn
 * regeneration spend while the verifier is blind).
 */
export async function checkStandInFidelity(
  standInImageUrl: string,
  analysis: PortraitSubjectAnalysis
): Promise<StandInFidelity> {
  if (!anthropic) return "unknown";
  const p = analysis.primarySubject || ({} as PortraitSubjectAnalysis["primarySubject"]);
  const expectations = [
    p.coloring ? `coloring: ${p.coloring}` : "",
    p.genderPresentation ? `gender presentation: ${p.genderPresentation}` : "",
    p.ageBracket ? `age bracket: ${p.ageBracket}` : "",
  ]
    .filter(Boolean)
    .join("; ");
  if (!expectations) return "unknown";
  try {
    const { base64, mediaType } = await fetchImageAsBase64(standInImageUrl);
    const response = await anthropic.messages.create({
      model: VISION_MODEL,
      max_tokens: 16,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: mediaType as "image/jpeg" | "image/png" | "image/gif" | "image/webp",
                data: base64,
              },
            },
            {
              type: "text",
              text: `This is a stylized rendering of a subject who should have these real-world traits: ${expectations}. Allowing for the artistic style, does the depicted subject's hair color, eye color, skin tone, apparent gender, and apparent age plausibly MATCH those traits? A clearly different hair color, eye color, or skin tone means MISMATCH. Answer with exactly one word: MATCH or MISMATCH.`,
            },
          ],
        },
      ],
    });
    const textContent = response.content.find((block) => block.type === "text");
    const answer =
      (textContent && "text" in textContent ? textContent.text : "").trim().toUpperCase();
    if (answer.startsWith("MATCH")) return "match";
    if (answer.startsWith("MISMATCH")) return "mismatch";
    return "unknown";
  } catch (error) {
    console.error("[StandInFidelity] Check failed:", error);
    return "unknown";
  }
}

/**
 * Build the subject description string from analysis for use in prompt templates.
 * Enhanced to maximize identity preservation in generated portraits.
 */
export function buildSubjectDescription(
  analysis: PortraitSubjectAnalysis
): string {
  const { primarySubject, additionalSubjects } = analysis;

  // Start with core identity description
  let description = primarySubject.description;

  // Add face shape if available
  const faceShape = (primarySubject as { faceShape?: string }).faceShape;
  if (faceShape) {
    description += ` Face shape: ${faceShape}.`;
  }

  // Add precise coloring
  if (primarySubject.coloring) {
    description += ` Coloring: ${primarySubject.coloring}.`;
  }

  // Append key features for extra specificity
  if (primarySubject.keyFeatures.length > 0) {
    description += ` Distinctive identifying features: ${primarySubject.keyFeatures.join(", ")}.`;
  }

  // Add unique marks if available
  const uniqueMarks = (primarySubject as { uniqueMarks?: string }).uniqueMarks;
  if (uniqueMarks && uniqueMarks.toLowerCase() !== "none") {
    description += ` Unique marks: ${uniqueMarks}.`;
  }

  // Add expression for better likeness
  if (primarySubject.expression) {
    description += ` Expression: ${primarySubject.expression}.`;
  }

  // Add additional subjects if present
  if (additionalSubjects && additionalSubjects.length > 0) {
    const extras = additionalSubjects.map((s) => s.description).join("; ");
    description += ` Also present: ${extras}.`;
  }

  // Add identity preservation instruction at the end
  description += " IMPORTANT: Maintain exact likeness and all unique identifying features.";

  return description;
}
