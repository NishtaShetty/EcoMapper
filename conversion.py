#Run on google colab
import geopandas as gpd
import shutil
import os
from google.colab import files

gdf = gpd.read_file("/content/data/species_name.gpkg")
output_dir = "shapefile_output"
os.makedirs(output_dir, exist_ok=True)

shapefile_path = os.path.join(output_dir, "species_name.shp")
gdf.to_file(shapefile_path)

shapefile_zip = "species_name.zip"
shutil.make_archive("species_name", 'zip', output_dir)
files.download(shapefile_zip)