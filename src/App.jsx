import React, { useMemo, useState } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Navbar from './components/Navbar'
import MapView from './components/MapView'
import PlantSelector from './components/PlantSelector'
import Dataset from './components/Dataset'

export default function App() {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [infoOpen, setInfoOpen] = useState(true)

  const [filters, setFilters] = useState({
  // use ISO dates for GEE queries
  startDate: '2024-01-01',
  endDate: '2025-01-01',
  region: 'All',
  pollution: 150,
  })

  const [overlayState, setOverlayState] = useState({
    landCover: false,
    waterQuality: true,
    vegetation: true,
    climate: false,
  aqi: false,
  openAQ: false,
  eonet: false,
  usgs: false,
  })

  // per-overlay opacity for GEE tiles
  const [overlayOpacities, setOverlayOpacities] = useState({
    ndvi: 0.7,
    lst: 0.6,
    rainfall: 0.6,
    aqi: 0.7,
  openAQ: 0.8,
  eonet: 0.9,
  usgs: 0.8,
  })

  const [clickedInfo, setClickedInfo] = useState(null)
  const [plantPageOpen, setPlantPageOpen] = useState(false)

  return (
    <BrowserRouter>
      <div className="flex flex-col h-full">
        <Navbar
          onToggleLeft={() => setSidebarOpen(v => !v)}
          onToggleRight={() => setInfoOpen(v => !v)}
          onOpenPlants={() => setPlantPageOpen(true)}
        />

        <div className="flex-1 grid grid-cols-12 gap-3 p-3">
          <div className={`col-span-12 md:col-span-12 rounded-2xl shadow-soft overflow-hidden`}>
            <Routes>
              <Route path="/" element={
                <MapView
                  overlayState={overlayState}
                  filters={filters}
                  overlayOpacities={overlayOpacities}
                  onMapClickInfo={setClickedInfo}
                />
              } />
               <Route path="/datasets" element={<Dataset />} />
               <Route path="/plants" element={<PlantSelector onBack={() => window.history.back()} />} />
            </Routes>
          </div>
        </div>
      </div>
    </BrowserRouter>
  )
}