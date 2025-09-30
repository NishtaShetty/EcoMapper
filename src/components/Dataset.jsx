import React from 'react'
import { Link } from 'react-router-dom'

export default function Dataset() {
  return (
    <div className="p-6">
      <h2 className="text-2xl font-semibold mb-4">Datasets included</h2>
      <div className="flex justify-end gap-2">
        <Link to="/" className="px-3 py-2 rounded-md border hover:bg-zinc-50">
          Back to Map
        </Link>
      </div>
      <div className="space-y-6">
        <section className="border rounded-lg p-4">
          <h3 className="font-medium">WorldClim (climate layers)</h3>
          <p className="text-sm text-zinc-600">
            WorldClim provides high-resolution global climate layers, including monthly precipitation and temperature normals, bioclimatic variables and various derived products used in species distribution modelling and ecological analyses.
          </p>
          <p className="text-xs text-zinc-400 mt-2">
            Usage: climate-based suitability filters, seasonal analysis, covariates for models.
          </p>
        </section>

        <section className="border rounded-lg p-4">
          <h3 className="font-medium">SoilGrids (soil layers)</h3>
          <p className="text-sm text-zinc-600">
            SoilGrids provides global maps of soil properties (e.g., organic carbon, pH, texture fractions) at multiple depth layers. These are useful for determining plant suitability, water retention, and nutrient availability.
          </p>
          <p className="text-xs text-zinc-400 mt-2">
            Usage: soil constraints, rooting depth, nutrient availability layers.
          </p>
        </section>

        <section className="border rounded-lg p-4">
          <h3 className="font-medium">SRTM (elevation)</h3>
          <p className="text-sm text-zinc-600">
            SRTM provides near-global digital elevation data (DEM) which can be used to derive slope, aspect, and other topographic variables that influence microclimate and plant establishment success.
          </p>
          <p className="text-xs text-zinc-400 mt-2">
            Usage: elevation, slope, aspect, drainage and terrain analysis.
          </p>
        </section>
      </div>
    </div>
  )
}

