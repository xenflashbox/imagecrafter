import { writeFileSync } from 'node:fs';
import { fetchVaultSecrets } from './_infisical.mjs';

const secrets = await fetchVaultSecrets();
const endpoint = 'https://cms.imagecrafter.app/api/articles/4023?depth=0';
const headers = { Authorization: `users API-Key ${secrets.PAYLOAD_API_KEY}`, 'Content-Type': 'application/json' };
const response = await fetch(endpoint, { headers });
if (!response.ok) throw new Error(`CMS read ${response.status}`);
const article = await response.json();
if (article.slug !== 'custom-dog-paintings-from-your-photo' || article.site !== 7) throw new Error('Unexpected article or tenant');
const content = structuredClone(article.content);
const nodes = content.root.children;
if (nodes.length !== 93 || nodes[44].fields.title !== 'Review the portrait plan') throw new Error('Article changed; review before applying again');
const text = value => ({ mode: 'normal', text: value, type: 'text', style: '', detail: 0, format: 0, version: 1 });
const paragraph = (index, value) => { nodes[index].children = [text(value)]; };
const body = (index, value) => { nodes[index].fields.body.root.children[0].children = [text(value)]; };

paragraph(3, 'This guide covers choosing a photo and a style, how ImageCrafter creates an AI-generated digital portrait, and how that differs from commissioning a hand-painted original. ImageCrafter starts with one photograph of one pet. You can inspect a free watermarked preview before deciding whether to buy the digital file.');
paragraph(9, 'A custom dog portrait starts with a reference photo and turns it into artwork. The result may be an AI-generated digital image, a digital illustration made by an artist, or a physical painting made by hand. ImageCrafter creates AI-generated digital artwork with a painterly style; it is not a hand-painted commission.');
paragraph(15, 'There are three distinct routes: an AI-generated portrait, a digital artist commission, or a traditional hand-painted original. ImageCrafter uses the first: upload one photo of one pet, choose a style, and generate a preview. Artist commissions have their own quotes, revision policies, and delivery schedules. Ask the artist directly rather than assuming those services are included in an AI portrait purchase.');
paragraph(37, 'With ImageCrafter, upload one photo, choose a style, and generate a watermarked preview. Review the likeness before paying. A digital purchase unlocks the watermark-free download and an email confirmation. There is no artist consultation, portrait-plan approval, or hand-painted revision service in this flow.');
paragraph(39, "Choose one photograph showing one pet, with sharp eyes and a recognizable expression. Use even light and avoid heavy filters. ImageCrafter does not combine photographs or train a model on several angles of your dog. If you have several photos, choose the clearest single reference before uploading.");
body(40, 'Choose the single image that best combines a clear face and the pose you want. Separate reference photos cannot be merged in the portrait flow.');
const steps = [
  ['Upload one photo', "Choose one clear, well-lit photograph of one pet. Keep the eyes visible and leave space around the head. No account is required to start a preview."],
  ['Choose a style', 'Select an available style and variant in the portrait studio. The examples help you compare the mood before generating your own image.'],
  ['Review your preview', 'Inspect the generated watermarked preview, especially the eyes, markings, and expression. Generation time varies. A preview is not a promise of hand-painted revisions or unlimited free attempts.'],
  ['Buy and download', 'If you love the result, purchase the digital portrait through Stripe. Your confirmation email provides the download link. The digital order does not include a physical print, frame, or shipping.'],
];
steps.forEach(([title, value], i) => { nodes[43 + i].fields.title = title; body(43 + i, value); });
paragraph(47, 'Take your time reviewing the preview. Paying unlocks the watermark-free digital file; it does not commission a different painting or an artist revision.');
paragraph(50, 'The current ImageCrafter offer is a digital download. You can arrange printing separately with a provider you choose. The paper and canvas comparison below explains display choices, not products or shipping included in an ImageCrafter order. Check the file dimensions against your printer\'s recommended size before ordering.');
paragraph(60, 'Canvas and framed paper need care. Keep either away from direct sunlight, moisture, and heat. Durability depends on the actual ink, substrate, protective finish, and display conditions, so ask your printer about those materials.');
paragraph(61, 'Ordinary glazing should not be assumed to provide full UV protection. For a long-term display, ask about archival materials and explicitly UV-protective glazing, and follow the printer\'s care instructions.');
paragraph(65, 'ImageCrafter offers a free watermarked preview. The single digital portrait is $19.99 USD at the time of this review; the live pricing page and checkout show the current price and any applicable tax. Physical printing is separate.');
paragraph(68, 'For an artist commission or external print order, confirm the quote and delivery schedule directly with the provider. ImageCrafter does not guarantee a fixed preview generation time.');
const priceTable = nodes[69].fields;
priceTable.headers[1].label = 'Pricing'; priceTable.headers[2].label = 'Delivery';
const priceRows = [
  ['ImageCrafter digital portrait', '$19.99 USD; current price at checkout', 'Digital download after payment'],
  ['Digital artist commission', 'Request a quote', 'Agreed with the artist'],
  ['Hand-painted original', 'Request a quote', 'Agreed with the artist'],
];
priceRows.forEach(([label, price, delivery], i) => { const row = priceTable.rows[i]; row.label = label; row.values[0].value = price; row.values[1].value = delivery; });
body(73, 'Compare the style examples before generating. Inspect your own preview before buying, and respect the preview limits shown by the studio.');
paragraph(75, 'A single ImageCrafter digital portrait costs $19.99 USD at the time of this review. Check the live price before purchase. If you want to display it on a wall, arrange and budget for printing separately.');
paragraph(76, 'Physical commissions and external prints have separate costs for materials, framing, and delivery. Ask the provider for a current quote and schedule; ImageCrafter\'s digital price does not include these services.');
paragraph(81, 'For a hand-painted portrait, ask the artist about their current queue, materials, revision policy, and delivery date. These vary by artist and project. ImageCrafter provides an AI-generated digital file instead.');
const comparison = nodes[82].fields;
comparison.headers[1].label = 'ImageCrafter digital portrait';
const comparisons = [
  ['Delivery', 'Digital download after payment', 'Confirm the artist\'s schedule'],
  ['Medium', 'AI-generated digital artwork', 'Physical paint on a substrate'],
  ['Revisions', 'Inspect the preview before purchase; no artist revision service', 'Confirm with the artist'],
  ['Price', '$19.99 USD at review; verify at checkout', 'Artist quote'],
  ['Display', 'Arrange printing separately if needed', 'Confirm framing and shipping'],
];
comparisons.forEach(([label, a, b], i) => { const row = comparison.rows[i]; row.label = label; row.values[0].value = a; row.values[1].value = b; });
paragraph(83, 'If a gift has a deadline, allow for generation, your review, and any printing you arrange separately. A digital download and a delivered physical painting are different purchases.');
paragraph(84, 'Choose an AI-generated portrait when you want a digital keepsake with a painterly style and a preview before purchase. Choose a hand-painted commission when physical brushwork and direct collaboration with an artist matter most.');
paragraph(88, 'Upload one clear photograph of one pet and choose an available style. Review the free watermarked preview before deciding. A single watermark-free digital portrait is $19.99 USD at review; the current price appears at checkout. Printing, framing, and shipping are not included.');
paragraph(90, 'This approach trades physical brushwork for a digital portrait you can inspect before buying. Results and generation times vary, which makes reviewing the likeness in the preview important.');
nodes[92].children[1].fields.url = '/portraits/create';
nodes[92].children[1].children[0].text = 'free portrait preview';
// Remove circular promotional links, duplicate standfirst, and two illustrations
// whose baked-in workflow/prices contradict the actual product. Keep all other blocks.
const remove = new Set([6, 16, 33, 35, 48, 62, 64, 78]);
content.root.children = nodes.filter((_, i) => !remove.has(i));
const patch = { content, html: null, lastReviewed: new Date().toISOString(),
  metaDescription: 'Choose one photo of your dog, compare portrait styles, and preview AI-generated artwork free. Learn how digital portraits differ from hand-painted commissions.',
};
console.log('Article correction:', { id: article.id, blocksBefore: nodes.filter(n => n.type === 'block').length, blocksAfter: content.root.children.filter(n => n.type === 'block').length, apply: process.argv.includes('--apply') });
if (process.argv.includes('--apply')) {
  const fresh = await (await fetch(endpoint, { headers })).json();
  if (fresh.updatedAt !== article.updatedAt) throw new Error('Concurrent article change; refusing overwrite');
  writeFileSync(`/tmp/imagecrafter-article-4023-before-${Date.now()}.json`, JSON.stringify(article), { mode: 0o600 });
  const result = await fetch(endpoint, { method: 'PATCH', headers, body: JSON.stringify(patch) });
  if (!result.ok) throw new Error(`CMS update ${result.status}: ${(await result.text()).slice(0, 500)}`);
  console.log('CMS article corrected');
  const revalidate = new URL('https://imagecrafter.app/api/revalidate');
  revalidate.searchParams.set('secret', secrets.REVALIDATE_SECRET);
  revalidate.searchParams.set('slug', article.slug);
  const r = await fetch(revalidate, { method: 'POST' });
  console.log('Revalidation HTTP', r.status);
}
