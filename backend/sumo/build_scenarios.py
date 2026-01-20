import os
import requests
import subprocess
import xml.etree.ElementTree as ET
import sys

# Configuration
SCENARIOS = [
    {
        "id": "bangalore_hebbal",
        "name": "Hebbal Service Road",
        "lat": 13.035781,
        "lon": 77.597008,
        "bbox_radius_deg": 0.0014
    }
]

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
NETWORKS_DIR = os.path.join(BASE_DIR, "networks")

def get_sumo_tools_dir():
    sumo_home = os.environ.get("SUMO_HOME")
    if sumo_home:
        tools = os.path.join(sumo_home, "tools")
        if os.path.exists(tools):
            return tools
    return None

SUMO_TOOLS = get_sumo_tools_dir()
if SUMO_TOOLS:
    sys.path.append(SUMO_TOOLS)

def download_osm_overpass(scenario):
    """Download OSM data using Overpass API (more reliable)"""
    min_lon = scenario["lon"] - scenario["bbox_radius_deg"]
    max_lon = scenario["lon"] + scenario["bbox_radius_deg"]
    min_lat = scenario["lat"] - scenario["bbox_radius_deg"]
    max_lat = scenario["lat"] + scenario["bbox_radius_deg"]
    
    # Using Overpass API instead of main OSM API
    url = f"http://overpass-api.de/api/map?bbox={min_lon},{min_lat},{max_lon},{max_lat}"
    print(f"Downloading {scenario['name']} from Overpass API")
    
    try:
        response = requests.get(url, timeout=60)
        if response.status_code != 200:
            print(f"Failed to download: {response.text}")
            return None
            
        folder = os.path.join(NETWORKS_DIR, scenario["id"])
        os.makedirs(folder, exist_ok=True)
        
        osm_path = os.path.join(folder, "map.osm")
        with open(osm_path, "wb") as f:
            f.write(response.content)
        
        print(f"Downloaded {len(response.content)} bytes")
        return osm_path
    except Exception as e:
        print(f"Error downloading: {e}")
        return None

def filter_flyovers(osm_path):
    """Remove all flyovers, bridges, and elevated roads"""
    print(f"Filtering flyovers and elevated roads from {osm_path}")
    try:
        tree = ET.parse(osm_path)
        root = tree.getroot()
        
        ways_to_remove = []
        nodes_to_keep = set()
        
        # First pass: identify ways to keep and remove
        for way in root.findall("way"):
            tags = {tag.attrib['k']: tag.attrib['v'] for tag in way.findall("tag")}
            
            should_remove = False
            
            # Remove if layer > 0 (elevated roads)
            if 'layer' in tags:
                try:
                    layer_val = int(tags['layer'])
                    if layer_val > 0:
                        should_remove = True
                        print(f"  Removing way with layer={layer_val}")
                except ValueError:
                    pass
            
            # Remove if marked as bridge
            if 'bridge' in tags and tags['bridge'] in ['yes', 'viaduct', 'flyover']:
                should_remove = True
                print(f"  Removing bridge: {tags.get('name', 'unnamed')}")
            
            # Remove if explicitly marked as flyover
            if 'highway' in tags and 'flyover' in tags.get('name', '').lower():
                should_remove = True
                print(f"  Removing flyover by name: {tags.get('name')}")
                
            if should_remove:
                ways_to_remove.append(way)
            else:
                # Keep track of nodes used by remaining ways
                for nd in way.findall("nd"):
                    nodes_to_keep.add(nd.attrib['ref'])
        
        # Remove flyover ways
        for way in ways_to_remove:
            root.remove(way)
        
        print(f"Removed {len(ways_to_remove)} elevated/bridge ways")
        
        # Clean up orphaned nodes
        nodes_to_remove = []
        for node in root.findall("node"):
            if node.attrib['id'] not in nodes_to_keep:
                nodes_to_remove.append(node)
        
        for node in nodes_to_remove:
            root.remove(node)
            
        print(f"Removed {len(nodes_to_remove)} orphaned nodes")
            
        filtered_path = osm_path.replace(".osm", "_filtered.osm")
        tree.write(filtered_path, encoding='utf-8', xml_declaration=True)
        return filtered_path
    except Exception as e:
        print(f"Error filtering OSM: {e}")
        return osm_path

def convert_to_net(osm_path, scenario_id):
    """Convert OSM to SUMO network with ALL traffic lights"""
    folder = os.path.dirname(osm_path)
    net_path = os.path.join(folder, f"{scenario_id}.net.xml")
    
    cmd = [
        "netconvert",
        "--osm-files", osm_path,
        "--output-file", net_path,
        
        # Geometry cleanup
        "--geometry.remove", "true",
        "--roundabouts.guess", "true",
        "--ramps.guess", "true",
        "--junctions.join", "true",
        
        # TRAFFIC LIGHT SETTINGS - Force TLS everywhere
        "--tls.guess", "true",              # Guess traffic lights at intersections
        "--tls.guess.threshold", "1",       # Set threshold to 1 to create TLS at most junctions
        "--tls.join", "true",               # Join nearby traffic lights
        "--tls.default-type", "actuated",   # Use actuated (smart) traffic lights
        
        # Remove unwanted vehicle classes
        "--remove-edges.by-vclass", "rail_urban,rail,rail_electric,tram,pedestrian",
        
        # Junction settings
        "--junctions.join-dist", "15",      # Join junctions within 15m
        "--no-turnarounds", "true",
        
        # Keep only ground-level roads
        "--keep-edges.by-vclass", "passenger,bus,motorcycle,bicycle",
        
        # Additional cleanup
        "--remove-edges.isolated", "true",
        "--junctions.corner-detail", "5",
        "--output.street-names", "true"
    ]
    
    print(f"Running netconvert for {scenario_id}...")
    print("Traffic light mode: ALL intersections will have traffic lights")
    
    try:
        result = subprocess.run(cmd, capture_output=True, text=True)
        if result.returncode != 0:
            print(f"Netconvert stderr: {result.stderr}")
            if "error" in result.stderr.lower():
                return None
        
        # Count traffic lights in generated network
        if os.path.exists(net_path):
            count_traffic_lights(net_path)
        
        return net_path
    except Exception as e:
        print(f"Netconvert execution error: {e}")
        return None

def count_traffic_lights(net_path):
    """Count traffic lights in the network"""
    try:
        tree = ET.parse(net_path)
        root = tree.getroot()
        tls_count = len(root.findall(".//tlLogic"))
        junction_count = len(root.findall(".//junction[@type='traffic_light']"))
        print(f"✓ Network contains {tls_count} traffic light programs")
        print(f"✓ Network contains {junction_count} traffic light junctions")
    except Exception as e:
        print(f"Could not count traffic lights: {e}")

def generate_traffic(net_path, scenario_id):
    """Generate random traffic for the network"""
    if not SUMO_TOOLS:
        print("SUMO_TOOLS not found, skipping traffic generation")
        return None
        
    random_trips = os.path.join(SUMO_TOOLS, "randomTrips.py")
    if not os.path.exists(random_trips):
        print(f"randomTrips.py not found at {random_trips}")
        return None

    folder = os.path.dirname(net_path)
    trips_path = os.path.join(folder, "trips.trips.xml")
    routes_path = os.path.join(folder, "routes.rou.xml")
    episode_routes = os.path.join(folder, "episode_routes.rou.xml")
    
    cmd = [
        sys.executable, random_trips,
        "-n", net_path,
        "-o", trips_path,
        "-r", routes_path,
        "-e", "3600",           # Simulate for 1 hour
        "-p", "2.0",            # Vehicle every 2 seconds
        "--vehicle-class", "passenger",
        "--fringe-factor", "5"  # Prefer edge routes
    ]
    
    print(f"Generating traffic for {scenario_id}...")
    try:
        result = subprocess.run(cmd, capture_output=True, text=True)
        if result.returncode != 0:
            print(f"Traffic generation warning: {result.stderr}")
            
        # Copy to episode_routes.rou.xml for consistency with controller
        import shutil
        if os.path.exists(routes_path):
            shutil.copy(routes_path, episode_routes)
            print(f"Created {episode_routes}")
            
        return routes_path
    except Exception as e:
        print(f"Traffic generation failed: {e}")
        return None

def create_sumo_config(net_path, routes_path, scenario_id):
    """Create SUMO configuration file"""
    folder = os.path.dirname(net_path)
    config_path = os.path.join(folder, "sumo_config.sumocfg")
    
    net_file = os.path.basename(net_path)
    routes_file = os.path.basename(routes_path) if routes_path else ""
    
    content = f"""<?xml version="1.0" encoding="UTF-8"?>
<configuration xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:noNamespaceSchemaLocation="http://sumo.dlr.de/xsd/sumoConfiguration.xsd">
    <input>
        <net-file value="{net_file}"/>
        <route-files value="{routes_file}"/>
    </input>
    <time>
        <begin value="0"/>
        <end value="3600"/>
        <step-length value="1.0"/>
    </time>
    <processing>
        <time-to-teleport value="-1"/>
    </processing>
    <report>
        <verbose value="true"/>
        <no-step-log value="false"/>
    </report>
</configuration>
"""
    with open(config_path, "w") as f:
        f.write(content)
        
    print(f"✓ Created config at {config_path}")
    print(f"\nTo run simulation: sumo-gui -c {config_path}")

def main():
    print("=" * 60)
    print("SUMO Network Generator")
    print("Features: All Traffic Lights + No Flyovers")
    print("=" * 60)
    
    for scenario in SCENARIOS:
        print(f"\n{'='*60}")
        print(f"Processing: {scenario['name']}")
        print(f"{'='*60}")
        
        # Download OSM data
        osm_path = download_osm_overpass(scenario)
        if not osm_path:
            print(f"❌ Failed to download {scenario['name']}")
            continue
        
        # Filter out flyovers
        filtered_osm = filter_flyovers(osm_path)
        
        # Convert to SUMO network with traffic lights
        net_path = convert_to_net(filtered_osm, scenario["id"])
        
        if net_path:
            # Generate traffic
            routes_path = generate_traffic(net_path, scenario["id"])
            
            # Create configuration
            create_sumo_config(net_path, routes_path, scenario["id"])
            
            print(f"\n✓ Successfully processed {scenario['name']}")
            print(f"  Network file: {net_path}")
            print(f"  Config file: {os.path.join(os.path.dirname(net_path), 'sumo_config.sumocfg')}")
        else:
            print(f"❌ Failed to create network for {scenario['name']}")

if __name__ == "__main__":
    main()
