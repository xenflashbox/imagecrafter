import assert from 'node:assert/strict';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { fetchVaultSecrets } from './_infisical.mjs';
const s = await fetchVaultSecrets();
const base = s.MAUTIC_API_URL.replace(/\/$/, '') + '/api';
async function api(path, body) {
  const r = await fetch(base + path, { method: body ? 'POST' : 'GET', headers: {
    Authorization: 'Basic ' + Buffer.from(`${s.MAUTIC_USER}:${s.MAUTIC_PASS}`).toString('base64'), 'Content-Type': 'application/json',
  }, ...(body ? { body: JSON.stringify(body) } : {}) });
  if (!r.ok) throw Error(`${path} HTTP ${r.status}: ${(await r.text()).slice(0, 1500)}`);
  return r.json();
}
const dir = '/home/xen/.local/state/imagecrafter/launch-20260922';
mkdirSync(dir, { recursive: true, mode: 0o700 });
for (const [kind, ids] of [['campaigns', [19,20,21]], ['emails', [70,71,72,73,74,75]]]) {
  for (const id of ids) if (!existsSync(`${dir}/${kind}-${id}-before.json`)) writeFileSync(`${dir}/${kind}-${id}-before.json`, JSON.stringify(await api(`/${kind}/${id}`)), { mode: 0o600, flag: 'wx' });
}
const fields = Object.values((await api('/fields/contact?limit=300')).fields);
for (const [alias, type] of [['ic_return_url','text'], ['ic_marketing_ok','boolean'], ['ic_captured_at','datetime'], ['ic_consent_at','datetime'], ['ic_return_expires_at','datetime']]) {
  let field = fields.find(f => f.alias === alias);
  if (!field) {
    if (!process.argv.includes('--apply')) { console.log({ alias, type, action: 'would-create' }); continue; }
    field = (await api('/fields/contact/new', { label: alias, alias, type, group: 'core', isPublished: true, isRequired: false,
      isPubliclyUpdatable: false, ...(type === 'text' ? { charLengthLimit: 255 } : {}),
      ...(type === 'boolean' ? { properties: { yes: 'Yes', no: 'No' } } : {}) })).field;
  }
  assert.equal(field.alias, alias); assert.equal(field.type, type);
  if (type === 'text') assert(Number(field.charLengthLimit) >= 255);
  console.log({ id: field.id, alias: field.alias, type: field.type });
}
