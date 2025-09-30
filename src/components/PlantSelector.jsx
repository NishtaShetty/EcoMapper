import React, { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { MapContainer, TileLayer } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import parseGeoraster from 'georaster';
import GeoRasterLayer from 'georaster-layer-for-leaflet';

const PLANTS = [
  { slug: 'Aegle_marmelos', name: 'Indian Bael' },
  { slug: 'Azadirachta_indica', name: 'Neam' },
  { slug: 'Butea_monosperma', name: 'Flame of the forest' },
  { slug: 'Dalbergia_sissoo', name: 'Indian Rosewood' },
  { slug: 'Ficus_religiosa', name: 'Peepal Tree' },
  { slug: 'Santalum_album', name: 'Sandalwood' },
];

export default function PlantSelector() {
  const [available, setAvailable] = useState({});
  const [previewSlug, setPreviewSlug] = useState(null);
  const mapRef = useRef(null);
  const [loadingRaster, setLoadingRaster] = useState(false);
  const [rasterError, setRasterError] = useState(null);
  const [overlayOpacities, setOverlayOpacities] = useState({ ndvi: 0.7 });
  const rasterLayerRef = useRef(null);

  // Clean up raster layer when component unmounts
  useEffect(() => {
    return () => {
      if (rasterLayerRef.current && mapRef.current) {
        try {
          mapRef.current.removeLayer(rasterLayerRef.current);
        } catch (e) {
          console.warn('Error removing raster layer:', e);
        }
        rasterLayerRef.current = null;
      }
    };
  }, []);

  // Load raster data when preview slug changes
  useEffect(() => {
    let cancelled = false;

    async function loadRaster() {
      if (!previewSlug) {
        // Clear existing raster when no preview
        if (rasterLayerRef.current && mapRef.current) {
          try {
            mapRef.current.removeLayer(rasterLayerRef.current);
          } catch (e) {
            console.warn('Error removing raster layer:', e);
          }
          rasterLayerRef.current = null;
        }
        return;
      }

      // Wait for map to be ready with proper checking
      if (!mapRef.current || !mapRef.current.getContainer()) {
        console.log('Map not ready yet, retrying...');
        setTimeout(() => loadRaster(), 100);
        return;
      }

      setLoadingRaster(true);
      setRasterError(null);
      console.log('Starting raster load for:', previewSlug);

      try {
        const url = `/plants/Maps/${previewSlug}.tif`;
        console.log('Fetching raster from:', url);
        
        const res = await fetch(url);
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        }

        const arrayBuffer = await res.arrayBuffer();
        console.log('✓ Raster downloaded:', arrayBuffer.byteLength, 'bytes');
        
        if (arrayBuffer.byteLength === 0) {
          throw new Error('Downloaded file is empty');
        }
        
        console.log('Parsing georaster...');
        const georaster = await parseGeoraster(arrayBuffer);
        console.log('✓ Georaster parsed successfully:', {
          dimensions: `${georaster.width}x${georaster.height}`,
          bounds: `[${georaster.xmin}, ${georaster.ymin}] to [${georaster.xmax}, ${georaster.ymax}]`,
          valueRange: `${georaster.mins} to ${georaster.maxs}`,
          noDataValue: georaster.noDataValue,
          projection: georaster.projection
        });
        
        if (cancelled) return;

        // Remove existing layer
        if (rasterLayerRef.current && mapRef.current) {
          try {
            mapRef.current.removeLayer(rasterLayerRef.current);
            console.log('✓ Previous layer removed');
          } catch (e) {
            console.warn('Error removing previous layer:', e);
          }
        }

        // Simple but effective color mapping
        const pixelValuesToColorFn = (values) => {
          const raw = Array.isArray(values) ? values[0] : values;
          
          // Handle no-data values
          if (raw == null || isNaN(raw) || raw === georaster.noDataValue) {
            return null; // Transparent for no data
          }

          // Get min/max values
          const mins = Array.isArray(georaster.mins) ? georaster.mins[0] : georaster.mins;
          const maxs = Array.isArray(georaster.maxs) ? georaster.maxs[0] : georaster.maxs;
          
          // Normalize to 0-1 range
          let normalized;
          if (maxs === mins || maxs == null || mins == null) {
            normalized = 0.5;
          } else {
            normalized = (raw - mins) / (maxs - mins);
            normalized = Math.max(0, Math.min(1, normalized));
          }

          // Strong, visible colors
          if (normalized < 0.5) return '#FF0000'; // Red
          return '#00FF00'; // green
        };

        console.log('Creating GeoRasterLayer...');
        const layer = new GeoRasterLayer({
          georaster,
          opacity: overlayOpacities.ndvi,
          pixelValuesToColorFn,
          resolution: 256,
          debugLevel: 0
        });

        rasterLayerRef.current = layer;
        console.log('✓ GeoRasterLayer created');
        
        const map = mapRef.current;
        if (map) {
          console.log('Adding layer to map...');
          layer.addTo(map);
          console.log('✓ Layer added to map');
          
          // Fit to bounds
          setTimeout(() => {
            try {
              const bounds = [[georaster.ymin, georaster.xmin], [georaster.ymax, georaster.xmax]];
              console.log('Fitting to bounds:', bounds);
              map.fitBounds(bounds, { padding: [10, 10] });
              map.invalidateSize();
              console.log('✓ Map fitted to raster bounds');
            } catch (e) {
              console.warn('Error fitting bounds:', e);
            }
          }, 100);
        }
        
      } catch (err) {
        console.error('❌ Error loading raster:', err);
        setRasterError(`Failed to load raster: ${err.message}`);
      } finally {
        setLoadingRaster(false);
      }
    }

    // Start loading with a small delay
    const timer = setTimeout(() => loadRaster(), 300);
    
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [previewSlug, overlayOpacities.ndvi]);

  // Update layer opacity when opacity changes
  useEffect(() => {
    if (rasterLayerRef.current) {
      rasterLayerRef.current.setOpacity(overlayOpacities.ndvi);
    }
  }, [overlayOpacities.ndvi]);

  useEffect(() => {
    const probes = PLANTS.map(p => {
      const png = `/plants/photos/${p.slug}.png`;
      const tif = `/plants/Maps/${p.slug}.tif`;
      const csv = `/plants/csvfile/${p.slug}.csv`;
      
      const check = async url => {
        try {
          const res = await fetch(url, { method: 'HEAD' });
          if (res && res.ok) return url;
        } catch (e) {
          try {
            const r2 = await fetch(url, { method: 'GET' });
            if (r2 && r2.ok) return url;
          } catch (e2) {
            return null;
          }
        }
        return null;
      };

      return Promise.all([check(png), check(tif), check(csv)]).then(
        ([pngOk, tifOk, csvOk]) => ({
          slug: p.slug,
          png: pngOk,
          tif: tifOk,
          csv: csvOk,
        })
      );
    });

    Promise.all(probes).then(results => {
      const map = {};
      results.forEach(r => {
        map[r.slug] = { png: r.png, tif: r.tif, csv: r.csv };
      });
      setAvailable(map);
    });
  }, []);

  return (
    <div className="p-4 h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold">
            Plant species and recommended sites
          </h2>
          <p className="text-sm text-zinc-500">
            Select a species to preview its suitability map and download
            coordinates.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/"
            className="px-3 py-2 rounded-md border hover:bg-zinc-50"
          >
            Back to Map
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1 overflow-auto">
        {PLANTS.map(p => {
          const avail = available[p.slug] || {};
          const imgSrc = avail.png || '/plants/photos/placeholder.png';
          const mapHref = avail.tif || null;
          const csvHref = avail.csv || null;

          return (
            <div
              key={p.slug}
              className="border rounded-lg p-3 bg-white/70 dark:bg-zinc-800/60 shadow-sm"
            >
              <div className="flex items-start gap-3">
                <img
                  src={imgSrc}
                  alt={`${p.name} preview`}
                  className="w-36 h-24 object-cover rounded-md border"
                />
                <div className="flex-1">
                  <h3 className="font-medium">{p.name}</h3>
                  <p className="text-sm text-zinc-500">
                    Pre-generated suitability map and CSV of point coordinates
                    available for download.
                  </p>

                  <div className="mt-3 flex gap-2">
                    {mapHref ? (
                      <button
                        onClick={() => setPreviewSlug(p.slug)}
                        className="px-3 py-2 rounded-md border bg-white/60 hover:bg-white"
                      >
                        View Map
                      </button>
                    ) : (
                      <button
                        disabled
                        className="px-3 py-2 rounded-md border bg-zinc-100 text-zinc-400"
                        title="Map not available"
                      >
                        Map N/A
                      </button>
                    )}

                    {csvHref ? (
                      <a
                        href={csvHref}
                        download={`${p.slug}.csv`}
                        className="px-3 py-2 rounded-md border bg-eco-green/10 text-eco-green hover:bg-eco-green/20"
                      >
                        Download CSV
                      </a>
                    ) : (
                      <button
                        disabled
                        className="px-3 py-2 rounded-md border bg-zinc-100 text-zinc-400"
                        title="CSV not available"
                      >
                        CSV N/A
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Map preview modal */}
      {previewSlug && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-[90%] h-[85%] bg-white dark:bg-zinc-900 rounded shadow-lg overflow-hidden">
            <div className="flex items-center justify-between p-3 border-b">
              <div className="text-sm font-medium">
                Preview: {PLANTS.find(p => p.slug === previewSlug)?.name || previewSlug}
              </div>
              <div className="flex items-center gap-2">
                {/* Opacity slider */}
                <div className="flex items-center gap-2 text-sm">
                  <span>Opacity:</span>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={overlayOpacities.ndvi}
                    onChange={(e) => setOverlayOpacities({
                      ...overlayOpacities,
                      ndvi: parseFloat(e.target.value)
                    })}
                    className="w-16"
                  />
                  <span>{Math.round(overlayOpacities.ndvi * 100)}%</span>
                </div>
                <a 
                  href={`/plants/Maps/${previewSlug}.tif`} 
                  download 
                  className="px-3 py-1 rounded border bg-eco-green/10 text-eco-green hover:bg-eco-green/20"
                >
                  Download .tif
                </a>
                <button 
                  onClick={() => setPreviewSlug(null)} 
                  className="px-3 py-1 rounded border hover:bg-zinc-50"
                >
                  Close
                </button>
              </div>
            </div>

            <div className="h-[calc(100%-56px)] relative">
              <MapContainer 
                ref={map => {
                  if (map && !mapRef.current) {
                    mapRef.current = map;
                    console.log('✓ Map instance set');
                  }
                }}
                center={[20, 78]} 
                zoom={5} 
                style={{ height: '100%', width: '100%', backgroundColor: '#f8f9fa' }}
                zoomControl={true}
                attributionControl={false}
              >
                {/* Light base map overlay */}
                <TileLayer 
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  opacity={0.3}
                />
              </MapContainer>

              {/* Status overlay */}
              {(loadingRaster || rasterError) && (
                <div className="absolute top-2 left-2 bg-white/90 rounded p-2 shadow text-sm z-[1000]">
                  {loadingRaster && (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                      Loading raster preview…
                    </div>
                  )}
                  {rasterError && (
                    <div className="text-red-600">
                      Error: {rasterError}
                    </div>
                  )}
                </div>
              )}

              {/* Legend */}
              <div className="absolute bottom-2 left-2 bg-white/90 rounded p-2 shadow text-xs z-[1000]">
                <div className="font-semibold mb-1">Suitability</div>
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-3 bg-red-500 rounded"></div>
                    <span>Not Suitable (0)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-3 bg-green-500 rounded"></div>
                    <span>Suitable (1)</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}