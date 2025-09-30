import React, { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, LayersControl, LayerGroup, useMap } from 'react-leaflet';
import L from 'leaflet';
import HeatmapLayer from './HeatmapLayer';
import 'leaflet/dist/leaflet.css';
import 'leaflet.heat/dist/leaflet-heat.js';

const { BaseLayer, Overlay } = LayersControl;

function ScaleAndLocate() {
  const map = useMap();

  useEffect(() => {
    L.control.scale().addTo(map);
  }, [map]);

  useEffect(() => {
    const locate = L.control({ position: 'topleft' });
    locate.onAdd = () => {
      const btn = L.DomUtil.create('button', 'leaflet-bar');
      btn.title = 'Locate me';
      btn.style.padding = '8px';
      btn.style.cursor = 'pointer';
      btn.innerHTML = '📍';
      btn.onclick = () => map.locate({ setView: true, maxZoom: 13 });
      return btn;
    };
    locate.addTo(map);
    return () => locate.remove();
  }, [map]);

  useEffect(() => {
    const onLocationFound = (e) => {
      L.circle(e.latlng, { radius: e.accuracy }).addTo(map);
    };
    map.on('locationfound', onLocationFound);
    return () => map.off('locationfound', onLocationFound);
  }, [map]);

  return null;
}

export default function MapView({ overlayState, filters, overlayOpacities, onMapClickInfo }) {
  const _apiBaseRaw = typeof import.meta !== 'undefined' ? (import.meta.env?.VITE_API_BASE ?? '') : '';
  const apiBase = String(_apiBaseRaw || '').replace(/\/$/, '');
  const apiUrl = (path) => {
    if (!path.startsWith('/')) path = `/${path}`;
    return apiBase ? `${apiBase}${path}` : path;
  };
  const fetchJsonFull = async (fullUrl) => {
    const res = await fetch(fullUrl);
    const ct = res.headers.get('content-type') || '';
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`Request failed ${res.status} ${res.statusText} for ${fullUrl} - body: ${text.slice(0,200)}`);
    }
    if (!ct.includes('application/json')) {
      const text = await res.text().catch(() => '');
      throw new Error(`Expected JSON but got '${ct}' from ${fullUrl} - first 200 chars: ${text.slice(0,200)}`);
    }
    return res.json();
  };

  const mapRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [backendError, setBackendError] = useState(null);
  const [heatPoints, setHeatPoints] = useState([]);

  const waterPoints = heatPoints.filter(p => !p.source || p._fallback);
  const openAQPoints = heatPoints.filter(p => p.source === 'openaq');
  const eonetPoints = heatPoints.filter(p => p.source === 'eonet');
  const usgsPoints = heatPoints.filter(p => p.source === 'usgs');
  const vegetationPoints = heatPoints.filter(p => p.source === 'vegetation');
  const climatePoints = heatPoints.filter(p => p.source === 'climate');

  // Poll heatpoints (water + external sources + vegetation + climate)
  useEffect(() => {
    let cancelled = false;
    const fetchPoints = async () => {
      try {
        setBackendError(null);
        const pts = await fetchJsonFull(apiUrl('/api/heatpoints?count=800'));
        let openAQ = [], eonet = [], usgs = [], vegetation = [], climate = [];
        if (overlayState?.openAQ) {
          try { openAQ = await fetchJsonFull(apiUrl('/api/external/openaq?country=IN&parameter=pm25&limit=500')); } catch (e) { console.warn('Failed to fetch OpenAQ', e); }
        }
        if (overlayState?.eonet) {
          try { eonet = await fetchJsonFull(apiUrl('/api/external/eonet-fires?days=30')); } catch (e) { console.warn('Failed to fetch EONET', e); }
        }
        if (overlayState?.usgs) {
          try { usgs = await fetchJsonFull(apiUrl('/api/external/usgs-quakes?feed=all_day')); } catch (e) { console.warn('Failed to fetch USGS', e); }
        }
        if (overlayState?.vegetation) {
          try { vegetation = await fetchJsonFull(apiUrl('/api/external/vegetation?count=400')); } catch (e) { console.warn('Failed to fetch vegetation', e); }
        }
        if (overlayState?.climate) {
          try { climate = await fetchJsonFull(apiUrl('/api/external/climate?parameter=temperature&count=400')); } catch (e) { console.warn('Failed to fetch climate', e); }
        }

        const merged = pts.concat(openAQ, eonet, usgs, vegetation, climate);
        const seen = new Set();
        const final = [];
        for (const p of merged) {
          const key = `${p.lat.toFixed(6)}:${p.lng.toFixed(6)}`;
          if (seen.has(key)) continue;
          seen.add(key);
          final.push(p);
        }
        if (!cancelled) { setHeatPoints(final); setBackendError(null); }
      } catch (err) {
        console.warn('Failed to fetch heatpoints', err);
        setBackendError(String(err?.message || err));
      }
    };
    fetchPoints();
    const t = setInterval(fetchPoints, 30_000);
    return () => { cancelled = true; clearInterval(t); };
  }, [overlayState]);

  const indiaBounds = [[8.4, 68.7], [37.6, 97.25]];

  const baseLayers = {
    'OpenStreetMap': (
      <TileLayer
        key="osm"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
    ),
    'Satellite': (
      <TileLayer
        key="satellite"
        attribution='Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
        url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
      />
    ),
    'Topographic': (
      <TileLayer
        key="topo"
        attribution='Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ, TomTom, Intermap, iPC, USGS, FAO, NPS, NRCAN, GeoBase, Kadaster NL, Ordnance Survey, Esri Japan, METI, Esri China (Hong Kong), and the GIS User Community'
        url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}"
      />
    )
  };

  return (
    <div id="eco-map-root" className="relative w-full h-full">
      {/* Legend */}
      <div className="absolute top-3 right-3 z-50">
        <div className="bg-white/95 dark:bg-zinc-900/80 px-3 py-2 rounded shadow-sm text-xs">
          <div className="font-semibold mb-1">Overlay legend</div>
          <div className="flex flex-col gap-1">
            <div><span style={{ background: 'linear-gradient(90deg,#0000ff,#00ffff,#00ff00,#ffff00,#ff0000)', display: 'inline-block', width: 40, height: 10 }}></span> Water Quality</div>
            <div><span style={{ background: 'linear-gradient(90deg,#d1fae5,#10b981,#065f46)', display: 'inline-block', width: 40, height: 10 }}></span> Vegetation (NDVI)</div>
            <div><span style={{ background: 'linear-gradient(90deg,#3b82f6,#facc15,#dc2626)', display: 'inline-block', width: 40, height: 10 }}></span> Climate (Temp)</div>
            <div><span style={{ background: 'linear-gradient(90deg,#22c55e,#f97316,#b91c1c)', display: 'inline-block', width: 40, height: 10 }}></span> Air Quality (PM2.5)</div>
            <div><span style={{ background: 'linear-gradient(90deg,#fee2e2,#f87171,#b91c1c)', display: 'inline-block', width: 40, height: 10 }}></span> Fires</div>
            <div><span style={{ background: 'linear-gradient(90deg,#bfdbfe,#06b6d4,#0f766e)', display: 'inline-block', width: 40, height: 10 }}></span> Earthquakes</div>
          </div>
        </div>
      </div>

      <MapContainer
        center={[22.5, 78.9]}
        zoom={5}
        minZoom={4}
        maxZoom={12}
        maxBounds={indiaBounds}
        style={{ width: '100%', height: '100%' }}
        ref={mapRef}
      >
        <LayersControl position="topright">
          {/* Base Layers */}
          <BaseLayer checked name="OpenStreetMap">
            {baseLayers.OpenStreetMap}
          </BaseLayer>
          <BaseLayer name="Satellite">
            {baseLayers.Satellite}
          </BaseLayer>
          <BaseLayer name="Topographic">
            {baseLayers.Topographic}
          </BaseLayer>

          {/* Overlay Layers */}
          <Overlay checked={overlayState?.water} name="Water Quality">
            <LayerGroup>
              <HeatmapLayer points={waterPoints} gradient={{ 0.0: '#0000ff', 0.25: '#00ffff', 0.5: '#00ff00', 0.75: '#ffff00', 1.0: '#ff0000' }} />
            </LayerGroup>
          </Overlay>
          <Overlay checked={overlayState?.vegetation} name="Vegetation (NDVI)">
            <LayerGroup>
              <HeatmapLayer points={vegetationPoints} gradient={{ 0.0: '#d1fae5', 0.4: '#10b981', 1.0: '#065f46' }} />
            </LayerGroup>
          </Overlay>
          <Overlay checked={overlayState?.climate} name="Climate (Temperature)">
            <LayerGroup>
              <HeatmapLayer points={climatePoints} gradient={{ 0.0: '#3b82f6', 0.5: '#facc15', 1.0: '#dc2626' }} />
            </LayerGroup>
          </Overlay>
          <Overlay checked={overlayState?.openAQ} name="Air Quality">
            <LayerGroup>
              <HeatmapLayer points={openAQPoints} gradient={{ 0.0: '#22c55e', 0.5: '#f97316', 1.0: '#b91c1c' }} />
            </LayerGroup>
          </Overlay>
          <Overlay checked={overlayState?.eonet} name="Fires">
            <LayerGroup>
              <HeatmapLayer points={eonetPoints} gradient={{ 0.0: '#fee2e2', 0.5: '#f87171', 1.0: '#b91c1c' }} />
            </LayerGroup>
          </Overlay>
          <Overlay checked={overlayState?.usgs} name="Earthquakes">
            <LayerGroup>
              <HeatmapLayer points={usgsPoints} gradient={{ 0.0: '#bfdbfe', 0.5: '#06b6d4', 1.0: '#0f766e' }} />
            </LayerGroup>
          </Overlay>
        </LayersControl>
        <ScaleAndLocate />
      </MapContainer>
    </div>
  );
}
