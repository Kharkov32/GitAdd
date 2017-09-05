import axios from 'axios';
import { $ } from './bling';

function loadPlaces(map, lat, lng, placeName) {
  axios.get(`/api/stores/near?lat=${lat}&lng=${lng}`)
    .then(res => {
      const places = res.data;
      if (!places.length) {
        $('[name="geolocate"]').style.borderColor = "red";
        
        // Alerting the user that there are no stores nearby.
        // Also set the center to the city of the search and zoom out a bit
        placeName ? alert('There are no stores nearby ' + placeName + '.') : null; // only call the alert if a placeName exists
        const position = { lat: lat, lng: lng };
        map.setCenter(position);
        map.setZoom(10);

        return;
      } else {
        $('[name="geolocate"]').style.borderColor = "";
      }
      // create a bounds
      const bounds = new google.maps.LatLngBounds();
      const infoWindow = new google.maps.InfoWindow();

      const markers = places.map(place => {
        const [placeLng, placeLat] = place.location.coordinates;
        const position = { lat: placeLat, lng: placeLng };
        bounds.extend(position);
        const marker = new google.maps.Marker({ map, position });
        marker.place = place;
        return marker;
      });

      // when someone clicks on a marker, show the details of that place
      markers.forEach(marker => marker.addListener('click', function () {
        let imgHTML = '';
        if (this.place.photo) {
          imgHTML = `<img src="https://s3.amazonaws.com/cbdoilmaps-public-images/stores/${this.place.photo || 'placeholder.jpeg'}" alt="${this.place.name}" style="max-height: 260px;" />`;
        }
        const html = `
          <div class="popup">
            <a href="/store/${this.place.slug}">
              ${imgHTML}
              <p>${this.place.name} - ${this.place.location.address}</p>
            </a>
          </div>
        `;
        infoWindow.setContent(html);
        infoWindow.open(map, this);
      }));

      // then zoom the map to fit all the markers perfectly
      map.setCenter(bounds.getCenter());
      map.fitBounds(bounds);
    });

}

function makeMap(mapDiv) {
  if (!mapDiv) return;
  
  // geolocation is only available on HTTPS, having geolocation turned on could not be tested on localhost
  // localhost testing works fine with the simulation that a user has location turned off on the production site
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(showPosition, noGeo);
  }
  // instantiated the map outside of showPosition so it can be passed along as an argument in the autocomplete event listener
  const map = new google.maps.Map(mapDiv);

  function noGeo() {
    setTimeout(showPosition(true), 1000);
  }
  function showPosition(position) {
    const location = { lat: 41.203323, lng: -77.194527 };
    if (position) {
      location.lat = position.coords.latitude;
      location.lng = position.coords.longitude;
    }
    map.setCenter(location);
    map.setZoom(10);
    loadPlaces(map, location.lat, location.lng);
  }

  const input = $('[name="geolocate"]');
  const autocomplete = new google.maps.places.Autocomplete(input);
  autocomplete.addListener('place_changed', () => {
    const place = autocomplete.getPlace();
    loadPlaces(map, place.geometry.location.lat(), place.geometry.location.lng(), place.name);
  });

}

export default makeMap;
