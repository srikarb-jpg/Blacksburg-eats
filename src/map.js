import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import './map.css';

export function createRestaurantMap(openRestaurant) {
  const panel=document.querySelector('#map-panel');
  const container=document.querySelector('#restaurant-map');
  const toggle=document.querySelector('#toggle-map');
  const status=document.querySelector('#map-status');
  let map, markers, clusters, connectors, tiles, current=[], entries=[], previousIds='', tileFailed=false, clustered=false;

  function separatePins() {
    if(!map||clustered)return;
    connectors.clearLayers();
    const placed=[];
    entries.forEach(({marker,r})=>{
      const original=L.latLng(r.lat,r.lng);
      const point=map.latLngToContainerPoint(original);
      const size=map.getSize();
      const offsets=[[0,0]];
      for(const distance of [48,96,144])offsets.push([distance,0],[-distance,0],[0,distance],[0,-distance],[distance,distance],[-distance,distance],[distance,-distance],[-distance,-distance]);
      const shifted=offsets.map(([x,y])=>point.add([x,y])).find(p=>
        p.x>=20&&p.x<=size.x-20&&p.y>=48&&p.y<=size.y-8&&
        !placed.some(other=>other.distanceTo(p)<46)
      )||point;
      placed.push(shifted);
      const position=map.containerPointToLatLng(shifted);
      marker.setLatLng(position);
      if(!shifted.equals(point)){
        L.polyline([original,position],{color:'#652c3e',weight:2,interactive:false}).addTo(connectors);
        L.circleMarker(original,{radius:3,color:'#652c3e',fillOpacity:1,interactive:false}).addTo(connectors);
      }
    });
  }

  function fit() {
    if(!map || !current.length)return;
    map.invalidateSize();
    map.fitBounds(current.map(r=>[r.lat,r.lng]),{padding:[40,40],maxZoom:16,animate:false});
    separatePins();
  }
  function initialize() {
    if(map)return;
    map=L.map(container,{scrollWheelZoom:false,zoomControl:true}).setView([37.226,-80.416],14);
    map.attributionControl.setPrefix('<a href="https://leafletjs.com">Leaflet</a>');
    markers=L.layerGroup().addTo(map);
    clusters=L.markerClusterGroup({showCoverageOnHover:false,maxClusterRadius:48});
    connectors=L.layerGroup().addTo(map);
    map.on('zoomend',separatePins);
    tiles=L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{
      maxZoom:19,attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    });
    tiles.on('loading',()=>{tileFailed=false;});
    tiles.on('tileerror',()=>{tileFailed=true;status.hidden=false;});
    tiles.on('load',()=>{status.hidden=!tileFailed;});
    tiles.addTo(map);
    new ResizeObserver(()=>{map.invalidateSize();separatePins();}).observe(container);
  }
  function draw() {
    if(panel.hidden)return;
    initialize();
    markers.clearLayers();
    clusters.clearLayers();
    clustered=current.length>30;
    if(clustered){map.removeLayer(markers);clusters.addTo(map);}
    else{map.removeLayer(clusters);markers.addTo(map);}
    connectors.clearLayers();
    entries=[];
    current.forEach((r,index)=>{
      const name=`${r.name}: ${r.rating?r.rating.toFixed(1)+' out of 5':'not yet rated'}. Open details and reviews`;
      const marker=L.marker([r.lat,r.lng],{
        icon:L.divIcon({className:'restaurant-pin',html:`<span aria-hidden="true">${index+1}</span>`,iconSize:[34,42],iconAnchor:[17,42],tooltipAnchor:[0,-39]}),
        title:name,alt:name,keyboard:true,riseOnHover:true
      });
      marker.addTo(clustered?clusters:markers);
      const tooltip=document.createElement('span');tooltip.textContent=`${r.name} · ${r.rating?r.rating.toFixed(1)+' ★':'New'}`;
      marker.bindTooltip(tooltip,{direction:'top'});
      const prepareElement=()=>{
        const element=marker.getElement();if(!element)return;
        element.setAttribute('aria-label',name);
        element.dataset.restaurantId=r.id;
        element.onkeydown=e=>{if(e.key==='Enter'||e.key===' '||e.code==='Space'){
          e.preventDefault();e.stopPropagation();openRestaurant(r.id);
        }};
      };
      prepareElement();marker.on('add',prepareElement);
      marker.on('click',()=>{marker.closeTooltip();openRestaurant(r.id);});
      entries.push({marker,r});
    });
    const ids=current.map(r=>r.id).join(',');
    if(ids!==previousIds){fit();previousIds=ids;}
    separatePins();
    document.querySelector('#map-count').textContent=current.length?`${current.length} ${current.length===1?'restaurant':'restaurants'} on the map`:'No matching restaurants on the map';
    document.querySelector('#map-empty').hidden=current.length>0;
    document.querySelector('#fit-map').disabled=!current.length;
  }
  toggle.onclick=()=>{
    panel.hidden=!panel.hidden;toggle.setAttribute('aria-expanded',String(!panel.hidden));
    toggle.textContent=panel.hidden?'Show map':'Hide map';
    if(!panel.hidden){draw();fit();}
  };
  document.querySelector('#fit-map').onclick=fit;
  document.querySelector('#retry-map').onclick=()=>{status.hidden=true;tileFailed=false;tiles?.redraw();};
  return {update(restaurants){current=restaurants.filter(r=>Number.isFinite(r.lat)&&Number.isFinite(r.lng));draw();}};
}
