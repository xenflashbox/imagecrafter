import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { fetchVaultSecrets } from './_infisical.mjs';
const s = await fetchVaultSecrets();
async function api(path, method='GET', body) {
  const r=await fetch(s.MAUTIC_API_URL+'/api'+path,{method,headers:{Authorization:'Basic '+Buffer.from(`${s.MAUTIC_USER}:${s.MAUTIC_PASS}`).toString('base64'),'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});
  if(!r.ok) throw Error(`${path}: HTTP ${r.status}`);
  return r.json();
}
const field=(name,type,value,operator='=')=>({glue:'and',field:name,object:'lead',type,operator,properties:{filter:value}});
const definitions=[
  {campaign:19,alias:'ic-launch-single-buyers-20260922',stage:'buyer',source:'purchase',single:true},
  {campaign:20,alias:'ic-launch-buyers-20260922',stage:'buyer',source:'purchase'},
  {campaign:21,alias:'ic-launch-previewers-20260922',stage:'previewer',source:'preview'},
];
const existing=Object.values((await api('/segments?limit=200')).lists);
const result=[];
for(const d of definitions){
  let list=existing.find(x=>x.alias===d.alias);
  const filters=[field('ic_stage','text',d.stage),field('ic_source','text',d.source),field('ic_marketing_ok','boolean',1),
    field('email','text','(@xencolabs[.]com$|@compareitad[.]com$|^xenophon@gmail[.]com$|^xen58@yahoo[.]com$|[.]invalid$|[.]test$)','!regexp'),
    ...(d.single?[field('ic_purchase_type','text','single')]:[])];
  if(!list)list=(await api('/segments/new','POST',{name:d.alias,alias:d.alias,isPublished:true,isGlobal:true,isPreferenceCenter:false,description:'Launch cohort: confirmed optional ImageCrafter marketing opt-in. Historical and internal contacts excluded. Send guard rechecks current eligibility.',filters})).list;
  assert(list.id); result.push({campaign:d.campaign,segment:list.id,alias:list.alias});
}
const dir='/home/xen/.local/state/imagecrafter/launch-20260922';mkdirSync(dir,{recursive:true,mode:0o700});
writeFileSync(dir+'/launch-segments.json',JSON.stringify(result,null,2),{mode:0o600});
console.log(result);

for(const id of [72,74]){
  const {email}=await api(`/emails/${id}`);assert.equal(email.isPublished,false);
  const old='Use your original browser to continue a saved preview. On another device, reply for help finding it.';
  const old2='To continue your saved preview, use the browser where you made it. Opening the studio on another device starts a new visit. If you need help returning to the earlier portrait, reply to this email.';
  const copy='Your private link opens this portrait on another device. It expires after seven days. Keep it private; use the sharing buttons on your preview to share publicly.';
  let html=email.customHtml.replaceAll(old,copy).replaceAll(old2,copy)
    .replaceAll('href="https://imagecrafter.app/portraits/create"','href="{contactfield=ic_return_url}"')
    .replaceAll('Open the portrait studio','Return to your portrait');
  let plain=email.plainText.replaceAll(old,copy).replaceAll(old2,copy)
    .replaceAll('Open the portrait studio: https://imagecrafter.app/portraits/create','Return to your portrait: {contactfield=ic_return_url}')
    .replaceAll('Your portrait preview is not attached to this email. You can open the portrait studio to begin again, or contact us for help finding your earlier preview.','Your preview is available through your private link below.');
  const dynamicContent=email.dynamicContent?.map(x=>x.tokenName==='ic-preview'?{...x,content:'<p style="margin:0 0 20px;">Your preview is available through your private link below.</p>'}:x);
  const saved=(await api(`/emails/${id}/edit`,'PATCH',{customHtml:html,plainText:plain,dynamicContent})).email;
  assert(saved.customHtml.includes('{contactfield=ic_return_url}'));assert.equal(saved.isPublished,false);
  console.log({email:id,returnCtaReady:true,published:false});
}
