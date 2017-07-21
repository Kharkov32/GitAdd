import axios from 'axios';
import { $ } from './bling';

function loadPlaces(map, lat, lng) {
  axios.get(`/api/stores/near?lat=${lat}&lng=${lng}`)
    .then(res => {
      const places = res.data;
      if (!places.length) {
        $('[name="geolocate"]').style.borderColor = "red";
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
      markers.forEach(marker => marker.addListener('click', function() {
          let imgHTML = '';
          if (this.place.photo) {
            imgHTML = `<img src="https://s3.amazonaws.com/cbdoilmaps-public-images/stores/${this.place.photo || 'store.png'}" alt="${this.place.name}" style="max-height: 260px;" />`;
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
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(showPosition, noGeo);
  }

  function noGeo() {
      setTimeout(showPosition(false), 1000);
  }
  function showPosition(position) {
    let lat = 41.203323;
    let lng = -77.194527;
    if (position) {
        lat = position.coords.latitude;
        lng = position.coords.longitude;
    }
    // make our map
    const map = new google.maps.Map(mapDiv, {
        center: {
            lat: lat,
            lng: lng
        },
        zoom: 10
    });
    loadPlaces(map, lat, lng);
  }

  const input = $('[name="geolocate"]');
  const autocomplete = new google.maps.places.Autocomplete(input);
  autocomplete.addListener('place_changed', () => {
    const place = autocomplete.getPlace();
    loadPlaces(map, place.geometry.location.lat(), place.geometry.location.lng());
  });
}

export default makeMap;
