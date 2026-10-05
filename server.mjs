import http from 'node:http';
import { createFeatures } from './features.mjs';
import { restaurantLocations } from './restaurant-locations.mjs';
import { DatabaseSync } from 'node:sqlite';
import { randomBytes, scryptSync, timingSafeEqual, createHash } from 'node:crypto';
import { mkdirSync, readFileSync, existsSync } from 'node:fs';
import { resolve, extname } from 'node:path';
import { promisify } from 'node:util';
import { scrypt } from 'node:crypto';
const hashPassword = promisify(scrypt);
const production = process.argv.includes('--production');
const port = Number(process.env.PORT || 5173);
mkdirSync('data', {recursive:true});
const db = new DatabaseSync(process.env.DB_PATH || 'data/eats.sqlite');
db.exec(`PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL;
 CREATE TABLE IF NOT EXISTS users(id INTEGER PRIMARY KEY, name TEXT NOT NULL, email TEXT UNIQUE NOT NULL, hash TEXT NOT NULL, salt TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS sessions(token TEXT PRIMARY KEY, user_id INTEGER REFERENCES users(id), expires INTEGER);
 CREATE TABLE IF NOT EXISTS restaurants(id INTEGER PRIMARY KEY, name TEXT, cuisine TEXT, area TEXT, description TEXT, website TEXT, initials TEXT);
 CREATE TABLE IF NOT EXISTS reviews(id INTEGER PRIMARY KEY, restaurant_id INTEGER REFERENCES restaurants(id), user_id INTEGER REFERENCES users(id), rating INTEGER CHECK(rating BETWEEN 1 AND 5), body TEXT, created TEXT, sample INTEGER DEFAULT 0, UNIQUE(restaurant_id,user_id));`);
const catalog = [
 [1,'Cabo Fish Taco','Mexican','South Main Street','Coastal flavors, specialty tacos, and a little Baja spirit in downtown Blacksburg.','https://www.cabofishtaco.com/blacksburg/','CF'],
 [2,'Gillies','Vegetarian','Blacksburg','A local gathering place with vegetarian dishes and seasonal ingredients.','https://gilliesrestaurant.com/','G'],
 [3,'Our Daily Bread','Bakery & bistro','Blacksburg','Fresh-baked breads, pastries, and French-inspired bistro fare.','https://www.odbb.com/blacksburg','ODB'],
 [4,'Zeppoli’s','Italian','University City Boulevard','House-made pasta and classic Italian cooking, right here in Blacksburg.','https://www.zeppolis.com/our-story','Z'],
 [5,'Blacksburg Wine Lab','Small plates','Gilbert Street','Cheeses, charcuterie, sandwiches, and a menu built around local producers.','https://www.winelab.com/eat','WL']
];
for (const r of catalog) db.prepare('INSERT OR IGNORE INTO restaurants VALUES(?,?,?,?,?,?,?)').run(...r);
const nearbyCatalog=JSON.parse(readFileSync(new URL('./restaurant-catalog.json',import.meta.url),'utf8'));
const nearbyById=new Map(nearbyCatalog.entries.map(r=>[r.id,r]));
for(const r of nearbyCatalog.entries)db.prepare('INSERT OR IGNORE INTO restaurants VALUES(?,?,?,?,?,?,?)').run(r.id,r.name,r.cuisine,r.area,r.description,r.website,r.initials);
const center=nearbyCatalog.center;
const radians=n=>n*Math.PI/180;
const distanceMiles=(a,b,c,d)=>3958.7613*2*Math.asin(Math.sqrt(Math.sin(radians(c-a)/2)**2+Math.cos(radians(a))*Math.cos(radians(c))*Math.sin(radians(d-b)/2)**2));
if (!db.prepare('SELECT id FROM users WHERE email=?').get('seed-1@sample.invalid')) {
 const names=['Alex M.','Jordan P.','Sam R.','Taylor K.'];
 const comments=['A lovely spot to catch up with friends. I would happily come back.','Really enjoyed my meal. A nice change from my usual routine.','A good experience overall, though it was a little busy when we visited.','One of my favorite stops for a relaxed meal around town.'];
 names.forEach((name,i)=>{
  const salt=randomBytes(16).toString('hex');
  const id=Number(db.prepare('INSERT INTO users(name,email,hash,salt) VALUES(?,?,?,?)').run(name,`seed-${i+1}@sample.invalid`,scryptSync(randomBytes(32),salt,64).toString('hex'),salt).lastInsertRowid);
  catalog.forEach((r,j)=>db.prepare('INSERT INTO reviews(restaurant_id,user_id,rating,body,created,sample) VALUES(?,?,?,?,?,1)').run(r[0],id, [5,4,4,5,3][(i+j)%5],comments[i],new Date(Date.now()-(i+1)*86400000).toISOString()));
 });
}
const features=createFeatures(db);
const vite=production?null:await (await import('vite')).createServer({server:{middlewareMode:true,hmr:{port:port+20000},fs:{deny:['.env','.env.*','*.{crt,pem}','**/.git/**','**/data/**','**/tmp/**','**/*.sqlite*']}},appType:'spa'});
const tokenHash=t=>createHash('sha256').update(t).digest('hex');
const publicUser=u=>u?{id:u.id,name:u.name,email:u.email}:null;
const limits=new Map();
function fail(message,status=400){throw Object.assign(new Error(message),{status});}
async function body(req,limit=12000){let text='';for await(const chunk of req){text+=chunk;if(text.length>limit)fail('Request is too large.',413);}try{return JSON.parse(text||'{}')}catch{fail('Invalid JSON.')}}
function getUser(req){const token=req.headers.cookie?.match(/(?:^|; )session=([a-f0-9]+)/)?.[1];return token?db.prepare('SELECT users.* FROM users JOIN sessions ON users.id=sessions.user_id WHERE token=? AND expires>?').get(tokenHash(token),Date.now()):null;}
function session(res,id){const token=randomBytes(32).toString('hex');db.prepare('DELETE FROM sessions WHERE expires<?').run(Date.now());db.prepare('INSERT INTO sessions VALUES(?,?,?)').run(tokenHash(token),id,Date.now()+7*86400000);res.setHeader('Set-Cookie',`session=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=604800${process.env.COOKIE_SECURE==='1'?'; Secure':''}`);}
const server=http.createServer(async(req,res)=>{
 const url=new URL(req.url,'http://localhost');
 if(!url.pathname.startsWith('/api/')){
  if(vite)return vite.middlewares(req,res);
  let path=resolve('dist','.'+decodeURIComponent(url.pathname));
  const root=resolve('dist');
  if(path!==root&&!path.startsWith(root+'\\')&&!path.startsWith(root+'/')){res.writeHead(403);return res.end();}
  if(!existsSync(path)||!extname(path))path=resolve('dist/index.html');
  const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml'};
  try{res.setHeader('Content-Type',types[extname(path)]||'application/octet-stream');res.end(readFileSync(path));}catch{res.writeHead(404);res.end('Run npm run build before starting production.');}return;
 }
 res.setHeader('Content-Type','application/json');res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');
 const send=(value,status=200)=>{res.writeHead(status);res.end(JSON.stringify(value));};
 try{
  if(req.method!=='GET'&&req.headers.origin&&new URL(req.headers.origin).host!==req.headers.host)fail('Request origin is not allowed.',403);
  const user=getUser(req);
  if(await features.handle(req,res,url,user,send,body,fail))return;
  if(url.pathname==='/api/me'&&req.method==='GET')return send(publicUser(user));
  if(url.pathname==='/api/my-reviews'&&req.method==='GET'){
   if(!user)fail('Sign in to see your reviews.',401);
   return send(db.prepare('SELECT v.*, r.name restaurant_name, r.cuisine restaurant_cuisine FROM reviews v JOIN restaurants r ON r.id=v.restaurant_id WHERE v.user_id=? ORDER BY v.created DESC').all(user.id));
  }
  if(url.pathname==='/api/restaurants'&&req.method==='GET'){
   const q=(url.searchParams.get('q')||'').trim().toLowerCase();
   return send(db.prepare('SELECT r.*, ROUND(AVG(v.rating),1) rating, COUNT(v.id) count FROM restaurants r LEFT JOIN reviews v ON r.id=v.restaurant_id GROUP BY r.id ORDER BY r.id').all().map(r=>{
    const place={...r,...restaurantLocations[r.id],...nearbyById.get(r.id)};
    return features.enrich({...place,distance_miles:place.distance_miles??Math.round(distanceMiles(center.lat,center.lng,place.lat,place.lng)*10)/10},user);
   }).filter(r=>Number.isFinite(r.distance_miles)&&r.distance_miles<=10&&`${r.name} ${r.cuisine} ${r.area} ${r.address||''} ${r.description} ${r.tags.join(' ')}`.toLowerCase().includes(q)));
  }
  const match=url.pathname.match(/^\/api\/restaurants\/(\d+)\/reviews$/);
  if(match){
   const id=Number(match[1]);if(!db.prepare('SELECT id FROM restaurants WHERE id=?').get(id))fail('Restaurant not found.',404);
   if(req.method==='GET')return send(db.prepare('SELECT v.*,u.name FROM reviews v JOIN users u ON u.id=v.user_id WHERE restaurant_id=? ORDER BY created DESC, v.id DESC').all(id));
   if(!user)fail('Sign in to share your experience.',401);
   if(req.method==='POST'){
    const data=await body(req);const review=typeof data.body==='string'?data.body.trim():'';
    features.validate(data,fail);
    if(!Number.isInteger(data.rating)||data.rating<1||data.rating>5)fail('Choose a rating from 1 to 5.');
    if(review.length<10||review.length>1000)fail('Write a review between 10 and 1,000 characters.');
    db.prepare('INSERT INTO reviews(restaurant_id,user_id,rating,body,created) VALUES(?,?,?,?,?) ON CONFLICT(restaurant_id,user_id) DO UPDATE SET rating=excluded.rating,body=excluded.body,created=excluded.created').run(id,user.id,data.rating,review,new Date().toISOString());features.save(id,user.id,data);return send({ok:true});
   }
   if(req.method==='DELETE'){db.prepare('DELETE FROM reviews WHERE restaurant_id=? AND user_id=?').run(id,user.id);return send({ok:true});}
  }
  if(req.method==='POST'&&['/api/login','/api/register','/api/demo'].includes(url.pathname)){
   const key=req.socket.remoteAddress;const now=Date.now();const attempts=(limits.get(key)||[]).filter(t=>t>now-60000);if(attempts.length>=20)fail('Too many attempts. Please try again in a minute.',429);attempts.push(now);limits.set(key,attempts);
   const data=await body(req);
   if(url.pathname==='/api/demo'){
    const salt=randomBytes(16).toString('hex');const email=`demo-${randomBytes(8).toString('hex')}@sample.invalid`;
    const result=db.prepare('INSERT INTO users(name,email,hash,salt) VALUES(?,?,?,?)').run('Demo Foodie',email,(await hashPassword(randomBytes(32),salt,64)).toString('hex'),salt);const u=db.prepare('SELECT * FROM users WHERE id=?').get(Number(result.lastInsertRowid));session(res,u.id);return send(publicUser(u));
   }
   const email=typeof data.email==='string'?data.email.trim().toLowerCase():'';const password=typeof data.password==='string'?data.password:'';
   if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||email.length>254)fail('Enter a valid email address.');
   if(password.length<8||password.length>128)fail('Use a password between 8 and 128 characters.');
   let u=db.prepare('SELECT * FROM users WHERE email=?').get(email);
   if(url.pathname==='/api/register'){
    const name=typeof data.name==='string'?data.name.trim():'';if(name.length<2||name.length>50)fail('Use a display name between 2 and 50 characters.');
    if(u)fail('An account with this email already exists. Try signing in.',409);
    const salt=randomBytes(16).toString('hex');const hash=(await hashPassword(password,salt,64)).toString('hex');
    try{db.prepare('INSERT INTO users(name,email,hash,salt) VALUES(?,?,?,?)').run(name,email,hash,salt);}catch(error){if(String(error).includes('UNIQUE'))fail('An account with this email already exists.',409);throw error;}
    u=db.prepare('SELECT * FROM users WHERE email=?').get(email);
   }else{
    const hash=await hashPassword(password,u?.salt||'missing-account',64);
    if(!u||!timingSafeEqual(hash,Buffer.from(u.hash,'hex')))fail('Email or password is incorrect.',401);
   }
   session(res,u.id);return send(publicUser(u));
  }
  if(url.pathname==='/api/logout'&&req.method==='POST'){
   const token=req.headers.cookie?.match(/(?:^|; )session=([a-f0-9]+)/)?.[1];if(token)db.prepare('DELETE FROM sessions WHERE token=?').run(tokenHash(token));res.setHeader('Set-Cookie','session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0');return send({ok:true});
  }
  fail('Not found.',404);
 }catch(error){if(!error.status)console.error(error);send({error:error.status?error.message:'Something went wrong. Please try again.'},error.status||500);}
});
server.listen(port,'127.0.0.1',()=>console.log(`Blacksburg Eats is ready at http://localhost:${port}`));
