import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';

const source = JSON.parse(readFileSync('tmp/osm/overture-places.json', 'utf8'));
const originals = [
  ['Cabo Fish Taco', 37.2292197, -80.4137335],
  ['Gillies', 37.2302914, -80.4157858],
  ['Our Daily Bread', 37.2173659, -80.4012893],
  ["Zeppoli's", 37.2337267, -80.4329164],
  ['Blacksburg Wine Lab', 37.2336936, -80.4211698]
];
const radians = n => n * Math.PI / 180;
const miles = (a,b,c,d) => {
  const x=radians(c-a), y=radians(d-b);
  return 3958.7613 * 2 * Math.asin(Math.sqrt(Math.sin(x/2)**2 + Math.cos(radians(a))*Math.cos(radians(c))*Math.sin(y/2)**2));
};
const normalize = s => s.toLowerCase().normalize('NFKD').replace(/[’']/g,'').replace(/[^a-z0-9]+/g,' ').trim();
const label = category => category.replace(/_restaurant$/, '').replaceAll('_',' ').replace(/\b\w/g,c=>c.toUpperCase()).replace(/^Restaurant$/,'Restaurant');
const entries=[];
for (const row of source.rows) {
  const {name, lat, lng}=row;
  if (!name?.trim() || !Number.isFinite(lat) || !Number.isFinite(lng)) continue;
  // Generic restaurant classifications sometimes describe legal entities or unrelated stalls.
  if(row.category==='restaurant'&&(/\b(llc|inc|corporation|counseling)\b/i.test(name)||/^(Potted Plants|Zeppolli's)$/i.test(name)))continue;
  const distance=miles(source.center.lat,source.center.lng,lat,lng);
  if (distance>10) continue;
  const key=normalize(name);
  if (originals.some(([n,a,b])=>(normalize(n)===key||key.startsWith(normalize(n)+' '))&&miles(a,b,lat,lng)<.35)) continue;
  if (entries.some(e=>normalize(e.name)===key&&miles(e.lat,e.lng,lat,lng)<.05)) continue;
  const cuisine=label(row.category||'restaurant');
  const address=row.address?.trim()||'';
  const website=typeof row.website==='string'&&/^https?:\/\//i.test(row.website)?row.website:'';
  const id=100000000+parseInt(createHash('sha256').update(row.id).digest('hex').slice(0,11),16);
  entries.push({id,source_id:row.id,name:name.trim(),cuisine,area:'Virginia Tech area',description:`${cuisine} listed within 10 miles of Virginia Tech.`,website,website_label:'Listing website',initials:name.trim().split(/\s+/).slice(0,2).map(w=>w[0]).join('').toUpperCase(),tags:[cuisine],address,lat,lng,distance_miles:Math.round(distance*10)/10});
}
entries.sort((a,b)=>a.distance_miles-b.distance_miles||a.name.localeCompare(b.name));
const ids=new Set(entries.map(e=>e.id));
if(ids.size!==entries.length)throw Error('Restaurant ID collision');
writeFileSync('restaurant-catalog.json',JSON.stringify({center:source.center,radius_miles:10,release:source.release,retrieved:source.retrieved,source:'Overture Maps Places',attribution:'https://overturemaps.org/',entries},null,2)+'\n');
console.log(`Saved ${entries.length} additional restaurants within 10 miles.`);
