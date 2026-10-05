import './features.css';
export function createFeatures({api,getUser,auth,escape,notify,openDialog,details,refresh}){
 const labels={food:'Food quality',service:'Service',atmosphere:'Atmosphere'};
 let favoritesOnly=false,selectedTag='';
 const toolbar=document.createElement('div');toolbar.className='feature-toolbar';
 toolbar.innerHTML='<div class="collection-actions"><button class="button outline small" id="favorites-filter" aria-pressed="false">♡ Favorites</button><button class="button outline small" id="achievements">☆ Achievements</button></div><div class="tag-selector"><label for="tag-filter">Restaurant tag</label><select id="tag-filter"><option value="">All tags</option></select></div>';
 document.querySelector('.search-row').after(toolbar);
 const select=toolbar.querySelector('select');
 select.onchange=()=>{selectedTag=select.value;refresh();};
 document.querySelector('#favorites-filter').onclick=()=>{
  const run=()=>{favoritesOnly=!favoritesOnly;document.querySelector('#favorites-filter').setAttribute('aria-pressed',String(favoritesOnly));refresh();};
  if(!getUser())return auth('login',run);run();
 };
 document.querySelector('#achievements').onclick=showAchievements;
 async function showAchievements(){
  if(!getUser())return auth('login',showAchievements);
  openDialog('<h2 id="modal-title">Your achievements</h2><p role="status">Loading your progress…</p>');
  try{const badges=await api('/achievements');openDialog(`<div class="eyebrow">YOUR LOCAL JOURNEY</div><h2 id="modal-title">Your achievements</h2><p class="dialog-intro">Small discoveries add up. Every feature is available from day one. Progress reflects your current reviews, photos, and favorites.</p><div class="badge-grid">${badges.map(b=>`<article class="badge ${b.current>=b.target?'earned':''}"><span aria-hidden="true">${b.current>=b.target?'★':'☆'}</span><h3>${escape(b.name)}</h3><p>${escape(b.description)}</p><progress aria-label="${escape(b.name)} progress" value="${Math.min(b.current,b.target)}" max="${b.target}"></progress><p>${b.current>=b.target?'Unlocked':`${b.current} / ${b.target}`}</p></article>`).join('')}</div>`);}catch(e){notify(e.message);openDialog('<h2 id="modal-title">Couldn’t load achievements</h2><p>Please close this dialog and try again.</p>');}
 }
 function filter(rows){
  if(!getUser()){favoritesOnly=false;document.querySelector('#favorites-filter').setAttribute('aria-pressed','false');}
  const tags=new Set([...select.options].map(o=>o.value).filter(Boolean));rows.forEach(r=>(r.tags||[]).forEach(t=>tags.add(t)));
  select.innerHTML='<option value="">All tags</option>'+[...tags].sort().map(t=>`<option ${selectedTag===t?'selected':''}>${escape(t)}</option>`).join('');
  return rows.filter(r=>(!favoritesOnly||r.favorite)&&(!selectedTag||r.tags.includes(selectedTag)));
 }
 function reset(){favoritesOnly=false;selectedTag='';select.value='';document.querySelector('#favorites-filter').setAttribute('aria-pressed','false');}
 function favoriteButton(r){return `<button class="favorite-button" data-favorite="${r.id}" aria-pressed="${r.favorite}" aria-label="${r.favorite?'Remove':'Save'} ${escape(r.name)} ${r.favorite?'from':'to'} favorites">${r.favorite?'♥':'♡'}</button>`;}
 function tagsHTML(r){return `<div class="restaurant-tags">${r.tags.map(t=>`<span>${escape(t)}</span>`).join('')}</div>`;}
 function bindFavorite(button,r,after){button.onclick=()=>{
  const save=async()=>{button.disabled=true;try{const latest=(await api('/restaurants')).find(x=>x.id===r.id);await api(`/restaurants/${r.id}/favorite`,{method:latest.favorite?'DELETE':'PUT'});await refresh();if(after)await after();notify(latest.favorite?'Removed from favorites.':'Saved to your favorites.');}catch(e){notify(e.message);}finally{button.disabled=false;}};
  if(!getUser())return auth('login',save);save();
 };}
 function cards(rows){document.querySelectorAll('.restaurant-card').forEach(card=>{
  const id=Number(card.querySelector('[data-restaurant]').dataset.restaurant);const r=rows.find(x=>x.id===id);if(!r)return;
  card.querySelector('.card-top').insertAdjacentHTML('beforeend',favoriteButton(r));
  card.querySelector('.restaurant-description').insertAdjacentHTML('afterend',tagsHTML(r));
  if(r.photo_count)card.querySelector('.restaurant-location').insertAdjacentHTML('afterend',`<p class="photo-count">${r.photo_count} community ${r.photo_count===1?'photo':'photos'}</p>`);
  bindFavorite(card.querySelector('[data-favorite]'),r);
 });}
 function editor(own){
  const row=document.createElement('div');row.className='category-inputs';row.innerHTML='<h4>Rate the details <span>(optional)</span></h4><p>Overall rating is your separate assessment of the visit.</p>'+Object.entries(labels).map(([key,label])=>`<label for="rating-${key}">${label}<select id="rating-${key}" name="${key}" aria-label="${label}"><option value="">Not rated</option>${[1,2,3,4,5].map(n=>`<option value="${n}" ${own?.[key]===n?'selected':''}>${n} / 5</option>`).join('')}</select></label>`).join('');
  document.querySelector('#review-form fieldset').after(row);
 }
 function categoryData(form){return Object.fromEntries(Object.keys(labels).map(k=>[k,form.get(k)?Number(form.get(k)):null]));}
 async function detail(r,reviews){
  const summary=document.querySelector('.review-summary');
  summary.insertAdjacentHTML('afterend',`<section class="category-summary" aria-label="Category ratings">${Object.entries(labels).map(([key,label])=>{const values=reviews.filter(v=>v[key]!=null);return `<div><span>${label}</span><strong>${values.length?(values.reduce((s,v)=>s+v[key],0)/values.length).toFixed(1)+' / 5':'Not rated'}</strong><small>${values.length} ratings</small></div>`;}).join('')}</section>`);
  document.querySelector('.dialog-intro').insertAdjacentHTML('afterend',`<div class="detail-extras">${tagsHTML(r)}${favoriteButton(r)}</div>`);
  bindFavorite(document.querySelector('#modal [data-favorite]'),r,()=>details(r.id));
  document.querySelectorAll('.review-list .review').forEach((node,i)=>{const v=reviews[i];node.insertAdjacentHTML('beforeend',`<p class="review-categories">${Object.entries(labels).filter(([key])=>v[key]!=null).map(([key,label])=>`${label}: ${v[key]}/5`).join(' · ')}</p>`);});
  const gallery=document.createElement('section');gallery.className='photo-section';gallery.id='photo-section';gallery.innerHTML='<h3>At the restaurant</h3><p role="status">Loading photos…</p>';
  document.querySelector('.review-heading').before(gallery);
  await loadPhotos(r.id,gallery);
 }
 async function loadPhotos(id,section){
  try{const photos=await api(`/restaurants/${id}/photos`);if(!section.isConnected)return;
   section.innerHTML=`<div class="photo-heading"><h3>At the restaurant</h3><button class="button outline small" id="add-photo">Add photo</button></div><p class="field-hint">Community photos. Share your own food, interior, or exterior photos.</p><div class="photo-gallery">${photos.length?photos.map(p=>`<figure><a href="/api/photos/${p.id}" target="_blank" rel="noopener" aria-label="Open photo: ${escape(p.caption)} (new tab)"><img loading="lazy" src="/api/photos/${p.id}" alt="${escape(p.caption)}"></a><figcaption>${escape(p.caption)}<small>By ${escape(p.name)}</small></figcaption>${p.user_id===getUser()?.id?`<button class="text-button" data-remove-photo="${p.id}">Remove photo</button><div class="photo-confirm"></div>`:''}</figure>`).join(''):'<p class="photo-empty">No photos yet. Help someone picture their first visit.</p>'}</div><div id="photo-editor"></div>`;
   section.querySelector('#add-photo').onclick=()=>getUser()?photoForm(id,section):auth('login',()=>details(id).then(()=>document.querySelector('#add-photo')?.click()));
   section.querySelectorAll('[data-remove-photo]').forEach(button=>button.onclick=()=>{
    const confirm=button.nextElementSibling;confirm.innerHTML='<p>Remove this photo permanently?</p><button class="text-button" data-yes>Yes, remove</button> <button class="text-button" data-no>Keep photo</button>';
    confirm.querySelector('[data-no]').onclick=()=>confirm.innerHTML='';
    confirm.querySelector('[data-yes]').onclick=async()=>{try{await api('/photos/'+button.dataset.removePhoto,{method:'DELETE'});await refresh();await loadPhotos(id,section);notify('Photo removed.');}catch(e){notify(e.message);}};
   });
  }catch(e){if(section.isConnected){section.innerHTML='<h3>Photos unavailable</h3><button class="text-button">Retry photos</button>';section.querySelector('button').onclick=()=>loadPhotos(id,section);}}
 }
 function photoForm(id,section){
  const target=section.querySelector('#photo-editor');target.innerHTML='<form class="photo-form"><label for="photo-file">Choose a photo</label><input id="photo-file" type="file" accept="image/jpeg,image/png,image/webp" required aria-describedby="photo-help"><p id="photo-help" class="field-hint">JPEG, PNG, or WebP, up to 10 MB. Photos are resized before upload.</p><label for="photo-caption">Describe the photo</label><input id="photo-caption" minlength="3" maxlength="160" required placeholder="For example: our tacos on the patio"><p class="field-hint">This description also helps people using screen readers.</p><p class="form-error" role="alert"></p><button class="button primary" type="submit">Share photo</button> <button class="text-button" type="button">Cancel</button></form>';
  target.querySelector('button[type=button]').onclick=()=>target.innerHTML='';target.querySelector('input').focus();
  target.querySelector('form').onsubmit=async e=>{
   e.preventDefault();const button=e.submitter;button.disabled=true;const error=target.querySelector('[role=alert]');error.textContent='';
   try{const file=target.querySelector('#photo-file').files[0];if(!file||!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>10*1024*1024)throw new Error('Choose a JPEG, PNG, or WebP photo smaller than 10 MB.');
    const bitmap=await createImageBitmap(file);const scale=Math.min(1,1600/Math.max(bitmap.width,bitmap.height));const canvas=document.createElement('canvas');canvas.width=Math.round(bitmap.width*scale);canvas.height=Math.round(bitmap.height*scale);const ctx=canvas.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(bitmap,0,0,canvas.width,canvas.height);bitmap.close();
    let image=canvas.toDataURL('image/jpeg',.8);if(image.length>1300000)image=canvas.toDataURL('image/jpeg',.5);
    await api(`/restaurants/${id}/photos`,{method:'POST',body:JSON.stringify({image,caption:target.querySelector('#photo-caption').value})});await refresh();await loadPhotos(id,section);notify('Photo shared. Thank you!');
   }catch(err){error.textContent=err.message;button.disabled=false;}
  };
 }
 return {filter,reset,cards,detail,editor,categoryData};
}
