import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { twoline2satrec, propagate, eciToGeodetic, gstime, degreesLong, degreesLat } from 'satellite.js';
import './App.css';

// Fix for default marker icon not displaying correctly
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
});

const LocationPage = () => {
  const [position, setPosition] = useState({ lat: 44.6509, lng: -63.5923 });
  const [nextPassLandsat8, setNextPassLandsat8] = useState(null);
  const [nextPassLandsat9, setNextPassLandsat9] = useState(null);

  useEffect(() => {
    const fetchTLEData = async () => {
      try {
        const response = await fetch('https://www.celestrak.com/NORAD/elements/resource.txt');
        const data = await response.text();
        const lines = data.split('\n');

        const calculateNextPass = (tleLine1, tleLine2) => {
          const satrec = twoline2satrec(tleLine1, tleLine2);
          let date = new Date();
          let foundPass = false;
          const swathRadius = 185 / 2; // Swath width is 185 km, radius is half

          while (!foundPass) {
            const positionAndVelocity = propagate(satrec, date);
            const positionGd = eciToGeodetic(positionAndVelocity.position, gstime(date));

            const longitude = degreesLong(positionGd.longitude);
            const latitude = degreesLat(positionGd.latitude);

            const distance = calculateDistance(latitude, longitude, position.lat, position.lng);

            if (distance <= swathRadius) {
              return date;
            }

            date.setMinutes(date.getMinutes() + 1);
          }
        };

        for (let i = 0; i < lines.length; i++) {
          if (lines[i].includes('LANDSAT 8')) {
            const tleLine1 = lines[i + 1].trim();
            const tleLine2 = lines[i + 2].trim();
            const nextPass = calculateNextPass(tleLine1, tleLine2);
            setNextPassLandsat8(nextPass);
          }
          if (lines[i].includes('LANDSAT 9')) {
            const tleLine1 = lines[i + 1].trim();
            const tleLine2 = lines[i + 2].trim();
            const nextPass = calculateNextPass(tleLine1, tleLine2);
            setNextPassLandsat9(nextPass);
          }
        }
      } catch (error) {
        console.error('Error fetching TLE data:', error);
      }
    };

    fetchTLEData();
  }, [position]);

  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Radius of the Earth in km
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in km
  };

  const handleGetLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const newPosition = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          setPosition(newPosition);
        },
        (error) => {
          console.error("Error obtaining location", error);
        }
      );
    } else {
      alert("Geolocation is not supported by this browser.");
    }
  };

  const LocationMarker = () => {
    const map = useMapEvents({
      click: (e) => {
        setPosition(e.latlng);
        map.setView(e.latlng, map.getZoom());
      },
    });

    useEffect(() => {
      if (position) {
        map.setView(position, map.getZoom());
      }
    }, [position]);

    return position === null ? null : (
      <Marker position={position}>
        <Popup>
          Latitude: {position.lat.toFixed(4)}, Longitude: {position.lng.toFixed(4)}
        </Popup>
      </Marker>
    );
  };

  return (
    <>
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif', width: '100%', boxSizing: 'border-box' }}>
      <h1 style={{ textAlign: 'center' }}>LANDSAT 8 & 9 Next Passes</h1>
      <button
        onClick={handleGetLocation}
        style={{
          display: 'block',
          margin: '10px auto',
          padding: '10px 20px',
          fontSize: '16px',
          cursor: 'pointer',
        }}
      >
        Get Location via GPS
      </button>
      <div style={{ textAlign: 'center', marginBottom: '10px' }}>
        <p>Latitude: {position ? position.lat.toFixed(4) : 'N/A'}</p>
        <p>Longitude: {position ? position.lng.toFixed(4) : 'N/A'}</p>
      </div>
      <div style={{ textAlign: 'center', marginBottom: '10px' }}>
        {nextPassLandsat8 ? (
          <p>The next pass of Landsat 8 over your location is at: {nextPassLandsat8.toLocaleString()}</p>
        ) : (
          <p>Calculating next pass for Landsat 8...</p>
        )}
        {nextPassLandsat9 ? (
          <p>The next pass of Landsat 9 over your location is at: {nextPassLandsat9.toLocaleString()}</p>
        ) : (
          <p>Calculating next pass for Landsat 9...</p>
        )}
      </div>
      <MapContainer
        center={[44.6509, -63.5923]}
        zoom={13}
        style={{ height: '500px', minWidth: '100%', borderRadius: '8px' }}
      >
        <TileLayer

            url={`https://api.mapbox.com/styles/v1/mapbox/satellite-v9/tiles/{z}/{x}/{y}?access_token=pk.eyJ1Ijoib21hbmFuZCIsImEiOiJjbTF4ZnVma3AwcXBsMmlwd3E5ZGFpeW9zIn0.bnqwgmybyeSKKM6C164pKw`}
            attribution='&copy; <a href="https://www.mapbox.com/about/maps/">Mapbox</a> contributors'
          />
          <LocationMarker />
        </MapContainer>
      </div>
    </>
  );
};

export default LocationPage;