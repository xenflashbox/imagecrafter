/**
 * Portrait Analysis Service
 *
 * Uses Claude Vision (via Xenco AI Gateway) to analyze uploaded photos
 * and extract structured subject descriptions for portrait generation.
 *
 * DUAL-FLOW: Works for both guest and authenticated users.
 * Authentication state is irrelevant here — analysis is purely about the photo.
 */

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
Your job is to analyze an uploaded photo and extract detailed subject 
descriptions that will be used to generate artistic portraits.

Analyze the photo and return a JSON object with the following structure:
{
  "subjectType": one of "pet", "person", "couple", "family", "group",
  "subjectCount": number of subjects,
  "primarySubject": {
    "description": "A detailed, vivid description of the primary subject as they appear in the photo. Include physical characteristics, coloring, distinguishing features, expression, and pose. Be specific enough that an artist could paint them from this description alone. 2-3 sentences.",
    "species": "if pet, the species (omit for humans)",
    "breed": "if pet, the breed or best guess (omit for humans)",
    "keyFeatures": ["array", "of", "3-6", "distinctive", "physical", "features"],
    "coloring": "description of their coloring/complexion",
    "expression": "description of their facial expression/mood"
  },
  "additionalSubjects": [
    {
      "description": "description if multiple subjects",
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

Be thorough but concise. The description must capture the subject's 
unique identity so the generated portrait looks like THEM, not a 
generic version. Return ONLY valid JSON, no explanation or preamble.`;

// =============================================================================
// AI GATEWAY CLIENT
// =============================================================================

const AI_GATEWAY_URL =
  process.env.AI_GATEWAY_URL ||
  "https://research.xencolabs.com/api/ai/chat/completions";
const AI_GATEWAY_KEY =
  process.env.AI_GATEWAY_API_KEY || process.env.DEVMAESTRO_API_KEY || "";
const VISION_MODEL = process.env.AI_VISION_MODEL || "claude-3-5-sonnet";

// =============================================================================
// ANALYSIS SERVICE
// =============================================================================

/**
 * Analyze an uploaded portrait photo using Claude Vision.
 * @param imageUrl - Public URL of the uploaded photo in R2
 */
export async function analyzePortraitPhoto(
  imageUrl: string
): Promise<AnalyzePortraitResult> {
  if (!AI_GATEWAY_KEY) {
    return {
      success: false,
      error: "AI analysis service is not configured (missing API key)",
    };
  }

  try {
    const response = await fetch(AI_GATEWAY_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${AI_GATEWAY_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: VISION_MODEL,
        messages: [
          {
            role: "system",
            content: ANALYSIS_SYSTEM_PROMPT,
          },
          {
            role: "user",
            content: [
              {
                type: "image_url",
                image_url: { url: imageUrl },
              },
              {
                type: "text",
                text: "Please analyze this portrait photo and return the JSON analysis.",
              },
            ],
          },
        ],
        max_tokens: 1024,
        temperature: 0.2,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[PortraitAnalysis] AI Gateway error:", response.status, errorText);
      return {
        success: false,
        error: `Analysis service error: ${response.status}`,
      };
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      return { success: false, error: "No analysis returned from AI service" };
    }

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

/**
 * Build the subject description string from analysis for use in prompt templates.
 */
export function buildSubjectDescription(
  analysis: PortraitSubjectAnalysis
): string {
  const { primarySubject, additionalSubjects } = analysis;

  let description = primarySubject.description;

  // Append key features for extra specificity
  if (primarySubject.keyFeatures.length > 0) {
    description += ` Notable features: ${primarySubject.keyFeatures.join(", ")}.`;
  }

  // Add additional subjects if present
  if (additionalSubjects && additionalSubjects.length > 0) {
    const extras = additionalSubjects.map((s) => s.description).join("; ");
    description += ` Also present: ${extras}.`;
  }

  return description;
}
