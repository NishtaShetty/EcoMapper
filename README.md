# EcoMapper - Machine Learning and GIS driven platform for predicting suitable sites for species restoration

This project implements **Species Distribution Modeling (SDM)** using a **Random Forest classifier** within **Google Earth Engine (GEE)**.  
The workflow was applied to **8 different species**, generating habitat suitability maps that were exported as map tiles for web visualization.

Link to demo video and presentation - [Drive](https://drive.google.com/drive/folders/1dK6iCLvIHgW_5zDVBQkxj-a0u5I3lVJ2?usp=drive_link)

## Table of Contents
- [Species Modeled](#species-modeled)
- [Workflow](#workflow)
- [Features & Functionality](#features--functionality)
- [Key features of the website](#key-features-of-the-website)
- [Usage Guide](#usage-guide)
- [Data Sources](#data-sources)
- [Tech Stack](#tech-stack)
- [Development Setup](#development-setup)
- [License](#license)
- [Contact](#contact)
- [Credits & Acknowledgments](#credits--acknowledgments)

---
## Species Modeled

1. Aegle marmelos (Bael)
2. Azadirachta indica (Neem)
3. Butea monosperma (Flame of the forest)
4. Dalbergia sissoo (Indian rosewood)
5. Ficus religiosa (Peepal)
6. Santalum album (Sandalwood)
7. Shorea robusta (Sal tree)
8. Syzygium cumini (Jamun)

## Workflow

### 1. Data Preparation
- Species occurrence data were obtained in `.gpkg` format (point locations).
- Converted `.gpkg` → `.shp` → `.zip` using `conversion.py` for uploading into GEE as assets.
- Each species was uploaded as a separate asset into GEE.
- The data was restricted to the Indian boundaries. 

### 2. Environmental Predictors
The following environmental raster layers were used as predictors:
- **BIO01** – Annual Mean Temperature  
- **BIO12** – Annual Precipitation  
- **Elevation**
- **Soil pH (0–5 cm)**  
- **Soil Organic Carbon (SOC, 0–5 cm)**  
- **Soil Texture (Clay %, 0–5 cm)**  
- **Landcover** – Categorical global land cover layer  

### 3. Modeling
- A **Random Forest classifier** was trained for each species in `gee.js` run on Google Earth Engine (GEE) using:
  - **Presence points** (from occurrence data).
  - **Background/absence points** generated from the study area.  
- Model output was a continuous **probability map (0–1)** representing habitat suitability.

### 4. Thresholding
- An **optimal threshold** was determined for each species using model evaluation metrics.  
- Maps were then **binarized** into:
  - **Green = Suitable (Yes, species likely occurs)**  
  - **Red = Unsuitable (No, species unlikely to occur)**  

### 5. Model Evaluation
- Confusion Matrix, Accuracy, Kappa, Precision, Recall, Specificity, and F1 Score were calculated.  

### 6. Export & Visualization
- Final suitability maps for all 8 species were exported as **GeoTIFFs**.  
- GeoTIFFs were tiled and integrated into the **Leaflet web application** for interactive exploration.  
- The website allows users to toggle species layers and view predicted suitability areas.

---

## Features \& Functionality of the model
- High resolution Suitability Mapping (250 m scale)
- Machine Learning Backend: Random Forest in probability mode
- Dynamic Thresholding: Youden’s J optimization per species
- Feature Importance Analysis: Climate, soils, elevation, land cover
- Scalable \& Modular design

---
## Key Features of the website

###  Multiple Map Overlays
- **Raster and Vector Support:** Full support for both raster and vector overlays with independent opacity control.  
- **Tile-based Layers:** Efficient tile-based rendering for various basemaps and environmental datasets.  
- **Layer Management:** Intuitive layer grouping and nesting to easily manage multiple data types including:
  - Water quality data
  - Air quality measurements
  - Vegetation indices 
- **Flexible Basemaps:** Smooth switching between satellite, terrain, and street map basemaps.

###  Data Download & Export
EcoMapper provides comprehensive data access and export capabilities:
- **Species-specific Downloads:** Download suspect tiles for the possible plantation area.  
- **Raster Tile Export:** View and export raster tiles for offline analysis.  
- **CSV Export:** Export filtered datasets in CSV format, including latitude and longitude coordinates to identify where planting is possible.

---

## Usage Guide

### Viewing Heatmaps
1. Open the application in your browser.  
2. Use the layer control panel (top-right corner) to toggle different overlays.  
3. Adjust opacity sliders for each heatmap layer to customize visibility.  
4. Navigate the map using standard pan and zoom controls. 

### Plant Plantation Susceptibility Tiles
When selecting the **plant option**, you will have access to different species. Features include:  
- **Preview Raster Tiles:** Preview the raster file for the selected species.  
- **Download Options:**  
  - **.TIF Format:** Download raster tiles for offline analysis.  
  - **CSV Format:** Download datasets without preview, including latitude and longitude coordinates for potential planting areas.

### Previewing & Exporting Data
- **Data Preview:** Hover over heatmap points to view detailed tooltips with environmental measurements.  
- **Export Options:** Use the download functionality to export data in multiple formats:
  - **Raster Tiles:** Download visual overlay tiles for offline use.  
  - **CSV Export:** Export tabular datasets for analysis.  
  - **Species-specific Tiles:** Download biodiversity monitoring data for specific species.

---

## Data Sources
EcoMapper integrates multiple environmental data sources:
- **Water Quality:** Simulated water quality data across Indian geographical boundaries.  
- **Air Quality:** Environmental air quality data based on OpenAQ API response formats.  
- **Vegetation:** NDVI-like vegetation indices with species-specific overlay capabilities.  
- **Climate Data:** Temperature and rainfall simulation datasets.  
- **Natural Events:** Real-time monitoring data for natural disasters including:
- Wildfire tracking and intensity mapping  
- Earthquake monitoring and seismic activity data  

---
## Technical Requirements
- Modern web browser with JavaScript enabled.  
- Internet connection for tile loading and data updates.  

---

## Tech Stack
- **Google Earth Engine (GEE)** – data processing & Random Forest modeling  
- **Python** – preprocessing (`conversion.py`) and evaluation scripts  
- **Leaflet.js** – web-based map visualization  
- **GeoTIFF → tiles** – raster handling for fast rendering  
- **Node.js 18+** – backend setup  
- **WebGL** – optimized rendering in browsers  

---

## Outputs
- **8 suitability maps** (one for each species).  
- **Interactive Leaflet map** with toggleable layers.  

---

## Development Setup

### Prerequisites
- Node.js 18+ (LTS recommended)
- npm 9+ or yarn 1.22+
- Modern web browser with WebGL support

### Installation
```bash
# Clone repo
git clone http://gitlab.indiaobservatory.org.in/code4nature-2025/iris.git
cd iris

# Install dependencies
npm install

# Configure environment
cp .env.example .env

# Start development servers(different terminals)
npm run dev            # Start frontend development server
npm run mock-server    # Start mock backend server
```
--- 

## License
This project is released under the [MIT License](https://choosealicense.com/licenses/mit/)

## Contact
Project Lead: Dhruthi
Email: aithaldhruthi@gmail.com
Institution: R V College of Engineering

## Credits & Acknowledgments
- **Concept & Development:** Team Iris  
- **Data Sources:** GBIF, WorldClim, SoilGrids, MODIS, SRTM, FAO GAUL 
- **Spatial Preprocessing & Modeling:** Google Earth Engine, QGIS  
- **Platform & Visualization:** React.js with Leaflet.js, Google Earth Engine 
- **Community & Support:** India Observatory community, mentors and reviewers  