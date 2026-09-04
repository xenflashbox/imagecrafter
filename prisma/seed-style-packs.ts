/**
 * Seed script: StylePack + StyleVariant data
 * Source: ImageCrafter PRD Phase 2 — Section 4.5 + Section 6.1
 *
 * Run with: npx tsx prisma/seed-style-packs.ts
 *
 * Idempotent: uses upsert so it can be re-run safely.
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// =============================================================================
// PACK + VARIANT DATA (from PRD Section 4.5 + 6.1)
// =============================================================================

// Real production-pipeline gallery assets, hosted on R2/CDN. Every style in the
// catalog is selectable; a style only carries imagery once a real two-step
// output for it exists on R2 — no stock or placeholder images ship, and the
// picker renders a name-only tile for the rest.
const R2_GALLERY_THUMBS = "https://images.imagecrafter.app/gallery/v1/thumbs";

// Variants with a verified thumbnail on R2 (probed, not assumed). Every other
// variant returns "" until its example is generated.
const VARIANTS_WITH_THUMB = new Set([
  "renaissance",
  "starry-night",
  "egyptian",
  "elven",
  "comic-hero",
]);

// The variant whose thumbnail represents its whole pack in the pack grid.
const PACK_COVER_VARIANT: Record<string, string> = {
  "royal-gallery": "renaissance",
  masterpiece: "starry-night",
  "time-traveler": "egyptian",
  "fantasy-realm": "elven",
  "pop-culture": "comic-hero",
};
const galleryAsset = (packSlug: string, variantSlug: string, _size = 400): string => {
  const slug = variantSlug === "thumb" ? PACK_COVER_VARIANT[packSlug] : variantSlug;
  return slug && VARIANTS_WITH_THUMB.has(slug) ? `${R2_GALLERY_THUMBS}/${slug}.jpg` : "";
};

const STYLE_PACKS = [
  // ─────────────────────────────────────────────────────────────────────────
  // PACK 1: Royal Gallery
  // ─────────────────────────────────────────────────────────────────────────
  {
    slug: "royal-gallery",
    name: "Royal Gallery",
    tagline: "Reign supreme in royal splendor",
    description:
      "Transform your photo into a majestic royal portrait. Rich oil painting textures, ornate settings, and regal attire worthy of palace walls.",
    category: "classic",
    sortOrder: 1,
    thumbnailUrl: galleryAsset("royal-gallery", "thumb", 300),
    isActive: true,
    isPremium: false,
    variants: [
      {
        slug: "renaissance",
        name: "Renaissance Noble",
        description: "Raphael/Titian-era Italian court portrait",
        sortOrder: 1,
        sampleImageUrl: galleryAsset("royal-gallery", "renaissance"),
        promptTemplate: `A magnificent Italian Renaissance oil portrait painting of {{subject}}, posed in a three-quarter view wearing elaborate period-accurate noble attire with intricate gold thread embroidery, jeweled accessories, and a richly textured velvet cloak. {{style_modifiers}}. Set against a backdrop of a palatial interior with arched windows revealing a distant Tuscan landscape. Rich Venetian color palette dominated by deep crimsons, royal blues, and burnished gold. Dramatic yet flattering Rembrandt lighting with warm golden tones illuminating the face. Masterful brushwork reminiscent of Raphael and Titian, with visible oil paint texture. Museum-quality fine art painting, ultra detailed, 8K resolution.`,
        styleModifiers: { mood: "dignified, serene nobility", palette: "deep crimson, royal blue, burnished gold, ivory", lighting: "warm Rembrandt, golden hour through tall windows" },
      },
      {
        slug: "baroque",
        name: "Baroque Royalty",
        description: "Dramatic Caravaggio lighting, Velázquez grandeur",
        sortOrder: 2,
        sampleImageUrl: galleryAsset("royal-gallery", "baroque"),
        promptTemplate: `A dramatic Baroque-era royal portrait of {{subject}} in the grand manner of Velázquez and Van Dyck. The subject wears sumptuous court attire with an ermine-trimmed robe, lace collar, and elaborate jewelry. {{style_modifiers}}. Theatrical chiaroscuro lighting with a single dramatic light source casting rich, deep shadows. Background of heavy velvet drapery in burgundy and gold with a marble column partially visible. The composition conveys power and authority. Dense, layered oil painting technique with rich impasto highlights on jewelry and fabric. Opulent and commanding presence. Museum masterwork quality, ultra detailed.`,
        styleModifiers: { mood: "powerful, commanding, theatrical", palette: "burgundy, deep gold, black, cream, rich earth tones", lighting: "dramatic chiaroscuro, single source, deep shadows" },
      },
      {
        slug: "rococo",
        name: "Rococo Elegance",
        description: "Soft pastels, Fragonard-style aristocratic charm",
        sortOrder: 3,
        sampleImageUrl: galleryAsset("royal-gallery", "rococo"),
        promptTemplate: `An exquisite Rococo portrait of {{subject}} in the refined style of Fragonard and Boucher. The subject is adorned in pastel silk garments with delicate lace trim, pearl accessories, and flowers woven into the composition. {{style_modifiers}}. Set in an ornate French salon or pastoral garden with soft, dreamy atmosphere. Light, airy brushwork with soft edges. Pastel color harmony of powder blue, blush pink, soft gold, and cream. Playful yet elegant, with decorative flourishes and natural elements. A painting of aristocratic charm and refined beauty. Museum-quality, delicate brushwork, ultra detailed.`,
        styleModifiers: { mood: "elegant, playful, refined, romantic", palette: "powder blue, blush pink, soft gold, cream, lavender", lighting: "soft diffused, flattering, garden light" },
      },
      {
        slug: "tudor",
        name: "Tudor Court",
        description: "English court portrait, Holbein-inspired formality",
        sortOrder: 4,
        sampleImageUrl: galleryAsset("royal-gallery", "tudor"),
        promptTemplate: `A formal Tudor-era court portrait of {{subject}} in the style of Hans Holbein the Younger. The subject wears richly embroidered Tudor attire with a high collar, jeweled brooch, and intricate blackwork embroidery. {{style_modifiers}}. Flat, jewel-toned background in deep green or blue. Precise, meticulous detail on fabrics and jewelry. The subject's gaze is direct and confident. Restrained color palette with bold accents of ruby red and gold against dark backgrounds. Sharp focus, photorealistic detail in the Northern Renaissance tradition. Oil on oak panel quality, highly detailed, archival painting.`,
        styleModifiers: { mood: "formal, authoritative, precise", palette: "deep green, ruby red, gold, black, cream", lighting: "even, flat, Northern European studio light" },
      },
      {
        slug: "imperial",
        name: "Imperial Commander",
        description: "Napoleonic-era military portrait with medals and regalia",
        sortOrder: 5,
        sampleImageUrl: galleryAsset("royal-gallery", "imperial"),
        promptTemplate: `A commanding Napoleonic-era military portrait of {{subject}} in the neoclassical style of Jacques-Louis David. The subject wears a magnificent military dress uniform with gold epaulettes, medals of honor, braided aiguillettes, and a ceremonial sash. {{style_modifiers}}. Background of a battlefield at dawn or a war room with maps and a globe. Strong directional lighting emphasizing the face with heroic grandeur. Composition conveys leadership and courage. Rich, saturated oil painting with meticulous detail on military regalia. Neoclassical idealism meets portraiture. Grand scale, epic, museum masterwork.`,
        styleModifiers: { mood: "heroic, commanding, noble courage", palette: "navy blue, gold, deep red, white, battle grey", lighting: "heroic dawn light, strong directional from upper left" },
      },
      {
        slug: "victorian",
        name: "Victorian Aristocrat",
        description: "Formal Victorian portrait, dark rich tones",
        sortOrder: 6,
        sampleImageUrl: galleryAsset("royal-gallery", "victorian"),
        promptTemplate: `A refined Victorian-era portrait of {{subject}} in the style of John Singer Sargent. The subject wears elegant late 19th century formal attire — rich dark fabrics with subtle sheen, perhaps a top hat or elaborate hairstyle with jewelry. {{style_modifiers}}. Set in a dimly lit Victorian parlor with mahogany furniture, books, and a warm fireplace glow in the background. Sargent's signature loose yet precise brushwork and masterful fabric textures. Moody, warm color palette of deep browns, burgundy, forest green, and candlelit gold. Sophisticated and timeless elegance. Museum portraiture quality, ultra detailed.`,
        styleModifiers: { mood: "sophisticated, reserved elegance, warm", palette: "deep brown, burgundy, forest green, candlelit gold, ivory", lighting: "warm interior, fireplace glow, soft Sargent-style" },
      },
    ],
  },
  // ─────────────────────────────────────────────────────────────────────────
  // PACK 2: Masterpiece (Premium)
  // ─────────────────────────────────────────────────────────────────────────
  {
    slug: "masterpiece",
    name: "Masterpiece",
    tagline: "Step inside the world's greatest paintings",
    description:
      "You don't just get painted in the style — you become PART of the painting. Stand in the swirling skies of Starry Night, sit where the Mona Lisa sits, emerge from the Great Wave.",
    category: "masterpiece",
    sortOrder: 2,
    thumbnailUrl: galleryAsset("masterpiece", "thumb", 300),
    isActive: true,
    isPremium: true,
    variants: [
      {
        slug: "starry-night",
        name: "The Starry Night",
        description: "Subject placed in Van Gogh's swirling night landscape",
        sortOrder: 1,
        sampleImageUrl: galleryAsset("masterpiece", "starry-night"),
        promptTemplate: `{{subject}} standing in the undulating landscape of Vincent van Gogh's The Starry Night. The iconic deep cobalt blue night sky swirls above with luminous spiraling stars rendered in thick impasto brushstrokes of cadmium yellow and white. A radiant crescent moon glows in the upper right. The rolling cypress-dotted hills and small village with its glowing windows extend behind the subject. {{style_modifiers}}. The subject is rendered in the same post-impressionist style — bold directional brushstrokes, vibrant complementary colors, visible paint texture. The entire scene pulses with Van Gogh's emotional energy. Oil on canvas, thick impasto, post-impressionist masterwork.`,
        styleModifiers: { mood: "emotionally charged, dreamlike, cosmic", palette: "deep cobalt blue, cadmium yellow, white, emerald green, violet", lighting: "starlight and moonlight, luminous night" },
      },
      {
        slug: "mona-lisa",
        name: "Mona Lisa Throne",
        description: "Subject seated in the Mona Lisa's pose and background",
        sortOrder: 2,
        sampleImageUrl: galleryAsset("masterpiece", "mona-lisa"),
        promptTemplate: `{{subject}} seated in the exact pose and setting of Leonardo da Vinci's Mona Lisa. The subject sits with hands gently folded, turned slightly to face the viewer with an enigmatic expression. Behind them, the famous sfumato landscape of winding rivers, distant mountains, and arched bridges recedes into atmospheric haze. {{style_modifiers}}. Rendered in Leonardo's sfumato technique — soft, seamless gradations of tone with no visible brushstrokes. Subtle earth-toned palette of olive, amber, and warm brown. Masterful chiaroscuro modeling of the face. The entire image has the warm, amber patina of a centuries-old masterwork. Oil on poplar panel quality, High Renaissance perfection.`,
        styleModifiers: { mood: "enigmatic, serene, mysteriously knowing", palette: "olive, amber, warm brown, soft blue-grey haze", lighting: "soft Leonardo sfumato, diffused and mysterious" },
      },
      {
        slug: "great-wave",
        name: "The Great Wave",
        description: "Subject emerging from Hokusai's iconic wave",
        sortOrder: 3,
        sampleImageUrl: galleryAsset("masterpiece", "great-wave"),
        promptTemplate: `{{subject}} emerging from the iconic composition of Katsushika Hokusai's The Great Wave off Kanagawa. The massive curling wave towers above with its famous claw-like white foam fingers reaching toward the sky. Mount Fuji sits small and serene in the background beneath the wave's arch. The subject is positioned within the wave's dynamic curve, as if riding or emerging from the sea spray. {{style_modifiers}}. Rendered in the ukiyo-e woodblock print style — bold Prussian blue outlines, flat color areas, decorative foam patterns. Japanese woodblock print aesthetic with clean lines and dramatic composition.`,
        styleModifiers: { mood: "dynamic, powerful, nature's majesty", palette: "Prussian blue, indigo, white foam, pale sky, Fuji snow", lighting: "flat ukiyo-e lighting, graphic and bold" },
      },
      {
        slug: "pearl-earring",
        name: "Girl with a Pearl Earring",
        description: "Vermeer's dramatic lighting and dark background",
        sortOrder: 4,
        sampleImageUrl: galleryAsset("masterpiece", "pearl-earring"),
        promptTemplate: `{{subject}} rendered in the intimate, luminous style of Vermeer's Girl with a Pearl Earring. The subject turns to look over their shoulder at the viewer with parted lips and a captivating gaze. A single luminous pearl earring catches the light. {{style_modifiers}}. Deep, velvety black background that makes the subject emerge like a jewel from darkness. Vermeer's signature treatment of light — the gentle gleam of the earring, a turban or head covering in ultramarine and gold. Photorealistic yet painterly, with the Dutch Golden Age's mastery of light and intimacy. Oil on canvas, Vermeer quality, luminous and captivating.`,
        styleModifiers: { mood: "intimate, luminous, captivating gaze", palette: "ultramarine blue, gold, pearl white, deep black", lighting: "soft Vermeer light from upper left, pearlescent" },
      },
      {
        slug: "water-lilies",
        name: "Water Lilies Garden",
        description: "Subject surrounded by Monet's impressionist garden",
        sortOrder: 5,
        sampleImageUrl: galleryAsset("masterpiece", "water-lilies"),
        promptTemplate: `{{subject}} standing on the famous Japanese bridge in Claude Monet's Water Lily garden at Giverny. Lush impressionist vegetation surrounds them — cascading wisteria, weeping willows, and the famous pond covered in floating water lilies in pink, white, and lavender. {{style_modifiers}}. Dappled afternoon sunlight filters through the foliage creating dancing patterns of light and shadow. Rendered in Monet's late impressionist style — loose, expressive brushwork that dissolves forms into shimmering patches of color. The entire scene vibrates with captured light. Oil on canvas, French Impressionist masterwork.`,
        styleModifiers: { mood: "peaceful, sun-dappled, dreamy garden", palette: "soft green, lavender, pink, white, golden sunlight, water reflections", lighting: "dappled afternoon sunlight through foliage" },
      },
      {
        slug: "persistence",
        name: "The Persistence of Memory",
        description: "Dalí's surreal melting landscape surrounding subject",
        sortOrder: 6,
        sampleImageUrl: galleryAsset("masterpiece", "persistence"),
        promptTemplate: `{{subject}} placed within the surreal desert landscape of Salvador Dalí's The Persistence of Memory. Melting clocks drape over branches and ledges around the subject. The barren, dreamlike landscape stretches to distant cliffs under a twilight amber sky. {{style_modifiers}}. Rendered in Dalí's hyper-realistic surrealist technique — photographic precision applied to impossible subjects. Hard, precise edges on soft, melting forms. The uncanny juxtaposition of realistic rendering and dreamlike content. Warm amber and cool blue-grey palette. Meticulous oil painting technique, surrealist masterwork quality.`,
        styleModifiers: { mood: "dreamlike, surreal, uncanny, contemplative", palette: "warm amber, cool blue-grey, sandy beige, soft shadow purple", lighting: "late afternoon Mediterranean light, long shadows" },
      },
      {
        slug: "the-kiss",
        name: "The Kiss",
        description: "Klimt's golden mosaic style embracing the subject",
        sortOrder: 7,
        sampleImageUrl: galleryAsset("masterpiece", "the-kiss"),
        promptTemplate: `{{subject}} enveloped in the golden, mosaic-rich style of Gustav Klimt's The Kiss. The subject is adorned in elaborate robes decorated with geometric gold leaf patterns, spirals, and organic shapes. A field of wildflowers forms the ground beneath them. {{style_modifiers}}. Klimt's signature fusion of realistic portraiture and decorative flat patterning. Rich gold leaf dominates the composition, with the subject's face and hands rendered in naturalistic detail emerging from the ornamental abstraction. Art Nouveau organic curves meet Byzantine mosaic geometry. Mixed media appearance of oil paint and gold leaf, Viennese Secession masterwork.`,
        styleModifiers: { mood: "romantic, golden, ornate intimacy", palette: "gold leaf, warm bronze, deep emerald, floral colors, rich brown", lighting: "warm golden glow, flat decorative with realistic face" },
      },
      {
        slug: "american-gothic",
        name: "American Gothic",
        description: "Grant Wood-style stoic farmstead portrait",
        sortOrder: 8,
        sampleImageUrl: galleryAsset("masterpiece", "american-gothic"),
        promptTemplate: `{{subject}} posed in the stern, stoic composition of Grant Wood's American Gothic. Standing before a white clapboard house with the distinctive Gothic window. The subject holds a pitchfork and wears simple, hardworking rural attire. {{style_modifiers}}. Rendered in Grant Wood's precise, polished Regionalist style — smooth polished surfaces, sharp detail, and slightly stylized features. The composition is frontal and symmetrical with a deadpan, unflinching quality. Muted midwestern palette of white, grey, farm green, and brown. Oil on beaverboard quality, American Regionalist precision.`,
        styleModifiers: { mood: "stern, stoic, deadpan, American rural", palette: "white, grey-green, farm brown, denim blue", lighting: "flat, overcast midwestern light, even and unflattering" },
      },
    ],
  },
  // ─────────────────────────────────────────────────────────────────────────
  // PACK 3: Time Traveler
  // ─────────────────────────────────────────────────────────────────────────
  {
    slug: "time-traveler",
    name: "Time Traveler",
    tagline: "Visit any era, no time machine required",
    description:
      "Travel through history and see yourself in any time period. From ancient civilizations to retro decades, each variant is a portal to another age.",
    category: "time-travel",
    sortOrder: 3,
    thumbnailUrl: galleryAsset("time-traveler", "thumb", 300),
    isActive: true,
    isPremium: false,
    variants: [
      { slug: "egyptian", name: "Ancient Egyptian", description: "Pharaonic regalia, hieroglyphic backgrounds, gold and lapis lazuli", sortOrder: 1, sampleImageUrl: galleryAsset("time-traveler", "egyptian"), promptTemplate: `{{subject}} depicted as Egyptian royalty in a rich, painterly New Kingdom royal portrait with a lifelike, naturally proportioned face. The subject wears a magnificent nemes headdress (or vulture crown), broad gold and lapis lazuli collar necklace, kohl-lined eyes, and richly embroidered linen garments. {{style_modifiers}}. Hieroglyphic cartouches and sacred symbols frame the composition. Background of temple columns and the Nile at sunset. The subject faces the viewer in a three-quarter pose with a realistic, clearly visible face, painted in rich New Kingdom-inspired style with precise gold leaf accents. Warm palette of gold, lapis lazuli blue, terracotta, and papyrus cream.`, styleModifiers: { mood: "divine authority, eternal, sacred", palette: "gold, lapis lazuli blue, terracotta, black kohl, papyrus cream", lighting: "warm desert sun, golden hour on the Nile" } },
      { slug: "roman", name: "Roman Senator", description: "Marble bust style or toga-clad portrait with Roman architecture", sortOrder: 2, sampleImageUrl: galleryAsset("time-traveler", "roman"), promptTemplate: `{{subject}} portrayed as a Roman patrician in the tradition of Roman portrait busts and painted frescoes. The subject wears a pristine white toga with a purple-bordered toga praetexta, laurel wreath, and gold fibula brooch. {{style_modifiers}}. Background of a Roman forum with marble columns, the Senate building, and a Mediterranean blue sky. Rendered with the unflinching realism of Roman veristic portraiture — every feature captured honestly, conveying gravitas and authority. Warm marble and fresco color palette. Classical composition evoking the grandeur of the Roman Republic.`, styleModifiers: { mood: "gravitas, authority, Republican virtue", palette: "white marble, tyrian purple, gold, Mediterranean blue, warm stone", lighting: "bright Mediterranean sun, classical marble clarity" } },
      { slug: "medieval", name: "Medieval Knight", description: "Armor, castle backdrop, illuminated manuscript style", sortOrder: 3, sampleImageUrl: galleryAsset("time-traveler", "medieval"), promptTemplate: `{{subject}} depicted as a noble knight in the style of medieval illuminated manuscripts and tapestries. The subject wears polished plate armor with a heraldic surcoat, holds a sword or shield bearing a personal coat of arms, with a castle and tournament grounds behind them. {{style_modifiers}}. Rich, saturated colors typical of illuminated manuscripts — ultramarine, vermillion, burnished gold leaf borders. Slightly flattened medieval perspective with decorative border elements of interlacing vines and heraldic devices. Gold leaf accents, vellum texture, illuminated manuscript masterwork.`, styleModifiers: { mood: "chivalric honor, noble duty, heraldic pride", palette: "ultramarine, vermillion, gold leaf, forest green, parchment", lighting: "bright, flat manuscript lighting with gold accents" } },
      { slug: "samurai", name: "Samurai Warrior", description: "Traditional ukiyo-e inspired Japanese warrior portrait", sortOrder: 4, sampleImageUrl: galleryAsset("time-traveler", "samurai"), promptTemplate: `{{subject}} portrayed as a legendary samurai warrior in the ukiyo-e woodblock print tradition of Utagawa Kuniyoshi and Yoshitoshi. The subject wears ornate samurai armor (yoroi) with a fearsome kabuto helmet, katana at their side, standing before a moonlit Japanese landscape of cherry blossoms and ancient temple. {{style_modifiers}}. Bold, dramatic linework with flat color areas characteristic of Japanese woodblock printing. Dynamic composition with wind-blown elements and dramatic pose. Color palette of deep indigo, crimson, gold, and ink black.`, styleModifiers: { mood: "fierce honor, warrior discipline, poetic intensity", palette: "deep indigo, crimson, gold, ink black, cherry blossom pink", lighting: "moonlight and lantern glow, dramatic ukiyo-e" } },
      { slug: "art-deco", name: "1920s Art Deco", description: "Gatsby-era glamour, geometric patterns, gold accents", sortOrder: 5, sampleImageUrl: galleryAsset("time-traveler", "art-deco"), promptTemplate: `A glamorous 1920s Art Deco portrait of {{subject}}, posed with Jazz Age sophistication in a luxurious speakeasy or grand ballroom setting. The subject wears dazzling period attire — beaded gown with fringe or sharp tuxedo with a boutonniere, marcelled waves or sleek hair, and elegant accessories. {{style_modifiers}}. Bold geometric patterns frame the composition — chevrons, sunbursts, stepped forms in gold and black. The style of Tamara de Lempicka meets Erté: sculptural forms, saturated colors, and unapologetic glamour. Art Deco illustration meets painted portraiture, vintage poster quality.`, styleModifiers: { mood: "glamorous, sophisticated, Jazz Age excess", palette: "black, gold, emerald, ruby, champagne, ivory", lighting: "warm theatrical spotlight, golden highlights" } },
      { slug: "1950s", name: "1950s Americana", description: "Norman Rockwell-esque warmth, Saturday Evening Post cover", sortOrder: 6, sampleImageUrl: galleryAsset("time-traveler", "1950s"), promptTemplate: `A warm, nostalgic portrait of {{subject}} in the style of Norman Rockwell's Saturday Evening Post covers. The subject is captured in a charming everyday moment — at a soda fountain, on a front porch, or at a community gathering. Wearing classic 1950s attire with period-perfect styling. {{style_modifiers}}. Rockwell's signature warmth — photorealistic detail combined with gentle idealization, capturing humor and humanity. Rich, warm color palette of cherry red, sky blue, cream, and warm wood tones. Meticulous detail on fabrics, props, and expressions. Oil on canvas, American illustration golden age, heartwarming and nostalgic.`, styleModifiers: { mood: "warm, nostalgic, wholesome, gently humorous", palette: "cherry red, sky blue, cream, warm wood, grass green", lighting: "warm afternoon light, golden and inviting" } },
      { slug: "disco", name: "1970s Disco", description: "Glitter, neon, 70s nightclub energy", sortOrder: 7, sampleImageUrl: galleryAsset("time-traveler", "disco"), promptTemplate: `A dazzling disco-era portrait of {{subject}} owning the dance floor at a legendary 1970s discotheque. The subject wears spectacular 1970s fashion — sequined jumpsuit or flowing halter dress, platform shoes, and statement jewelry. Hair is voluminous and era-perfect. {{style_modifiers}}. Mirrored disco ball reflections scatter light across the scene. Background of a packed nightclub with abstract neon light shapes and a lit-up dance floor. No lettering, signage, logos or brand names anywhere in the image. Saturated, high-contrast color with intense purples, electric blues, gold, and hot pink. Painted in a photorealistic style with a slight film grain and vintage color processing reminiscent of 1970s photography.`, styleModifiers: { mood: "euphoric, glamorous, electric nightlife", palette: "electric purple, hot pink, gold, electric blue, mirror silver", lighting: "disco ball reflections, neon glow, dance floor lights" } },
      { slug: "synthwave", name: "1980s Synthwave", description: "Neon grids, chrome, retrowave sunset", sortOrder: 8, sampleImageUrl: galleryAsset("time-traveler", "synthwave"), promptTemplate: `A retro-futuristic synthwave portrait of {{subject}} set against an iconic 1980s retrofuture landscape. Neon grid extending to the horizon, chrome palm trees, a massive setting sun in gradient pink-to-purple, and a sleek wedge-shaped sports car in the background. The subject has rad 80s styling — aviator sunglasses, leather jacket, neon accents. {{style_modifiers}}. Hyper-saturated neon color palette of hot pink, electric cyan, chrome silver, and deep purple. Digital airbrush quality with smooth gradients and sharp neon glow effects. Retro VHS aesthetic with subtle scan lines. Synthwave album cover quality, ultra vibrant.`, styleModifiers: { mood: "cool, retro-futuristic, neon-drenched", palette: "hot pink, electric cyan, chrome silver, deep purple, sunset orange", lighting: "neon glow, sunset gradient, chrome reflections" } },
    ],
  },
  // ─────────────────────────────────────────────────────────────────────────
  // PACK 4: Fantasy Realm (Premium)
  // ─────────────────────────────────────────────────────────────────────────
  {
    slug: "fantasy-realm",
    name: "Fantasy Realm",
    tagline: "Enter worlds beyond imagination",
    description:
      "Step into the pages of your favorite fantasy worlds. Epic, cinematic, and utterly transportive.",
    category: "fantasy",
    sortOrder: 4,
    thumbnailUrl: galleryAsset("fantasy-realm", "thumb", 300),
    isActive: true,
    isPremium: true,
    variants: [
      { slug: "elven", name: "Elven Court", description: "Tolkien-esque ethereal woodland royalty", sortOrder: 1, sampleImageUrl: galleryAsset("fantasy-realm", "elven"), promptTemplate: `{{subject}} as noble elven royalty in a magnificent woodland palace. The subject wears flowing ethereal robes of silver and leaf-green with intricate vine and leaf motifs, an elegant circlet with a central gemstone, and pointed ear tips visible. The throne room is carved from a living ancient tree, with luminous crystal lanterns, hanging moss, and starlight filtering through a canopy of golden leaves. {{style_modifiers}}. Hyper-detailed digital fantasy painting in the tradition of Alan Lee and John Howe. Ethereal, otherworldly atmosphere with soft luminous lighting. Epic fantasy illustration, cinematic composition, ultra detailed.`, styleModifiers: { mood: "ethereal, ancient wisdom, otherworldly grace", palette: "silver, emerald, gold leaf, moonlight blue, bark brown", lighting: "ethereal starlight through canopy, luminous crystal glow" } },
      { slug: "dragon-rider", name: "Dragon Rider", description: "Epic fantasy, soaring above a mythical landscape", sortOrder: 2, sampleImageUrl: galleryAsset("fantasy-realm", "dragon-rider"), promptTemplate: `An epic fantasy scene of {{subject}} mounted upon a massive dragon, soaring above a dramatic landscape of mountain peaks piercing through cloud layers. The subject wears battle-worn dragon rider armor with scale mail and a flowing cloak that whips in the wind. The dragon has iridescent scales, leathery wings spread wide, and breathes wisps of flame. {{style_modifiers}}. Cinematic fantasy art with dramatic perspective — viewed from slightly below looking up, conveying power and freedom. Digital fantasy painting, concept art quality, breathtaking and epic.`, styleModifiers: { mood: "epic freedom, power, exhilarating adventure", palette: "dragon fire orange, sky blue, cloud white, dark scale green, storm grey", lighting: "dramatic backlighting from setting sun, dragon fire glow" } },
      { slug: "dark-sorcerer", name: "Dark Sorcerer", description: "Mysterious magical figure with arcane energy", sortOrder: 3, sampleImageUrl: galleryAsset("fantasy-realm", "dark-sorcerer"), promptTemplate: `{{subject}} as a powerful dark sorcerer channeling arcane energy in a gothic stone tower. The subject wears elaborate dark robes with mystical runes that glow with eldritch light, a staff crowned with a pulsing crystal, and ancient tomes float in the background. Arcane energy crackles between their outstretched fingers in streams of purple and teal lightning. {{style_modifiers}}. Dark, atmospheric scene lit primarily by magical energy and candlelight. Gothic stone architecture with carved gargoyles and stained glass. Dark fantasy digital painting, ominous and powerful, highly detailed.`, styleModifiers: { mood: "ominous power, dark knowledge, mystical authority", palette: "deep purple, teal glow, obsidian black, candlelight amber, blood red", lighting: "magical energy glow, candlelight, eldritch illumination" } },
      { slug: "fairy-tale", name: "Fairy Tale", description: "Storybook illustration, enchanted forest setting", sortOrder: 4, sampleImageUrl: galleryAsset("fantasy-realm", "fairy-tale"), promptTemplate: `{{subject}} in an enchanted fairy tale forest clearing, illustrated in the style of classic storybook art by Arthur Rackham and Edmund Dulac. The subject wears whimsical attire with magical elements — perhaps a crown of flowers, a cape of leaves, or boots with curling toes. Tiny fairy lights dance around them, mushroom rings dot the mossy ground, and friendly woodland creatures peek from behind ancient trees. {{style_modifiers}}. Delicate, detailed illustration style with fine pen linework and soft watercolor washes. Classic fairy tale book illustration, whimsical and enchanting.`, styleModifiers: { mood: "enchanted, whimsical, gentle magic, storybook wonder", palette: "moss green, warm gold, soft purple, fairy-light white, bark brown", lighting: "dappled forest sunlight, fairy light glow, magical sparkle" } },
      { slug: "steampunk", name: "Steampunk Inventor", description: "Brass, gears, goggles, Victorian-industrial aesthetic", sortOrder: 5, sampleImageUrl: galleryAsset("fantasy-realm", "steampunk"), promptTemplate: `{{subject}} as a brilliant steampunk inventor in a cluttered workshop filled with extraordinary brass contraptions. The subject wears a leather aviator coat with brass buckles, ornate goggles pushed up on their forehead, and fingerless gloves with mechanical enhancements. Gears turn, steam hisses from copper pipes, and a half-built flying machine looms in the background. {{style_modifiers}}. Victorian industrial aesthetic meets fantastical engineering. Warm, amber-toned lighting from gas lamps and furnace glow. Intricate mechanical detail on every surface. Digital painting with industrial warmth, steampunk genre art, highly detailed.`, styleModifiers: { mood: "inventive genius, Victorian adventure, mechanical wonder", palette: "polished brass, aged copper, dark leather, mahogany, steam white", lighting: "gas lamp warmth, furnace glow, amber industrial light" } },
      { slug: "cyberpunk", name: "Cyberpunk Runner", description: "Neon-drenched dystopian city, tech-augmented subject", sortOrder: 6, sampleImageUrl: galleryAsset("fantasy-realm", "cyberpunk"), promptTemplate: `{{subject}} as a cyberpunk street operative in a rain-soaked neon cityscape. The subject wears a tech-augmented jacket with holographic patches, cybernetic implant accents glowing at the temple, and carries advanced tech gear. Towering megacorp skyscrapers loom behind, covered in holographic advertisements. Rain reflects the neon lights in puddles across the wet asphalt. {{style_modifiers}}. Cinematic cyberpunk atmosphere. Blade Runner-meets-Ghost-in-the-Shell aesthetic. Saturated neon palette of electric blue, hot magenta, toxic green, and rain-slick black. Digital concept art, cinematic quality, ultra detailed cyberpunk.`, styleModifiers: { mood: "gritty, neon-noir, tech-augmented rebellion", palette: "electric blue, hot magenta, toxic green, rain-slick black, neon orange", lighting: "neon reflections in rain, holographic glow, volumetric fog" } },
      { slug: "underwater", name: "Underwater Kingdom", description: "Atlantean royalty, bioluminescent ocean depths", sortOrder: 7, sampleImageUrl: galleryAsset("fantasy-realm", "underwater"), promptTemplate: `{{subject}} as Atlantean royalty in a magnificent underwater palace. The subject wears flowing robes that undulate with the current, adorned with pearls, coral, and bioluminescent gems. An ornate crown of twisted sea gold and abalone shell. Schools of tropical fish swim past, jellyfish glow softly above, and the palace architecture blends coral formations with impossibly delicate stone arches. {{style_modifiers}}. Dreamy underwater atmosphere with god rays penetrating from the surface above. Color palette of deep ocean blue, bioluminescent teal, coral pink, pearl white, and sea gold.`, styleModifiers: { mood: "serene majesty, ocean mystique, bioluminescent wonder", palette: "deep ocean blue, bioluminescent teal, coral pink, pearl white, sea gold", lighting: "god rays from surface, bioluminescent glow, caustic light patterns" } },
      { slug: "celestial", name: "Celestial Being", description: "Cosmic, ethereal, surrounded by stars and galaxies", sortOrder: 8, sampleImageUrl: galleryAsset("fantasy-realm", "celestial"), promptTemplate: `{{subject}} as a celestial being floating among the cosmos. The subject is surrounded by swirling nebulae in deep purple and gold, with countless stars glittering in the infinite darkness. They wear robes that seem woven from starlight itself, with cosmic energy flowing from their form. A halo of orbiting celestial bodies — moons, asteroids, rings of stardust. {{style_modifiers}}. Awe-inspiring cosmic scale. Rich, deep space color palette of nebula purple, cosmic gold, starlight white, deep void black, and aurora green. Ethereal, luminous digital painting. Celestial fantasy art, transcendent and beautiful.`, styleModifiers: { mood: "transcendent, cosmic awe, divine presence", palette: "nebula purple, cosmic gold, starlight white, void black, aurora green", lighting: "self-luminous, starlight, nebula glow, cosmic radiance" } },
    ],
  },
  // ─────────────────────────────────────────────────────────────────────────
  // PACK 5: Pop Culture
  // ─────────────────────────────────────────────────────────────────────────
  {
    slug: "pop-culture",
    name: "Pop Culture",
    tagline: "Become the main character",
    description:
      "See yourself rendered in the most iconic visual styles of modern culture. No copyrighted characters — just the styles and aesthetics.",
    category: "pop-culture",
    sortOrder: 5,
    thumbnailUrl: galleryAsset("pop-culture", "thumb", 300),
    isActive: true,
    isPremium: false,
    variants: [
      { slug: "comic-hero", name: "Comic Book Hero", description: "Bold lines, halftone dots, dynamic comic book cover", sortOrder: 1, sampleImageUrl: galleryAsset("pop-culture", "comic-hero"), promptTemplate: `{{subject}} as a completely original comic book superhero on a dramatic comic book cover. The subject wears an entirely original costume: a teal and copper suit with angular silver piping, a short copper cape, and a chest emblem shaped like an abstract origami falcon built from geometric triangles — an original invented design that is not any existing logo. Bold black ink outlines, dynamic heroic pose, halftone dot shading, vibrant colors. The cityscape behind is rendered in dramatic perspective with speed lines and action effects. {{style_modifiers}}. Classic American comic book art style. The subject's face is unmasked, clearly visible, and well-lit. Any cover title text or corner stamp must be an original invented mark. Strictly no existing superhero intellectual property: no Superman S-shield, no Batman bat symbol, no Spider-Man webbing or spider emblem, no Marvel or DC character, logo, lettering, or signature costume. Comic book cover quality, dynamic and powerful.`, styleModifiers: { mood: "heroic, dynamic, powerful, larger than life", palette: "teal, copper, silver, bold black ink, white highlights", lighting: "dramatic comic lighting, bold shadows, rim light effects" } },
      { slug: "anime", name: "Anime Protagonist", description: "Japanese animation style, large expressive eyes, dynamic pose", sortOrder: 2, sampleImageUrl: galleryAsset("pop-culture", "anime"), promptTemplate: `{{subject}} as the main character of a dramatic anime series. Rendered in high-quality anime illustration style with large expressive eyes, dynamic hair with colorful highlights, and a detailed character design. The subject wears an elaborate anime-style outfit with flowing elements that suggest motion. Wind blows dramatically through the scene. Cherry blossom petals or leaves scatter across the composition. {{style_modifiers}}. Professional anime key visual quality — clean cel-shaded coloring with precise linework, detailed eyes with light reflections, dynamic composition. Studio-quality anime illustration, key visual poster quality.`, styleModifiers: { mood: "determined, emotional, dramatic protagonist energy", palette: "vibrant anime palette, saturated sky blue, cherry pink, warm gold", lighting: "anime golden hour, dramatic rim lighting, sparkle effects" } },
      { slug: "pixar-3d", name: "Pixar Portrait", description: "3D animated character render, Pixar/DreamWorks quality", sortOrder: 3, sampleImageUrl: galleryAsset("pop-culture", "pixar-3d"), promptTemplate: `{{subject}} rendered as a charming 3D animated character in the style of Pixar and Disney Animation Studios. Smooth, stylized features with exaggerated proportions — slightly larger head, expressive eyes with catchlights, and a warm, appealing character design. The character wears detailed, textured clothing with realistic fabric simulation. Placed in a richly detailed 3D environment appropriate to their personality. {{style_modifiers}}. Professional 3D render quality with subsurface scattering on skin, detailed hair/fur simulation, and cinematic depth of field. Movie poster composition. CG animated film quality, charming and full of personality.`, styleModifiers: { mood: "charming, warm, full of personality, family-friendly", palette: "warm Pixar palette, saturated but friendly tones", lighting: "soft Pixar lighting, warm key light, subtle bounce light, cinematic" } },
      { slug: "pixel-art", name: "Retro Pixel Art", description: "16-bit video game character sprite, nostalgic", sortOrder: 4, sampleImageUrl: galleryAsset("pop-culture", "pixel-art"), promptTemplate: `{{subject}} as a 16-bit pixel art video game character portrait. The style references classic SNES/Genesis era RPG character portraits — carefully placed pixels creating detailed facial features within a constrained grid. The character has a pixel art costume and is framed in an RPG-style character dialog box or inventory screen. {{style_modifiers}}. Authentic 16-bit aesthetic with a limited but vibrant color palette (32-64 colors), careful dithering for shading, and clean pixel placement. Optional scanline overlay for CRT authenticity. Nostalgic pixel art, retro gaming quality.`, styleModifiers: { mood: "nostalgic, retro gaming charm, heroic pixel character", palette: "limited 16-bit palette, vibrant primary and secondary colors", lighting: "pixel art shading with 3-4 tone levels, clean highlights" } },
      { slug: "street-art", name: "Street Art Mural", description: "Banksy/Shepard Fairey-inspired urban wall art", sortOrder: 5, sampleImageUrl: galleryAsset("pop-culture", "street-art"), promptTemplate: `{{subject}} as a massive street art mural painted on a weathered brick wall. The style blends photorealistic portraiture with bold graphic elements — geometric shapes, dripping paint, stencil layers, and typographic elements. The subject's portrait dominates the wall with intense detail on the face while the surrounding elements dissolve into abstract spray paint patterns. {{style_modifiers}}. Authentic street art aesthetic — visible brick texture beneath paint, spray paint overspray, wheat-paste layers, stencil edges. Bold, high-contrast color palette of bright spray paint against weathered grey brick. Urban art photography capturing the mural in its environment.`, styleModifiers: { mood: "bold, urban, countercultural, visually striking", palette: "bright spray paint colors against grey brick, high contrast", lighting: "natural daylight on the wall, realistic shadow from wall texture" } },
      { slug: "psychedelic", name: "Psychedelic Poster", description: "1960s concert poster, Peter Max color explosion", sortOrder: 6, sampleImageUrl: galleryAsset("pop-culture", "psychedelic"), promptTemplate: `{{subject}} at the center of a mind-expanding 1960s psychedelic concert poster. Swirling Art Nouveau lettering frames the composition, flowing organic shapes morph and undulate, and kaleidoscopic color patterns radiate outward. The subject's features are recognizable but stylized with flowing, melting lines and rainbow color shifts. {{style_modifiers}}. Authentic 1960s San Francisco poster art style of Victor Moscoso, Wes Wilson, and Rick Griffin. Vibrant, high-saturation complementary color collisions — orange against blue, red against green, purple against yellow. Letterpress poster quality on textured paper.`, styleModifiers: { mood: "mind-expanding, kaleidoscopic, countercultural ecstasy", palette: "vibrating complementary pairs: orange/blue, red/green, purple/yellow", lighting: "flat psychedelic, no realistic light — pure color interaction" } },
      { slug: "vaporwave", name: "Vaporwave", description: "Pastel gradients, Greek busts, retro-digital aesthetic", sortOrder: 7, sampleImageUrl: galleryAsset("pop-culture", "vaporwave"), promptTemplate: `{{subject}} floating in a surreal vaporwave dreamscape. Pastel pink and cyan gradients fill the sky, glitched Roman busts and Greek columns scatter the composition, tropical palms rendered in retrowave wireframe, and a checkerboard floor extends to infinity. The subject has a dreamy, nostalgic quality with soft pastel color shifting. {{style_modifiers}}. Classic vaporwave aesthetic — Windows 95 UI elements, Japanese text fragments, VHS glitch artifacts, marble textures. Soft, pastel color palette of millennial pink, seafoam, lavender, and sunset orange against a dreamy gradient sky. A E S T H E T I C quality, lo-fi digital nostalgia.`, styleModifiers: { mood: "dreamy nostalgia, retro-digital surrealism, melancholic beauty", palette: "millennial pink, seafoam, lavender, sunset orange, marble white", lighting: "soft gradient glow, no hard shadows, pastel ambient" } },
      { slug: "ghibli-style", name: "Studio Ghibli Style", description: "Miyazaki-esque watercolor anime, gentle and whimsical", sortOrder: 8, sampleImageUrl: galleryAsset("pop-culture", "ghibli-style"), promptTemplate: `{{subject}} in the gentle, hand-painted animation style of Studio Ghibli and Hayao Miyazaki. The subject is placed in a rich, detailed natural environment — perhaps a flower-covered hillside, a quaint countryside village, or a lush forest with dappled sunlight. Soft, rounded character design with warm, expressive features. Gentle wind moves through the scene, ruffling hair and grass. {{style_modifiers}}. Miyazaki's signature warmth — meticulous background painting with watercolor textures, puffy cumulus clouds in a brilliant blue sky, and lovingly detailed vegetation. Studio Ghibli film quality, heartwarming and beautiful.`, styleModifiers: { mood: "heartwarming, gentle wonder, pastoral peace", palette: "sky blue, grass green, warm earth, soft pink, cumulus white", lighting: "warm afternoon sunlight, dappled through trees, gentle and inviting" } },
    ],
  },
  // ─────────────────────────────────────────────────────────────────────────
  // PACK 6: Fine Art Studio
  // ─────────────────────────────────────────────────────────────────────────
  {
    slug: "fine-art",
    name: "Fine Art Studio",
    tagline: "Your portrait, gallery ready",
    description:
      "Pure artistic styles with no thematic overlay. Just your subject rendered in beautiful fine art techniques suitable for display.",
    category: "fine-art",
    sortOrder: 6,
    thumbnailUrl: galleryAsset("fine-art", "thumb", 300),
    isActive: true,
    isPremium: false,
    variants: [
      { slug: "oil-painting", name: "Oil on Canvas", description: "Classical oil portrait with visible brushwork", sortOrder: 1, sampleImageUrl: galleryAsset("fine-art", "oil-painting"), promptTemplate: `A masterful oil portrait of {{subject}} painted in the classical academic tradition. Rich, layered paint application with visible brushwork — thick impasto in highlights, thin transparent glazes in shadows. The subject is posed naturally with a warm, genuine expression. {{style_modifiers}}. Neutral background that keeps focus on the subject. Warm, natural color palette with accurate skin tones and subtle color temperature shifts between light and shadow sides. Masterful edge control — sharp focus on eyes and features, softer edges on hair and clothing. Classical oil portrait on stretched canvas, gallery quality, timeless and elegant.`, styleModifiers: { mood: "timeless, honest, classically beautiful", palette: "natural warm tones, accurate skin, rich earth palette", lighting: "classic portrait studio, 45-degree key light from upper left" } },
      { slug: "watercolor", name: "Watercolor", description: "Soft, flowing watercolor with white paper edges", sortOrder: 2, sampleImageUrl: galleryAsset("fine-art", "watercolor"), promptTemplate: `A luminous watercolor portrait of {{subject}} painted with confident, expressive washes. The portrait emerges from white paper with areas left deliberately unpainted, allowing the paper to breathe and glow through the transparent pigments. Wet-into-wet techniques create soft, blooming edges while precise dry-brush details define the eyes and key features. {{style_modifiers}}. Watercolor-specific qualities: visible pigment granulation, water bloom effects, color mixing on the paper surface, and the distinctive luminosity that comes from light passing through transparent pigment. Professional watercolor on cold-pressed paper, expressive and luminous.`, styleModifiers: { mood: "luminous, fresh, expressive spontaneity", palette: "limited watercolor palette, transparent pigments, white paper glow", lighting: "natural daylight, warm and even, letting watercolor transparency shine" } },
      { slug: "charcoal", name: "Charcoal Sketch", description: "Black and white charcoal drawing, dramatic contrast", sortOrder: 3, sampleImageUrl: galleryAsset("fine-art", "charcoal"), promptTemplate: `A dramatic charcoal portrait drawing of {{subject}} on textured cream paper. The drawing ranges from delicate fine lines to deep, velvety black tones achieved through heavy charcoal application. The subject is rendered with powerful contrast — bright highlights where charcoal has been lifted with an eraser, deep shadows where compressed charcoal is pressed into the paper grain. {{style_modifiers}}. Visible paper texture throughout, with charcoal sitting in the grain. A mix of vine charcoal (soft, atmospheric areas) and compressed charcoal (sharp details, deep blacks). White chalk or eraser highlights on the nose, cheekbones, and eyes create luminous focal points. Fine art charcoal drawing, museum quality.`, styleModifiers: { mood: "dramatic, raw, honest intensity", palette: "monochromatic — deep black to cream white, subtle warm paper tone", lighting: "strong directional, dramatic contrast, Rembrandt lighting" } },
      { slug: "impressionist", name: "Impressionist", description: "Monet/Renoir brushwork, dappled light", sortOrder: 4, sampleImageUrl: galleryAsset("fine-art", "impressionist"), promptTemplate: `An Impressionist portrait of {{subject}} painted en plein air in the style of Renoir and Monet. The subject is captured in a natural moment, perhaps in a garden or by a window, with dappled sunlight playing across their features. Loose, visible brushstrokes of pure color placed side by side to optically mix. {{style_modifiers}}. The emphasis is on captured light rather than precise detail — features are suggested through color relationships rather than drawn outlines. Warm, sun-filled palette with complementary color shadows. Spontaneous, joyful brushwork that captures the fleeting impression of a moment. Oil on canvas, French Impressionist quality.`, styleModifiers: { mood: "joyful, sun-dappled, fleeting beauty captured", palette: "pure spectral colors, warm light, complementary color shadows", lighting: "natural plein-air sunlight, dappled through foliage or windows" } },
      { slug: "pencil", name: "Pencil Drawing", description: "Detailed graphite pencil portrait", sortOrder: 5, sampleImageUrl: galleryAsset("fine-art", "pencil"), promptTemplate: `A highly detailed graphite pencil portrait drawing of {{subject}} on smooth Bristol paper. The drawing demonstrates virtuosic pencil technique — from delicate HB hairline marks for fine details to rich 6B tones for deep shadows. Every feature is rendered with photorealistic precision: individual hairs, the subtle texture of skin, the gleam in the eyes. {{style_modifiers}}. Clean, precise rendering with smooth tonal gradations achieved through careful layered hatching and blending. The portrait emerges from white paper with a natural vignette — fully rendered in the center, dissolving into loose sketch marks at the edges. Hyperrealistic pencil drawing, master draftsman quality.`, styleModifiers: { mood: "precise, intimate, photorealistic dedication", palette: "monochromatic graphite — full range from white paper to near-black", lighting: "soft studio lighting, gentle modeling, clean highlights" } },
      { slug: "stained-glass", name: "Stained Glass", description: "Medieval church window style, bold colors and lead lines", sortOrder: 6, sampleImageUrl: galleryAsset("fine-art", "stained-glass"), promptTemplate: `{{subject}} rendered as a magnificent stained glass window in the tradition of medieval cathedrals and Art Nouveau masters like Louis Comfort Tiffany. The subject's portrait is composed of hundreds of colored glass pieces separated by bold lead came lines. Light appears to stream through from behind, illuminating the rich jewel-toned glass. {{style_modifiers}}. The design blends realistic portraiture with the graphic constraints of stained glass — features defined by the lead lines, color areas are flat within each glass piece, and the overall effect is luminous and sacred. Jewel-tone palette of ruby, sapphire, emerald, amethyst, and gold. Cathedral quality stained glass, radiant and magnificent.`, styleModifiers: { mood: "sacred luminosity, jewel-toned radiance, architectural art", palette: "ruby, sapphire, emerald, amethyst, gold, clear glass white", lighting: "backlit — light streaming through colored glass, radiant glow" } },
      { slug: "mosaic", name: "Mosaic", description: "Ancient Roman/Byzantine tile mosaic style", sortOrder: 7, sampleImageUrl: galleryAsset("fine-art", "mosaic"), promptTemplate: `{{subject}} depicted as an ancient mosaic in the Byzantine or Roman tradition. The portrait is composed of thousands of small tesserae (tile pieces) in stone, glass, and gold leaf. The subject's features are rendered with the distinctive mosaic aesthetic — slightly abstracted by the grid of tiles yet clearly recognizable. {{style_modifiers}}. A rich gold leaf background typical of Byzantine mosaics, with the subject rendered in natural stone and colored glass tesserae. Visible grout lines between tiles add texture and pattern. Color palette of gold leaf, deep blue, terracotta, white marble, and rich green glass. Ancient mosaic quality, monumental and enduring.`, styleModifiers: { mood: "monumental, eternal, sacred craftsmanship", palette: "gold leaf, deep blue glass, terracotta stone, white marble, green glass", lighting: "warm ambient light reflecting off gold and glass tesserae" } },
      { slug: "ink-wash", name: "Ink Wash", description: "East Asian sumi-e brush painting, minimalist", sortOrder: 8, sampleImageUrl: galleryAsset("fine-art", "ink-wash"), promptTemplate: `{{subject}} painted in the East Asian sumi-e ink wash tradition. The portrait is rendered with confident, minimal brushstrokes — each mark carries maximum expression with minimum effort. The subject emerges from expansive negative space (white paper) with a few masterful strokes of black ink diluted to various tones. {{style_modifiers}}. Traditional sumi-e qualities: the beauty of the empty space is as important as the painted areas, ink gradations from deepest black to pale grey wash, spontaneous brushwork that captures essence rather than detail. Occasional red seal stamp (hanko) in the composition. Monochromatic with the warm tone of rice paper. East Asian brush painting on rice paper, meditative and masterful.`, styleModifiers: { mood: "meditative, essential, the beauty of restraint", palette: "sumi ink black through grey washes, white rice paper, red seal accent", lighting: "no represented lighting — tonal values only, Eastern aesthetic" } },
    ],
  },
  // ─────────────────────────────────────────────────────────────────────────
  // PACK 7: Custom Scene (Premium)
  // ─────────────────────────────────────────────────────────────────────────
  {
    slug: "custom-scene",
    name: "Custom Scene",
    tagline: "Describe your dream scene — we'll put you in it",
    description:
      "Type any scene you can imagine. Our AI understands your vision and places your subject in a completely custom world. No templates, no limits.",
    category: "custom",
    sortOrder: 7,
    thumbnailUrl: galleryAsset("custom-scene", "thumb", 300),
    isActive: true,
    isPremium: true,
    variants: [
      {
        slug: "custom",
        name: "Custom Scene",
        description: "Describe any scene — AI places your subject in it",
        sortOrder: 1,
        sampleImageUrl: galleryAsset("custom-scene", "custom"),
        // Template uses {{user_scene}} and {{subject}} — filled by portrait-generation.ts
        promptTemplate: `{{subject}} in a scene described as: {{user_details}}. High quality digital art, detailed, cinematic composition, professional quality.`,
        styleModifiers: { note: "Prompt is enhanced by Claude for custom scenes" },
      },
    ],
  },
];

// =============================================================================
// SEED FUNCTION
// =============================================================================

async function seedStylePacks() {
  console.log("Seeding StylePacks and StyleVariants...\n");

  let packCount = 0;
  let variantCount = 0;

  for (const packData of STYLE_PACKS) {
    const { variants, ...packFields } = packData;

    // Upsert the pack
    const pack = await prisma.stylePack.upsert({
      where: { slug: packFields.slug },
      create: { ...packFields, updatedAt: new Date() },
      update: { ...packFields, updatedAt: new Date() },
    });

    console.log(`✓ Pack: ${pack.name} (${pack.slug})`);
    packCount++;

    // Every variant in the catalog is active. Holding styles back on gate
    // statistics kept the one person who can judge a likeness from ever seeing
    // them; quality calls are made on the output, not before it exists.
    for (const variantData of variants) {
      const isActive = true;
      await prisma.styleVariant.upsert({
        where: {
          stylePackId_slug: {
            stylePackId: pack.id,
            slug: variantData.slug,
          },
        },
        create: {
          ...variantData,
          isActive,
          stylePackId: pack.id,
          updatedAt: new Date(),
        },
        update: {
          ...variantData,
          isActive,
          updatedAt: new Date(),
        },
      });

      console.log(`  ✓ Variant: ${variantData.name} (${variantData.slug})`);
      variantCount++;
    }
  }

  console.log(`\n✅ Seeded ${packCount} packs with ${variantCount} variants.`);
}

seedStylePacks()
  .catch((e) => {
    console.error("Seed error:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
