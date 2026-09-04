import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();

const DISCO = `A photograph taken inside a Brooklyn discotheque in 1977 — a waist-up three-quarter portrait of {{subject}}, the face large and clearly readable, never a distant full-body shot. Dress the subject for their own sex. A man wears a wide-lapel three-piece suit — pick one colour and commit: chocolate brown, powder blue, burgundy, forest green or charcoal — over an open-collar patterned shirt. A woman wears a wrap dress, a satin halter dress or a wide-legged jumpsuit in emerald, scarlet, sapphire, black or ivory. If the subject is an animal, that animal itself wears the scaled-down suit. Hair is full and blow-dried in period style. {{style_modifiers}}. Behind is a real room thrown out of focus: a dance floor lit from below, banquette seating, a bar, other patrons dancing. The room light is warm; the clothing is not. Never tint the wardrobe to match the room and never dress the subject in gold or cream. No neon, no lasers, no LED wash, no purple cast, no feather boa, no sequins on a man, no modern makeup. Only the subject is dressed up: no costumed or suited animal stands beside a human subject. No lettering, signage, logos or brand names. Shot on Ektachrome with direct on-camera flash: blown highlights, warm grain, motion blur behind.`;

const DISCO_MODS = {
  mood: "alive, confident, a real night out",
  palette: "warm room light in red, amber and orange against saturated clothing colour",
  lighting: "coloured gel spotlights and warm tungsten, mirror-ball scatter, floor lit from below, direct flash",
};

const BAROQUE = `A Baroque master's portrait of {{subject}}, in the manner of Velázquez and Van Dyck. The subject wears real seventeenth-century dress, never a rented costume or cape. Vary the neckwear: cartwheel ruff, falling lace collar, plain linen collar, or none. For the garment pick ONE colour and commit: crimson, olive, slate blue, warm grey, russet or black. Never brown on brown. {{style_modifiers}}. Preserve the subject's face and physique exactly as described — slight stays slight, heavy stays heavy, young stays young. Paint the face honestly, never idealised. Choose ONE setting and commit completely, never blending the two. Either a full interior — a plastered wall, a panelled study or a stone hall, lit by a leaded-mullion window in a wooden casement — or a full exterior with no wall at all behind the sitter: open weather, distant blue hills, a wind-bent tree. Never a half-interior with a patch of sky, never a mural. No column, drapery swag or throne. Keep the setting loosely painted, darker than the face. Loaded visible brushwork — thick impasto where light strikes fabric, thin glazes in the darks, craquelure under varnish. Fill the picture with the sitter: never show the canvas as an object, on an easel, or framed.`;

const BAROQUE_MODS = {
  mood: "grave, inward, honestly observed",
  palette: "an earth-toned ground; against it the garment holds one saturated colour of its own",
  lighting: "a single steep light from upper left, or daylight from a high window, the ground falling away into shadow",
};

(async () => {
  console.log(`disco template chars:   ${DISCO.length}`);
  console.log(`baroque template chars: ${BAROQUE.length}`);
  const d = await p.styleVariant.updateMany({
    where: { slug: "disco" },
    data: { promptTemplate: DISCO, styleModifiers: DISCO_MODS },
  });
  const b = await p.styleVariant.updateMany({
    where: { slug: "baroque" },
    data: { promptTemplate: BAROQUE, styleModifiers: BAROQUE_MODS },
  });
  console.log(`disco: ${d.count} row(s) updated, baroque: ${b.count} row(s) updated`);
  await p.$disconnect();
})();
