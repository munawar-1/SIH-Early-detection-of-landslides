import json
import ssl
import urllib.request

# Querying specific properties is much faster (reads 4 raster files instead of 12)
url = "https://rest.isric.org/soilgrids/v2.0/properties/query?lon=92.88&lat=25.03&property=clay&property=sand&property=silt&property=bdod&depth=0-5cm"
print("=" * 60)
print(f"🛰️ Testing single ISRIC SoilGrids query for (25.03°N, 92.88°E)...")
print(f"URL: {url}")
print("=" * 60)

headers = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
    "Accept": "application/json"
}
req = urllib.request.Request(url, headers=headers)

# Bypass macOS missing CA bundle
ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

try:
    print("Connecting to ISRIC SoilGrids (please wait up to 25s)...")
    with urllib.request.urlopen(req, context=ctx, timeout=30) as res:
        data = json.loads(res.read().decode('utf-8'))
        layers = data.get("properties", {}).get("layers", [])
        print(f"\n✅ Connection Successful! Received {len(layers)} soil layers from ISRIC:")
        for layer in layers:
            name = layer.get("name")
            if name in ['clay', 'sand', 'silt', 'bdod']:
                depths = layer.get("depths", [])
                if depths:
                    val = depths[0]['values'].get('Q0.5') or depths[0]['values'].get('mean')
                    dfactor = layer.get('unit_measure', {}).get('d_factor', 10 if name != 'bdod' else 100)
                    print(f"   🌱 {name.upper()}: {val / dfactor} (raw: {val}, d_factor: {dfactor})")
except Exception as e:
    print(f"\n❌ Error during query: {e}")
