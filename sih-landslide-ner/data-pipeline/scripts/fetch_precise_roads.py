#!/usr/bin/env python3
import json
import urllib.request
import urllib.parse
import os

OVERPASS_URL = "https://overpass-api.de/api/interpreter"

# Overpass query to get all NH 27 and major highways in Dima Hasao bounding box (24.90, 92.55, 25.85, 93.30)
query = """
[out:json][timeout:60];
(
  way["highway"]["ref"~"^(NH ?27|NH27|NH-27|27)$"](24.90,92.55,25.85,93.30);
  way["highway"]["ref"~"^(NH ?27A|NH27A)$"](24.90,92.55,25.85,93.30);
  way["highway"~"trunk|primary"]["name"~"NH|Highway|Haflong|Harangajao|Maibang"](24.90,92.55,25.85,93.30);
);
out geom;
"""

print("Fetching OSM road geometry for NH-27 in Dima Hasao from Overpass API...")
req = urllib.request.Request(
    OVERPASS_URL,
    data=urllib.parse.urlencode({'data': query}).encode('utf-8'),
    headers={'User-Agent': 'SIH-Landslide-NER/1.0 (GIS Highway Mapper)'}
)

with urllib.request.urlopen(req, timeout=45) as response:
    data = json.loads(response.read().decode('utf-8'))

elements = data.get('elements', [])
print(f"Retrieved {len(elements)} way elements.")

output_file = os.path.join(os.path.dirname(__file__), "dima_hasao_roads_osm.json")
with open(output_file, 'w', encoding='utf-8') as f:
    json.dump(elements, f, indent=2)

print(f"Saved raw elements to {output_file}")
