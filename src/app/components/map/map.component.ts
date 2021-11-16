import { Component, OnInit, ViewChild, ViewEncapsulation, AfterViewInit, ElementRef, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { GoogleMap, MapMarker } from '@angular/google-maps';
import { AngularFireStorage, AngularFireUploadTask } from '@angular/fire/storage';
import { Observable, of } from 'rxjs';
import { finalize, map } from 'rxjs/operators';
import RatePic from 'src/app/models/ratepic.model';
import { RatePicService } from 'src/app/services/ratepic.service';
import { AngularFireAuth } from '@angular/fire/auth';
interface PlaceMarker {
  place: google.maps.places.PlaceResult;
  marker: MapMarker;
}

@Component({
  selector: 'app-map',
  templateUrl: './map.component.html',
  styleUrls: ['./map.component.css'],
  encapsulation: ViewEncapsulation.None,
  //changeDetection: ChangeDetectionStrategy.OnPush
})
export class MapComponent implements OnInit, AfterViewInit {

  constructor(private afStorage: AngularFireStorage, private ref: ChangeDetectorRef, private ratePicService: RatePicService, private afAuth: AngularFireAuth) {
    this.afAuth.authState.subscribe(user => {
      if (user) this.isLoogedIn = true;
      else this.isLoogedIn = false;
    });
  }

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


  placeMarkers: PlaceMarker[] = [];
  selectedPlace!: google.maps.places.PlaceResult;

  task!: AngularFireUploadTask;

  percentage!: Observable<number>;
  snapshot!: Observable<any>;
  displayUpload: boolean = false;
  files: File[] = [];
  downloadPercentageFixed: number = 0;
  isLoogedIn: boolean = false;
  isUploadCompleted: boolean = false;
  ratePics: RatePic[] = [];

  ngOnInit(): void {
  }

  ngAfterViewInit() {
    this.map.controls[google.maps.ControlPosition.TOP_LEFT].push(
      this.mapSearchFieldContainer.nativeElement,
    );

    this.initCitySearch();
    this.retrievePics();

  }

  retrievePics(): void {
    this.ratePicService.getAll().snapshotChanges().pipe(
      map(changes =>
        changes.map(c =>
          ({ id: c.payload.doc.id, ...c.payload.doc.data() })
        )
      )
    ).subscribe(data => {
      this.ratePics = data;
      console.log(data)
    });
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
        //window.alert("No details available for input: '" + place.name + "'");
        return;
      }
      this.businessSearchField.nativeElement.value = "";
      this.placeMarkers = [];
      //If the place has a geometry, then present it on a map.
      if (place.geometry.viewport) {
        this.map.fitBounds(place.geometry.viewport);
      } else {
        this.map.googleMap?.setCenter(place.geometry.location);
        this.map.googleMap?.setZoom(14);
      }


    });

  }





  placeSearch() {

    const service = new google.maps.places.PlacesService(this.map.googleMap as google.maps.Map);

    const request: google.maps.places.TextSearchRequest = {
      bounds: this.map.getBounds() || this.worldBounds,
      query: this.businessSearchField.nativeElement.value
    };
    this.placeMarkers = [];
    let that = this;
    let map = this.map.googleMap;
    service.textSearch(request, function (results, status) {
      const bounds = new google.maps.LatLngBounds();
      if (status === google.maps.places.PlacesServiceStatus.OK) {
        (results || []).forEach(place => {
          //console.log(place);
          let newMarker: MapMarker = {
            position: place.geometry?.location,
            options: {
              icon: {
                url: place.icon as string,
                size: new google.maps.Size(71, 71),
                origin: new google.maps.Point(0, 0),
                anchor: new google.maps.Point(17, 34),
                scaledSize: new google.maps.Size(25, 25),
                labelOrigin: new google.maps.Point(17, 35),

              },

            },
            //label:`${place.name}` ,
            label: { text: place.name, className: 'marker-labels' } as google.maps.MarkerLabel,
            title: place.name,
          } as MapMarker;
          let newPlaceMarker: PlaceMarker = { place: place, marker: newMarker };
          that.placeMarkers.push(newPlaceMarker);

          if (place.geometry?.viewport) {
            // Only geocodes have viewport.
            bounds.union(place.geometry.viewport);
          } else {
            bounds.extend(place.geometry?.location || new google.maps.LatLng(0, 0));
          }

        });
        that.ref.detectChanges();
      }
      map?.fitBounds(bounds);
    });
  }

  onImageUpload(event: any) {
    console.log('the upload is begin');
    // The storage path
    this.files.push(...event.addedFiles);
    const theFile = this.files[0];
    const path = `pics/${Date.now()}_${theFile.name}`;

    // Reference to storage bucket
    const ref = this.afStorage.ref(path);

    // The main task
    this.task = this.afStorage.upload(path, theFile);

    // Progress monitoring
    this.task.percentageChanges().subscribe((p) => {
      this.downloadPercentageFixed = Math.round(p || 0);
    });

    this.task.snapshotChanges().pipe(
      finalize(() => {
        ref.getDownloadURL().subscribe(downloadUrl => {
          let newitem: RatePic = {
            url: downloadUrl,
            placeId: this.selectedPlace.place_id,
            placeName: this.selectedPlace.name,
            lat: this.selectedPlace.geometry?.location?.lat(),
            lng: this.selectedPlace.geometry?.location?.lng()
          } as RatePic;
          console.log('new item', newitem);
          this.ratePicService.create(newitem).then(() => {
            this.isUploadCompleted = true;
            this.retrievePics();
            console.log('Created new item successfully!');
          });
        });
      })
    ).subscribe();

  }

  onUploadRemove(event: any) {
    this.files.splice(this.files.indexOf(event), 1);
  }

  markerClicked(placeMarker: PlaceMarker) {
    console.log(placeMarker.place);
    this.selectedPlace = placeMarker.place;
    this.displayUpload = true;
    this.downloadPercentageFixed = 0;
    this.files = [];
    this.isUploadCompleted = false;
  }

}
