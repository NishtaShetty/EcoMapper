import { useEffect, useRef, useCallback } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet.heat';

export default function HeatmapLayer({ 
  points = [], 
  radius = 25, 
  blur = 15, 
  max = 1.0, 
  maxZoom = 18, 
  gradient,
  debounceMs = 150, 
  intensityScale = 1.8 
}) {
  const map = useMap();
  const heatRef = useRef(null);
  const fallbackRef = useRef(null);
  const updateTimer = useRef(null);
  const isMounted = useRef(true);

  // Simple radius calculation
  const computeRadius = useCallback((base, zoom) => {
    const scale = Math.pow(1.3, zoom - 7);
    return Math.max(2, Math.round(base * scale));
  }, []);

  // Cleanup function
  const cleanupLayers = useCallback(() => {
    if (heatRef.current) {
      try {
        if (map && map.hasLayer(heatRef.current)) {
          map.removeLayer(heatRef.current);
        }
      } catch (e) {
        console.warn('Error removing heat layer:', e);
      }
      heatRef.current = null;
    }

    if (fallbackRef.current) {
      try {
        if (map && map.hasLayer(fallbackRef.current)) {
          map.removeLayer(fallbackRef.current);
        }
      } catch (e) {
        console.warn('Error removing fallback layer:', e);
      }
      fallbackRef.current = null;
    }
  }, [map]);

  // Create or update heatmap
  const updateHeatmap = useCallback(() => {
    if (!map || !isMounted.current) return;

    try {
      // Process points
      const validPoints = points.filter(p => p && typeof p.lat === 'number' && typeof p.lng === 'number');
      
      if (validPoints.length === 0) {
        cleanupLayers();
        return;
      }

      // Prepare data for heatmap
      const latlngs = validPoints.map(p => {
        const value = p.value != null ? Number(p.value) * intensityScale : 0;
        return [p.lat, p.lng, Math.max(0, Math.min(max, value))];
      });

      const zoom = map.getZoom();
      const scaledRadius = computeRadius(radius, zoom);
      
      const heatGradient = gradient || {
        0.0: '#0000ff',
        0.25: '#00ffff',
        0.5: '#00ff00',
        0.75: '#ffff00',
        1.0: '#ff0000'
      };

      // Clean up existing layers first
      cleanupLayers();

      // Create heat layer
      if (window.HeatLayerOverlay || (window.L && window.L.heatLayer)) {
        const heatLayer = L.heatLayer(latlngs, {
          radius: scaledRadius,
          blur: blur,
          maxZoom: maxZoom,
          gradient: heatGradient
        });
        heatLayer.addTo(map);
        heatRef.current = heatLayer;
      } else {
        // Fallback to circle markers
        const markerGroup = L.layerGroup().addTo(map);
        fallbackRef.current = markerGroup;

        validPoints.forEach(point => {
          const value = point.value || 0;
          const intensity = Math.min(1, Math.max(0, value));
          const color = `rgb(${Math.round(255 * intensity)}, 0, ${Math.round(255 * (1 - intensity))})`;
          
          L.circleMarker([point.lat, point.lng], {
            radius: 5,
            fillColor: color,
            color: '#000',
            weight: 1,
            opacity: 1,
            fillOpacity: 0.8
          }).addTo(markerGroup);
        });
      }
    } catch (error) {
      console.error('Error updating heatmap:', error);
      cleanupLayers();
    }
  }, [points, radius, blur, max, maxZoom, gradient, intensityScale, map, cleanupLayers, computeRadius]);

  // Handle updates
  useEffect(() => {
    isMounted.current = true;
    
    if (!map) return;

    const debouncedUpdate = () => {
      if (updateTimer.current) clearTimeout(updateTimer.current);
      updateTimer.current = setTimeout(updateHeatmap, debounceMs);
    };

    debouncedUpdate();

    // Handle zoom changes
    const onZoom = () => {
      if (heatRef.current) {
        try {
          const zoom = map.getZoom();
          const scaledRadius = computeRadius(radius, zoom);
          heatRef.current.setOptions({ radius: scaledRadius });
        } catch (error) {
          console.error('Error updating heatmap on zoom:', error);
        }
      }
    };

    map.on('zoomend', onZoom);

    // Initial render
    updateHeatmap();

    // Cleanup
    return () => {
      isMounted.current = false;
      if (updateTimer.current) clearTimeout(updateTimer.current);
      map.off('zoomend', onZoom);
      cleanupLayers();
    };
  }, [updateHeatmap, map, radius, computeRadius, debounceMs]);

  return null;
}