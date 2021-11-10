import { Component, OnInit, ViewChild, ViewEncapsulation, AfterViewInit, ElementRef, ChangeDetectionStrategy } from '@angular/core';
import { GoogleMap } from '@angular/google-maps';

@Component({
  selector: 'app-map',
  templateUrl: './map.component.html',
  styleUrls: ['./map.component.css'],
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MapComponent implements OnInit, AfterViewInit {

  constructor() { }

  @ViewChild('mapSearchField') searchField!: ElementRef;
  @ViewChild('businessSearchField') businessSearchField!: ElementRef;
  @ViewChild('mapSearchFieldContainer') mapSearchFieldContainer!: ElementRef;
  @ViewChild(GoogleMap) map!: GoogleMap;

  mapOptions: google.maps.MapOptions = {
    center: { lat: 38.9987208, lng: -77.2538699 },
    zoom: 5,
    disableDefaultUI: true,
    fullscreenControl: true,
    zoomControl: true
  }
  worldBounds = new google.maps.LatLngBounds(
    new google.maps.LatLng(56.7527, -130.0781),
    new google.maps.LatLng(-29.5352, 154.6874));

  autoCompleteBusiness!: google.maps.places.Autocomplete;
  markers: google.maps.Marker[] = [];

  ngOnInit(): void {

  }

  ngAfterViewInit() {

    this.map.controls[google.maps.ControlPosition.TOP_LEFT].push(
      this.mapSearchFieldContainer.nativeElement,
    );

    this.initCitySearch();
    this.initBusinessSearch();

  }

  initCitySearch() {

    const options: google.maps.places.AutocompleteOptions = {
      bounds: this.worldBounds,
      fields: ["address_components", "geometry", "name", "icon"],
      strictBounds: false,
      types: ["(regions)"],
    };

    const autocomplete = new google.maps.places.Autocomplete(
      this.searchField.nativeElement, options
    );

    autocomplete.addListener("place_changed", () => {
      const place = autocomplete.getPlace();

      if (!place.geometry || !place.geometry.location) {
        // User entered the name of a Place that was not suggested and
        // pressed the Enter key, or the Place Details request failed.
        window.alert("No details available for input: '" + place.name + "'");
        return;
      }

      // If the place has a geometry, then present it on a map.
      if (place.geometry.viewport) {
        this.map.fitBounds(place.geometry.viewport);
      } else {
        this.map.googleMap?.setCenter(place.geometry.location);
        this.map.googleMap?.setZoom(17);
      }
      console.log(place.formatted_address, place.name);

      this.autoCompleteBusiness.setBounds(this.map.getBounds() || this.worldBounds);

    });

  }





  initBusinessSearch() {

    const options: google.maps.places.AutocompleteOptions = {
      bounds: this.worldBounds,
      fields: ["address_components", "geometry", "name", "icon"],
      strictBounds: false,
      types: ["establishment"],
    };

    this.autoCompleteBusiness = new google.maps.places.Autocomplete(
      this.businessSearchField.nativeElement, options
    );

    this.autoCompleteBusiness.addListener("place_changed", () => {
      const place = this.autoCompleteBusiness.getPlace();

      this.markers.forEach((marker) => {
        marker.setMap(null);
      });
      this.markers = [];

      if (!place.geometry || !place.geometry.location) {
        this.placeSearch();
        return;
      }

      // If the place has a geometry, then present it on a map.
      if (place.geometry.viewport) {
        this.map.fitBounds(place.geometry.viewport);
      } else {
        this.map.googleMap?.setCenter(place.geometry.location);
        this.map.googleMap?.setZoom(17);
      }
      console.log(place.formatted_address, place.name);
    });

  }

  placeSearch() {

    const service = new google.maps.places.PlacesService(this.map.googleMap || new google.maps.Map(new Element));

    const request: google.maps.places.TextSearchRequest = {
      bounds: this.map.getBounds() || this.worldBounds,
      query: this.businessSearchField.nativeElement.value
    };
    let that = this;
    let map = this.map.googleMap;
    service.textSearch(request, function (results, status) {
      const bounds = new google.maps.LatLngBounds();
      if (status === google.maps.places.PlacesServiceStatus.OK) {
        (results || []).forEach(place => {
          console.log(place);

          const icon = {
            url: place.icon as string,
            size: new google.maps.Size(71, 71),
            origin: new google.maps.Point(0, 0),
            anchor: new google.maps.Point(17, 34),
            scaledSize: new google.maps.Size(25, 25),
          };

          // Create a marker for each place.

          that.markers.push(
            new google.maps.Marker({
              map,
              icon,
              title: place.name,
              position: place.geometry?.location,
            })
          );

          if (place.geometry?.viewport) {
            // Only geocodes have viewport.
            bounds.union(place.geometry.viewport);
          } else {
            bounds.extend(place.geometry?.location || new google.maps.LatLng(0, 0));
          }

        });
      }
      map?.fitBounds(bounds);
    });



  }

}
