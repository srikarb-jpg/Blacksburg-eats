const addresses=['117 South Main Street','153 College Avenue','1329 South Main Street','810 University City Boulevard','223 Gilbert Street'];
for(const address of addresses){
 const url=new URL('https://geocoding.geo.census.gov/geocoder/locations/onelineaddress');
 url.search=new URLSearchParams({address:address+', Blacksburg, VA',benchmark:'Public_AR_Current',format:'json'});
 const response=await fetch(url,{signal:AbortSignal.timeout(20000)});
 const data=await response.json();console.log(JSON.stringify({address,matches:data.result?.addressMatches}));
}
