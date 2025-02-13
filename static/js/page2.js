document.addEventListener("DOMContentLoaded", function () {
    // Initialize the map
    var map = L.map('map').setView([28.6139, 77.2090], 12);

    // Add OpenStreetMap tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    const redZones = [
        { name: "Sultanpuri", coordinates: [28.6955, 77.0359] },
        { name: "Nangloi", coordinates: [28.6812, 77.0550] },
        { name: "Rohini", coordinates: [28.7061, 77.1105] }
    ];

    redZones.forEach(zone => {
        L.circle(zone.coordinates, {
            color: 'red',
            fillColor: 'red',
            fillOpacity: 0.5, // Adjust opacity as needed
            radius: 500 // Radius in meters - adjust this value
        }).addTo(map).bindPopup(zone.name + " (Red Zone)");
    });
    
    let routingControl, googleRoute;
    const GOOGLE_API_KEY = 'YOUR_GOOGLE_API_KEY'; // Replace with your actual API key

    async function geocodeLocation(query) {
        const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`);
        const data = await response.json();
        if (data.length > 0) {
            return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
        } else {
            throw new Error('Location not found');
        }
    }

    document.getElementById('findRoute').addEventListener('click', async function () {
        const from = document.getElementById('from').value;
        const to = document.getElementById('to').value;

        if (!from || !to) {
            alert('Please enter both "From" and "To" locations.');
            return;
        }

        try {
            const fromCoords = await geocodeLocation(from);
            const toCoords = await geocodeLocation(to);

            if (routingControl) {
                map.removeControl(routingControl);
            }
            if (googleRoute) {
                map.removeLayer(googleRoute);
            }

            // Pink Route (Permanent)
            routingControl = L.Routing.control({
                waypoints: [L.latLng(fromCoords.lat, fromCoords.lng), L.latLng(toCoords.lat, toCoords.lng)],
                routeWhileDragging: true,
                lineOptions: {
                    styles: [{ color: '#C71585', weight: 5 }]
                },
                router: L.Routing.osrmv1({
                    serviceUrl: 'https://router.project-osrm.org/route/v1',
                    profile: 'driving'
                })
            });

            // Move the routing UI to the sidebar
            routingControl.addTo(map);
            document.getElementById('route-ui').appendChild(routingControl.getContainer());

            // Fetch Google Maps Route (Blue Route)
            const googleMapsUrl = `https://maps.googleapis.com/maps/api/directions/json?origin=${from}&destination=${to}&key=${GOOGLE_API_KEY}&mode=driving`;
            const googleData = await fetch(googleMapsUrl);
            const data = await googleData.json();

            if (data.routes.length > 0) {
                const coords = data.routes[0].overview_polyline.points;
                googleRoute = L.polyline(decodePolyline(coords), { color: 'blue', weight: 5 });

                // Show "Compare Routes" button
                document.getElementById('compareRoutes').style.display = 'block';
            }
        } catch (error) {
            alert('Error finding location: ' + error.message);
        }
    });

    function decodePolyline(encoded) {
        let points = [];
        let index = 0, len = encoded.length;
        let lat = 0, lng = 0;

        while (index < len) {
            let b, shift = 0, result = 0;
            do {
                b = encoded.charCodeAt(index++) - 63;
                result |= (b & 0x1f) << shift;
                shift += 5;
            } while (b >= 0x20);
            let dlat = ((result & 1) ? ~(result >> 1) : (result >> 1));
            lat += dlat;

            shift = 0;
            result = 0;
            do {
                b = encoded.charCodeAt(index++) - 63;
                result |= (b & 0x1f) << shift;
                shift += 5;
            } while (b >= 0x20);
            let dlng = ((result & 1) ? ~(result >> 1) : (result >> 1));
            lng += dlng;

            points.push([lat / 1e5, lng / 1e5]);
        }
        return points;
    }

    document.getElementById('compareRoutes').addEventListener('click', function () {
        if (googleRoute) {
            googleRoute.addTo(map);
        }
    });
});
