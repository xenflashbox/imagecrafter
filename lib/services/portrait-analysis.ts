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
    /**
     * Hair length, texture and how it is worn. The face swap replaces the face
     * region only — hair comes from the stand-in — so this must reach the
     * stand-in prompt or the output wears a stranger's hair.
     */
    hair?: string;
    /**
     * Face shape and proportions. Same reason as hair: the swap redraws the
     * features inside the face region, but head width, jawline and chin are
     * inherited from the stand-in.
     */
    faceShape?: string;
    /**
     * Body build. Portrait templates default to a slim idealised sitter, and
     * the swap only redraws the face region, so a heavyset subject rendered on
     * a slim stand-in ships a stranger regardless of swap quality.
     */
    build?: string;
    /**
     * Short, literal colour values split out of `coloring`. The style prior
     * repaints hair and eyes unless the exact colour words are restated as a
     * constraint at the very end of the scene prompt, and a back-reference
     * ("as described above") does not survive — it must be the literal value.
     * Kept deliberately short so the restatement fits the prompt char budget.
     */
    hairColor?: string;
    eyeColor?: string;
    skinTone?: string;
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

CORRECT FOR THE PHOTO'S LIGHTING BEFORE YOU NAME ANY COLOUR. Snapshots carry colour
casts - warm yellow indoor bulbs, golden late-afternoon sun, cool blue shade - and a
flash or a bright window washes tone out. Report hair, skin and eye colour as they
would look under neutral daylight, reading the mid-tones and shadowed areas rather
than the brightest lit patch. If you note a colour cast under photoQuality.issues you
MUST also have discounted it in the colour fields. A warm-lit snapshot of a
dark-brown-haired child was reported as 'medium brown with lighter streaks' and the
render came back auburn: the wrong description, faithfully rendered, ships a stranger.

Analyze the photo and return a JSON object with the following structure:
{
  "subjectType": one of "pet", "person", "couple", "family", "group",
  "subjectCount": number of subjects,
  "primarySubject": {
    "description": "A HIGHLY DETAILED description capturing the subject's UNIQUE identity. Include: exact face shape (round, oval, square, heart-shaped), specific eye details (shape, color, spacing, any distinctive qualities), nose shape and size, mouth shape and lip fullness, exact hair color/texture/style, skin tone, facial structure (cheekbones, jawline, chin), and any unique marks/features. For pets: exact coat patterns, ear shape/position, muzzle shape, eye color. The description must be so precise that the generated art will look like THIS SPECIFIC individual. 4-6 sentences.",
    "species": "if pet, the species (omit for humans)",
    "breed": "if pet, the breed or best guess (omit for humans)",
    "keyFeatures": ["array", "of", "5-8", "HIGHLY SPECIFIC", "identifying", "features", "that make this individual unique"],
    "coloring": "PRECISE description of colors - exact hair/fur color, which MUST match the 'hairColor' field: lead with the same anchor word, do NOT add 'warm', 'golden', 'honey', 'copper' or 'auburn' nuance to brown or black hair, because the painterly palette turns those words coppery red, and do NOT mention highlights, streaks or lighter strands, which the render reads as licence to lighten the whole head; then skin tone, which MUST lead with exactly one of these scale words, calibrated as follows - fair (very pale, burns rather than tans), light (pale to light beige, may carry a slight tan), medium (visibly beige to light olive year-round), tan (clearly brown), deep (dark brown to very dark). Judge against the whole human range, not against other people in the frame; when torn between two adjacent words choose the LIGHTER one, because the stand-in inherits this value and a too-dark stand-in produces a stranger. You may add undertone nuance only AFTER the scale word (e.g. 'light skin with olive undertones'). NEVER lead with the undertone: 'warm olive skin tone' reads as an olive-skinned person and is wrong for a light-skinned subject. Then eye color with specific shading.",
    "expression": "description of their facial expression/mood",
    "ageBracket": "MUST lead with exactly one of these bands, verbatim: 'infant', 'toddler', 'young child', 'child', 'teenager', 'young adult', 'adult in their 30s', 'adult in their 40s', 'adult in their 50s', 'senior'. Calibrated as - infant (under 2), toddler (2-4), young child (5-8), child (9-12), teenager (13-17), young adult (18-29), senior (60+). When torn between two adjacent bands choose the YOUNGER one, because the stand-in inherits this value and an aged-up stand-in produces a stranger. You may add nuance only AFTER the band (e.g. 'young child, around 6'). For pets lead with one of: 'puppy', 'kitten', 'adult dog', 'adult cat', 'senior pet'.",
    "genderPresentation": "for humans: apparent gender presentation, e.g. 'man', 'woman', 'boy', 'girl' (omit if unclear or for pets)",
    "hair": "for humans: hair LENGTH, TEXTURE and how it is worn. MUST lead with exactly one of these length words, verbatim: 'cropped', 'short', 'chin-length', 'shoulder-length', 'past-shoulders', 'long'. Judge where the ENDS of the hair actually fall against the body - a bob ending at the jaw is 'chin-length', not 'shoulder-length', and hair that stops above the shoulder line is never 'past-shoulders'. Then state whether it is straight, wavy, curly or coiled, then how it is worn. Omit for pets.",
    "faceShape": "MUST lead with exactly one of these shapes, verbatim: 'round', 'oval', 'square', 'heart-shaped', 'diamond', 'oblong'. Then describe face width, jawline definition and chin. For any subject in the infant/toddler/young child/child bands you MUST also state that the cheeks are full and the jawline soft and undefined, and must NOT use words like 'tapering', 'defined jawline', 'sculpted' or 'chiselled' - the stand-in inherits head geometry, so an adult jawline on a child yields a stranger.",
    "build": "for humans: MUST lead with exactly one of these words, verbatim: 'slight', 'slim', 'average', 'sturdy', 'heavyset', 'very heavyset'. Judge head, neck, shoulder and (if visible) torso width together, and judge against the whole adult range. Then describe face fullness, neck width and shoulder width. Portrait templates default to a slim idealised sitter, so an understated build produces a stranger - do NOT flatter the subject. Omit for pets.",
    "hairColor": "for humans: the hair colour ONLY, at most 6 words, and it MUST lead with exactly one of these words, verbatim: 'black', 'dark brown', 'medium brown', 'light brown', 'dark blonde', 'blonde', 'red', 'auburn', 'grey', 'white'. When torn between two adjacent shades choose the DARKER one, because the painterly palette lightens hair and a lightened stand-in produces a stranger. Judge the hair in shadow as well as in direct light, and do NOT add 'warm', 'golden', 'honey', 'copper' or 'auburn' nuance to brown or black hair - those words make the render come back coppery red. Do NOT mention highlights, streaks, lighter strands, sun-lightened ends or ombre either: the render treats any such phrase as licence to lighten the whole head, and a dark-brown-haired child described as having 'subtle natural lighter streaks' came back auburn (lead-verified 2026-08-18). No texture, no length, no styling. This exact string is restated as a hard constraint at the end of the render prompt.",
    "eyeColor": "for humans: the eye colour ONLY, as a short literal phrase of at most 6 words, e.g. 'deep brown, almost black' or 'pale grey-blue'. No shape, no expression. This exact string is restated as a hard constraint at the end of the render prompt.",
    "skinTone": "for humans: the skin tone ONLY, at most 6 words, MUST lead with the same scale word used in 'coloring' (fair, light, medium, tan, deep), optionally followed by an undertone, e.g. 'light with olive undertones'. NEVER lead with the undertone. Describe the SKIN only: no parenthetical, and no mention of the photo's lighting, white balance or colour cast - correct for those silently and record them under photoQuality.issues instead. This exact string is restated as a hard constraint at the end of the render prompt.",
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
 * Reduce a verdict word to bare letters. The model emits markdown emphasis on
 * its one-word answers (`**MISMATCH**`), which defeated a bare startsWith and
 * turned a correct mismatch into "unknown" — aborting the run fail-closed for a
 * parsing reason rather than a subject reason (2026-08-18).
 */
function lettersOnly(text: string): string {
  return text.toUpperCase().replace(/[^A-Z]/g, "");
}

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
              text: `You are checking for ONE specific defect: a face-swap step sometimes discards the artistic scene entirely and returns a plain photograph of the person.

Answer PHOTOREAL only if this image is essentially an ordinary photograph — everyday clothing, an ordinary real-world setting, no costume and no artistic rendering.

Answer STYLED if the image carries any artistic rendering, costume, or fantasy/period/illustrated setting, EVEN IF the face is rendered with photographic realism and EVEN IF it does not perfectly match the intended style. Fidelity to the intended style is not what you are judging.

Intended style, for context only: "${styleDescription}"

Answer with exactly one word: STYLED or PHOTOREAL.`,
            },
          ],
        },
      ],
    });
    const textContent = response.content.find((block) => block.type === "text");
    const answer =
      lettersOnly(textContent && "text" in textContent ? textContent.text : "");
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
              text: `Image 1 is a real photo of a subject. Image 2 is a stylized artistic portrait. Ignoring the artistic style, costume, and setting: does image 2 depict the SAME individual as image 1 — same facial structure, same hair color, same hair length and texture, same eye color, same skin tone, same apparent age and gender? Judge as a friend of the person would: if they would not recognise image 2 as this specific individual, answer DIFFERENT. A different hair color, a clearly different hair length or texture, a different eye color, or a different skin tone each mean DIFFERENT on their own. Answer with exactly one word: SAME or DIFFERENT.`,
            },
          ],
        },
      ],
    });
    const textContent = response.content.find((block) => block.type === "text");
    const answer =
      lettersOnly(textContent && "text" in textContent ? textContent.text : "");
    if (answer.startsWith("SAME")) return "same";
    if (answer.startsWith("DIFFERENT")) return "different";
    return "unknown";
  } catch (error) {
    console.error("[IdentityPresence] Check failed:", error);
    return "unknown";
  }
}

// =============================================================================
// IP-SAFETY CHECK (comic-hero)
// =============================================================================

export type IpSafety = "clean" | "infringing" | "unknown";

/**
 * Assert a superhero-style output carries no third-party IP.
 *
 * The comic-hero template already bans the S-shield, the bat symbol, spider
 * webbing and named Marvel/DC marks in explicit prose, and the engine drew a
 * pentagonal shield emblem anyway. Prompt-level bans are advisory; the engine
 * is drawing from a corpus where those marks ARE what a superhero looks like.
 * Detection is the only defence left, and shipping an infringing image to a
 * paying customer — or printing it — is not a defect we can settle later.
 *
 * FAIL-CLOSED: "unknown" must BLOCK at the caller. Only "clean" passes.
 *
 * Deliberately TWO calls: look first, judge second.
 *
 * A single call that lists the banned badge shapes and then asks for a verdict
 * does not work, at any max_tokens. Naming Superman's five-sided shield in the
 * question primes the answer: on the accept leg the model reported a "five-
 * sided shield shape that comes to a point at the bottom" around an emblem
 * that provably has no border at all (verified by cropping the chest region).
 * It found what it had been told to look for, and rejected the intended
 * original design 4 times in 5. Widening max_tokens from 16 to 300 only
 * changed which leg it got wrong.
 *
 * So the perception call is asked to describe the emblem with no mention of
 * infringement, trademarks, or any existing hero; the policy call then applies
 * the ban list to that description as text. The observation cannot be bent by
 * a criterion it never saw.
 */
export async function checkIpSafety(imageUrl: string): Promise<IpSafety> {
  if (!anthropic) return "unknown";
  try {
    const { base64, mediaType } = await fetchImageAsBase64(imageUrl);
    const observation = await anthropic.messages.create({
      model: VISION_MODEL,
      max_tokens: 300,
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
              text: `Describe this comic-book cover illustration factually. Answer these three questions in at most four short sentences:

1. Is the chest emblem enclosed by an outline — a badge, shield, circle, or any other border drawn around it? If yes, describe the shape of that border. If the artwork sits directly on the costume with nothing drawn around it, say so plainly.
2. What does the emblem's artwork itself depict?
3. Quote any text that appears anywhere on the image.

Report only what you can actually see. Do not guess at a border that is not drawn.`,
            },
          ],
        },
      ],
    });
    const obsBlock = observation.content.find((block) => block.type === "text");
    const description = (obsBlock && "text" in obsBlock ? obsBlock.text : "").trim();
    if (!description) {
      console.error("[IpSafety] Perception call returned no description");
      return "unknown";
    }

    const ruling = await anthropic.messages.create({
      model: VISION_MODEL,
      max_tokens: 200,
      messages: [
        {
          role: "user",
          content: `You are a trademark reviewer. An artist produced an original superhero comic cover. You cannot see it; you have an observer's factual description:

"""
${description}
"""

You are applying a BRIGHT-LINE RULE, not judging degree of similarity. Do not reason about whether the shape is different enough, stylised enough, or original enough. Either the description reports one of these borders around the emblem or it does not.

Answer INFRINGING if the description says the emblem is enclosed by any of:
- a shield, pentagon, five-sided, diamond or kite border (Superman)
- an oval or shield around a bat silhouette (Batman)
- a circle around a lightning bolt (The Flash, Shazam)
- a star, or concentric rings forming a target (Captain America)
- a spider shape or web pattern (Spider-Man)

"A shield-shaped border" is a match on the first line. So is "a pentagon-like badge". The word is enough — you do not get to decide it is sufficiently distinct from Superman's. Original artwork INSIDE the border does not matter and is not a reason to clear it; the border itself is the borrowed element.

Also answer INFRINGING if the quoted text names a real Marvel or DC character, one of their company logos, or the title of an actual Marvel or DC comic. An invented masthead title is expected on a comic cover and is not a problem on its own.

Answer CLEAN only if the description says the emblem has NO enclosing border, or describes a border shape that appears nowhere on the list above (for example a plain rectangle or a hexagon).

Reply with one short sentence giving your reason, then on a new line exactly one word: CLEAN or INFRINGING.`,
        },
      ],
    });
    const ruleBlock = ruling.content.find((block) => block.type === "text");
    const reply = (ruleBlock && "text" in ruleBlock ? ruleBlock.text : "").trim();
    // The verdict is the LAST capitalised token, not the first — the reason
    // sentence ahead of it may well name a banned shape while clearing it.
    const verdicts = reply.match(/\b(CLEAN|INFRINGING)\b/g);
    const answer = verdicts ? verdicts[verdicts.length - 1] : "";
    const trail = `${description} || ${reply}`.replace(/\s+/g, " ");
    if (answer === "INFRINGING") {
      console.warn(`[IpSafety] INFRINGING — ${trail}`);
      return "infringing";
    }
    if (answer === "CLEAN") {
      // Logged on the pass too: a cleared image is the one that reaches a
      // customer and a print run, so its basis has to be auditable after the
      // fact, not just a blocked one's.
      console.log(`[IpSafety] CLEAN — ${trail}`);
      return "clean";
    }
    console.error(`[IpSafety] No verdict — ${trail}`);
    return "unknown";
  } catch (error) {
    console.error("[IpSafety] Check failed:", error);
    return "unknown";
  }
}

// =============================================================================
// STAND-IN FIDELITY CHECK (fix directive P2.2 — before the swap)
// =============================================================================

export type StandInFidelity = "match" | "mismatch" | "unknown";

/**
 * Compare the rendered stand-in against the SUBJECT'S ACTUAL PHOTO before the
 * face swap. The swap can only bridge what the stand-in already resembles, so
 * a stand-in with the wrong skin tone or hair is regenerated — it never
 * reaches the swap.
 *
 * The comparison is image-to-image on purpose. Comparing against the analysis
 * text instead let a visibly different woman through on 2026-08-17: the
 * analysis had drifted (a fair-skinned subject described as "warm medium skin
 * tone with olive undertones"), the stand-in faithfully matched that text, and
 * the swap inherited the wrong skin tone. The photo is the only ground truth.
 *
 * This is a TRAIT check, not an identity check — the stand-in is deliberately
 * a different person. It vetoes only on traits the swap demonstrably does NOT
 * correct: skin tone, hair and eye colour. Facial structure and apparent age
 * are excluded because the swap rebuilds them, and because grading a stylised
 * painting's "apparent age" flipped run-to-run and failed a lead-verified
 * control. Each veto carries an explicit tolerance for the same reason: the
 * verifier read one photo as both "medium olive" and "light" across runs, so
 * an adjacent-step difference is noise, not signal.
 *
 * FAIL-CLOSED: "unknown" must ABORT the generation at the caller (never burn
 * regeneration spend while the verifier is blind).
 */
export async function checkStandInFidelity(
  photoUrl: string,
  standInImageUrl: string
): Promise<StandInFidelity> {
  if (!anthropic) return "unknown";
  try {
    const [photo, standIn] = await Promise.all([
      fetchImageAsBase64(photoUrl),
      fetchImageAsBase64(standInImageUrl),
    ]);
    const response = await anthropic.messages.create({
      model: VISION_MODEL,
      max_tokens: 400,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: photo.mediaType as "image/jpeg" | "image/png" | "image/gif" | "image/webp",
                data: photo.base64,
              },
            },
            {
              type: "image",
              source: {
                type: "base64",
                media_type: standIn.mediaType as "image/jpeg" | "image/png" | "image/gif" | "image/webp",
                data: standIn.base64,
              },
            },
            {
              type: "text",
              text: `Image 1 is a real photo of a subject. Image 2 is a stylized rendering of a stand-in who is meant to share that subject's physical traits (it is deliberately NOT the same individual, so do not judge identity, facial structure or age).

Place each trait on its scale, for image 1 then image 2. Use ONE label from the scale each time — do not invent labels, and pick by the colour in the mid-tones and shadows, not in a bright highlight.

SKIN TONE: fair / light / light-medium / medium / olive / tan / brown / deep
HAIR COLOUR: black / dark brown / medium brown / light brown / auburn / red / dark blonde / blonde / grey / white
HAIR LENGTH: cropped / short / chin-length / shoulder-length / past-shoulders / long
HAIR TEXTURE: straight / wavy / curly / coiled
EYE COLOUR: very dark brown / brown / hazel / green / blue / grey

Answer on five lines like "SKIN TONE: light -> light".

Then count the STEPS between the two labels on each scale and apply these rules:
- MISMATCH if any of skin tone, hair colour, hair length or eye colour differs by TWO OR MORE steps.
- MISMATCH if hair texture differs by two or more steps (straight vs curly, wavy vs coiled).
- MISMATCH if TWO OR MORE of skin tone, hair colour and eye colour each differ by exactly ONE step in the SAME direction along their scales (all toward the lighter/blonder end, or all toward the darker end). Individually tolerable drifts that all run the same way compound into a visibly different person: an olive-skinned, dark-brown-haired, dark-eyed child rendered as light-skinned, auburn-haired and light-brown-eyed passed every per-trait check and was still the wrong child (lead-verified 2026-08-18).

A single one-step difference, or one-step differences that run in opposite directions, is within tolerance — answer MATCH.

Do not let the scene lighting move a label. These styles wash the whole image in a warm golden cast that also falls on the background and clothing; a golden sheen on the skin or a warm highlight in the hair is illumination, not colouring. Read the label from the shadowed areas.

Ignore differences in facial structure, expression and apparent age — the swap rebuilds those.

Finish with a final line containing exactly one word: MATCH or MISMATCH.`,
            },
          ],
        },
      ],
    });
    const textContent = response.content.find((block) => block.type === "text");
    const raw = (textContent && "text" in textContent ? textContent.text : "").trim();
    if (response.stop_reason === "max_tokens") {
      console.error("[StandInFidelity] Response truncated before the verdict line");
      return "unknown";
    }
    // The trait readings are what make a verdict auditable — without them a
    // disagreement with the lead is untunable, because you cannot tell whether
    // the gate saw the wrong colour or applied the wrong rule.
    if (process.env.FIDELITY_DEBUG === "1") console.error(`[StandInFidelity]\n${raw}`);
    // The verdict is the LAST word: the observation lines above it mention both
    // terms, so matching from the start would read the description, not the call.
    const answer = lettersOnly(raw.split(/\s+/).filter(Boolean).pop() || "");
    if (answer.startsWith("MISMATCH")) return "mismatch";
    if (answer.startsWith("MATCH")) return "match";
    console.error(`[StandInFidelity] Unparseable verdict: ${raw.slice(-120)}`);
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
