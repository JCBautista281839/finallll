let map, marker, geocoder, autocomplete;

function initMap() {
  geocoder = new google.maps.Geocoder();
  const defaultLocation = { lat: 14.5995, lng: 120.9842 }; // Manila

  map = new google.maps.Map(document.getElementById("map"), {
    center: defaultLocation,
    zoom: 14,
  });

  marker = new google.maps.Marker({
    map: map,
    position: defaultLocation,
    draggable: true,
  });

  // Autocomplete
  const input = document.getElementById("address-input");
  autocomplete = new google.maps.places.Autocomplete(input);
  autocomplete.bindTo("bounds", map);

  // When user selects an address
  autocomplete.addListener("place_changed", () => {
    const place = autocomplete.getPlace();
    if (!place.geometry) return;

    const location = place.geometry.location;
    map.setCenter(location);
    map.setZoom(17);
    marker.setPosition(location);

    // Show coords
    document.getElementById("coords-result").innerHTML =
      `Latitude: ${location.lat().toFixed(6)} <br> Longitude: ${location.lng().toFixed(6)}`;
  });

  // When marker is dragged
  google.maps.event.addListener(marker, "dragend", () => {
    const position = marker.getPosition();
    geocoder.geocode({ location: position }, (results, status) => {
      if (status === "OK" && results[0]) {
        input.value = results[0].formatted_address;
        document.getElementById("coords-result").innerHTML =
          `Latitude: ${position.lat().toFixed(6)} <br> Longitude: ${position.lng().toFixed(6)}`;
      }
    });
  });
}
window.onload = initMap;