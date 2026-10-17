import { PrismaClient } from "@prisma/client";
import {
  DISCO_MODIFIERS,
  DISCO_PROMPT,
  EGYPTIAN_MODIFIERS,
  EGYPTIAN_PROMPT,
} from "../../prisma/portrait-style-prompts";
const p = new PrismaClient();

const BAROQUE = `A Baroque master's portrait of {{subject}}, in the manner of Velázquez and Van Dyck. The subject wears real seventeenth-century dress, never a rented costume or cape. Vary the neckwear: cartwheel ruff, falling lace collar, plain linen collar, or none. For the garment pick ONE colour and commit: crimson, olive, slate blue, warm grey, russet or black. Never brown on brown. {{style_modifiers}}. Preserve the subject's face and physique exactly as described — slight stays slight, heavy stays heavy, young stays young. Paint the face honestly, never idealised. Choose ONE setting and commit completely, never blending the two. Either a full interior — a plastered wall, a panelled study or a stone hall, lit by a leaded-mullion window in a wooden casement — or a full exterior with no wall at all behind the sitter: open weather, distant blue hills, a wind-bent tree. Never a half-interior with a patch of sky, never a mural. No column, drapery swag or throne. Keep the setting loosely painted, darker than the face. Loaded visible brushwork — thick impasto where light strikes fabric, thin glazes in the darks, craquelure under varnish. Fill the picture with the sitter: never show the canvas as an object, on an easel, or framed.`;

const BAROQUE_MODS = {
  mood: "grave, inward, honestly observed",
  palette: "an earth-toned ground; against it the garment holds one saturated colour of its own",
  lighting: "a single steep light from upper left, or daylight from a high window, the ground falling away into shadow",
};

(async () => {
  console.log(`disco template chars:   ${DISCO_PROMPT.length}`);
  console.log(`egyptian template chars: ${EGYPTIAN_PROMPT.length}`);
  console.log(`baroque template chars: ${BAROQUE.length}`);
  const d = await p.styleVariant.updateMany({
    where: { slug: "disco" },
    data: { promptTemplate: DISCO_PROMPT, styleModifiers: DISCO_MODIFIERS },
  });
  const e = await p.styleVariant.updateMany({
    where: { slug: "egyptian" },
    data: { promptTemplate: EGYPTIAN_PROMPT, styleModifiers: EGYPTIAN_MODIFIERS },
  });
  const b = await p.styleVariant.updateMany({
    where: { slug: "baroque" },
    data: { promptTemplate: BAROQUE, styleModifiers: BAROQUE_MODS },
  });
  console.log(
    `disco: ${d.count} row(s) updated, egyptian: ${e.count} row(s) updated, baroque: ${b.count} row(s) updated`
  );
  await p.$disconnect();
})();
