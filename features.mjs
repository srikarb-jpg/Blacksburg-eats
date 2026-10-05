export function createFeatures(db) {
 const categories=['food','service','atmosphere'];
 const columns=db.prepare('PRAGMA table_info(reviews)').all().map(c=>c.name);
 for(const name of categories)if(!columns.includes(name))db.exec(`ALTER TABLE reviews ADD COLUMN ${name} INTEGER CHECK(${name} BETWEEN 1 AND 5)`);
 db.exec(`CREATE TABLE IF NOT EXISTS favorites(user_id INTEGER REFERENCES users(id),restaurant_id INTEGER REFERENCES restaurants(id),PRIMARY KEY(user_id,restaurant_id));
 CREATE TABLE IF NOT EXISTS photos(id INTEGER PRIMARY KEY,restaurant_id INTEGER REFERENCES restaurants(id),user_id INTEGER REFERENCES users(id),caption TEXT NOT NULL,mime TEXT NOT NULL,image BLOB NOT NULL,created TEXT NOT NULL);`);
 const tags={1:['Seafood','Tacos'],2:['Vegetarian','Seasonal'],3:['Bakery','French-inspired'],4:['Italian','Pasta'],5:['Small plates','Local producers']};
 function enrich(r,user){return {...r,tags:tags[r.id]||r.tags||[],favorite:!!(user&&db.prepare('SELECT 1 FROM favorites WHERE user_id=? AND restaurant_id=?').get(user.id,r.id)),photo_count:db.prepare('SELECT COUNT(*) n FROM photos WHERE restaurant_id=?').get(r.id).n};}
 function validate(data,fail){for(const key of categories)if(data[key]!=null&&(!Number.isInteger(data[key])||data[key]<1||data[key]>5))fail(`${key} rating must be between 1 and 5.`);}
 function save(id,userId,data){db.prepare('UPDATE reviews SET food=?,service=?,atmosphere=? WHERE restaurant_id=? AND user_id=?').run(...categories.map(k=>data[k]??null),id,userId);}
 async function handle(req,res,url,user,send,body,fail){
  if(url.pathname==='/api/achievements'&&req.method==='GET'){
   if(!user)fail('Sign in to see your achievements.',401);
   const reviews=db.prepare('SELECT COUNT(*) n FROM reviews WHERE user_id=?').get(user.id).n;
   const photos=db.prepare('SELECT COUNT(*) n FROM photos WHERE user_id=?').get(user.id).n;
   const favorites=db.prepare('SELECT COUNT(*) n FROM favorites WHERE user_id=?').get(user.id).n;
   send([{name:'First bite',description:'Review your first restaurant',current:reviews,target:1},{name:'Local explorer',description:'Review three different restaurants',current:reviews,target:3},{name:'Around the Burg',description:'Review five different restaurants',current:reviews,target:5},{name:'Food photographer',description:'Share your first restaurant photo',current:photos,target:1},{name:'Saved a seat',description:'Save your first favorite',current:favorites,target:1}]);return true;
  }
  const favorite=url.pathname.match(/^\/api\/restaurants\/(\d+)\/favorite$/);
  if(favorite&&['PUT','DELETE'].includes(req.method)){
   if(!user)fail('Sign in to save favorites.',401);
   const id=Number(favorite[1]);if(!db.prepare('SELECT id FROM restaurants WHERE id=?').get(id))fail('Restaurant not found.',404);
   if(req.method==='PUT')db.prepare('INSERT OR IGNORE INTO favorites VALUES(?,?)').run(user.id,id);
   else db.prepare('DELETE FROM favorites WHERE user_id=? AND restaurant_id=?').run(user.id,id);
   send({ok:true});return true;
  }
  const gallery=url.pathname.match(/^\/api\/restaurants\/(\d+)\/photos$/);
  if(gallery){
   const id=Number(gallery[1]);if(!db.prepare('SELECT id FROM restaurants WHERE id=?').get(id))fail('Restaurant not found.',404);
   if(req.method==='GET'){send(db.prepare('SELECT p.id,p.user_id,p.caption,p.created,u.name FROM photos p JOIN users u ON u.id=p.user_id WHERE restaurant_id=? ORDER BY p.id DESC').all(id));return true;}
   if(req.method==='POST'){
    if(!user)fail('Sign in to share a photo.',401);
    const data=await body(req,1500000);
    if(typeof data.caption!=='string'||data.caption.trim().length<3||data.caption.trim().length>160)fail('Describe the photo in 3–160 characters.');
    const match=typeof data.image==='string'&&data.image.match(/^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/]+={0,2})$/);
    if(!match)fail('Choose a JPEG, PNG, or WebP photo.');
    const bytes=Buffer.from(match[2],'base64');
    if(bytes.length>1000000)fail('Photo must be smaller than 1 MB.',413);
    const valid=match[1]==='jpeg'?bytes[0]===255&&bytes[1]===216&&bytes[2]===255:match[1]==='png'?bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])):bytes.toString('ascii',0,4)==='RIFF'&&bytes.toString('ascii',8,12)==='WEBP';
    if(!valid)fail('That file is not a supported photo.');
    if(db.prepare('SELECT COUNT(*) n FROM photos WHERE user_id=? AND restaurant_id=?').get(user.id,id).n>=10)fail('You can share up to 10 photos per restaurant. Remove one to add another.');
    db.prepare('INSERT INTO photos(restaurant_id,user_id,caption,mime,image,created) VALUES(?,?,?,?,?,?)').run(id,user.id,data.caption.trim(),'image/'+match[1],bytes,new Date().toISOString());send({ok:true},201);return true;
   }
  }
  const photo=url.pathname.match(/^\/api\/photos\/(\d+)$/);
  if(photo){
   const p=db.prepare('SELECT * FROM photos WHERE id=?').get(Number(photo[1]));if(!p)fail('Photo not found.',404);
   if(req.method==='GET'){res.setHeader('Content-Type',p.mime);res.setHeader('Content-Length',p.image.length);res.end(Buffer.from(p.image));return true;}
   if(req.method==='DELETE'){if(!user)fail('Sign in to remove a photo.',401);if(p.user_id!==user.id)fail('You can only remove your own photos.',403);db.prepare('DELETE FROM photos WHERE id=?').run(p.id);send({ok:true});return true;}
  }
  return false;
 }
 return {enrich,validate,save,handle};
}
