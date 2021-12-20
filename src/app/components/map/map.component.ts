import { Component, OnInit, ViewChild, ViewEncapsulation, AfterViewInit, ElementRef, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { GoogleMap, MapMarker, MapInfoWindow } from '@angular/google-maps';
import { AngularFireStorage, AngularFireUploadTask } from '@angular/fire/storage';
import { Observable, of, zip } from 'rxjs';
import { finalize, map, mergeAll } from 'rxjs/operators';
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
  @ViewChild('mapSearchFieldContainer') mapSearchFieldContainer!: ElementRef;
  @ViewChild('picsListContainer') picsListContainer!: ElementRef;
  @ViewChild(GoogleMap) map!: GoogleMap;

  mapOptions: google.maps.MapOptions = {
    center: { lat: 38.9987208, lng: -77.2538699 },
    clickableIcons: false,
    zoom: 5,
    disableDefaultUI: true,
    fullscreenControl: true,
    zoomControl: true,
    styles: [
      {
        featureType: "poi",
        elementType: "labels",
        stylers: [
          { visibility: "off" }
        ]
      }
    ]
  }
  worldBounds = new google.maps.LatLngBounds(
    new google.maps.LatLng(56.7527, -130.0781),
    new google.maps.LatLng(-29.5352, 154.6874));


  placeMarkers: PlaceMarker[] = [];
  selectedPlace: google.maps.places.PlaceResult = {};
  selectedCity: google.maps.places.PlaceResult | null = null;
  searchKeyword: string = "";
  searchInput: string = "";

  task!: AngularFireUploadTask;

  percentage!: Observable<number>;
  snapshot!: Observable<any>;
  displayGallery: boolean = false;
  files: File[] = [];
  downloadPercentageFixed: number = -1;
  isLoogedIn: boolean = false;
  isUploadCompleted: boolean = false;
  ratePics: RatePic[] = [];
  showDataNotFound: boolean = false;
  lastDocToGetNextPage: RatePic | null = null;
  displayLoadMoreButton: boolean = false;

  imgGalleryResponsiveOptions: any[] = [
    {
      breakpoint: '1024px',
      numVisible: 5
    },
    {
      breakpoint: '960px',
      numVisible: 4
    },
    {
      breakpoint: '768px',
      numVisible: 3
    },
    {
      breakpoint: '560px',
      numVisible: 1
    }
  ];


  ngOnInit(): void {
  }

  ngAfterViewInit() {
    this.map.controls[google.maps.ControlPosition.LEFT_TOP].push(
      this.mapSearchFieldContainer.nativeElement
    );
    this.map.controls[google.maps.ControlPosition.LEFT_TOP].push(
      this.picsListContainer.nativeElement
    );

    this.map.fitBounds(this.worldBounds);
    this.initCitySearch();
    this.retrieveAllPics();
  }

  retrieveAllPics(): void {
    let subscription = this.ratePicService.getAll(this.lastDocToGetNextPage).subscribe((res) => {
      res.forEach(pic => {
        if (this.ratePics.map(m => m.id).includes(pic.id)) {
          return;
        }
        this.ratePics.push(pic);
        this.lastDocToGetNextPage = pic;
      });
      this.showDataNotFound = this.ratePics.length == 0;
      this.displayLoadMoreButton = res.length > 0;
      subscription.unsubscribe();
    });
  }

  filterPics() {
    let placeIds: string[] = [];
    if (this.selectedPlace.place_id) {
      placeIds = [this.selectedPlace.place_id as string];
    } else if (this.placeMarkers.length > 0) {
      placeIds = this.placeMarkers.map(pm => pm.place.place_id as string);
    }


    if (placeIds.length > 0) {
      this.ratePics = [];
      let subscription = this.ratePicService.filterByPlaceId(placeIds).subscribe((res) => {
        res.reduce((acc, val) => acc.concat(val)).forEach(pic => {
          if (this.ratePics.map(m => m.id).includes(pic.id)) {
            return;
          }
          this.ratePics.push(pic);
        });
        this.showDataNotFound = this.ratePics.length == 0;
        subscription.unsubscribe();
      });
    }

  }

  initCitySearch() {

    const options: google.maps.places.AutocompleteOptions = {
      bounds: this.worldBounds,
      fields: ["address_components", "geometry", "name", "icon", "formatted_address"],
      strictBounds: false,
      types: ["(regions)"],
    };

    const autocomplete = new google.maps.places.Autocomplete(
      this.searchField.nativeElement, options
    );

    autocomplete.addListener("place_changed", () => {
      const place = autocomplete.getPlace();
      this.selectedCity = place;
      if (!place.geometry || !place.geometry.location) {
        // User entered the name of a Place that was not suggested and
        // pressed the Enter key, or the Place Details request failed.
        //window.alert("No details available for input: '" + place.name + "'");
        return;
      }
      this.searchPlacesInTheCity();


    });

  }
  searchPlacesInTheCity() {
    this.searchKeyword = '';
    this.searchInput=''
    this.searchField.nativeElement.value = "";
    this.placeMarkers = [];
    this.ratePics = [];
    this.selectedPlace = {};
    const place = this.selectedCity as google.maps.places.PlaceResult;
    //If the place has a geometry, then present it on a map.
    if (place.geometry?.viewport) {
      this.map.fitBounds(place.geometry.viewport);
      this.map.googleMap?.addListener
    } else if (place.geometry?.location) {
      this.map.googleMap?.setCenter(place.geometry.location);
      this.map.googleMap?.setZoom(14);
    }

    let listenerBoundsChangedFinished = this.map.googleMap?.addListener('idle', () => {
      const bounds = this.map.getBounds() as google.maps.LatLngBounds;
      const sw = bounds.getSouthWest();
      const ne = bounds.getNorthEast();
      let picsObs = this.ratePicService.getAllByBounds([sw.lng(), sw.lat()], [ne.lng(), ne.lat()]);

      this.displayLoadMoreButton = false;
      let subscription = picsObs.subscribe((res) => {
        res.reduce((acc, val) => acc.concat(val)).forEach(pic => {
          if (this.ratePics.map(m => m.id).includes(pic.id)) {
            return;
          }
          this.ratePics.push(pic);
        });
        this.showDataNotFound = this.ratePics.length == 0;
        subscription.unsubscribe();
      });
      if (listenerBoundsChangedFinished) {
        google.maps.event.removeListener(listenerBoundsChangedFinished);
      }
    });
  }

  placeSearch() {
    this.searchKeyword=this.searchInput;
    this.selectedPlace = {};
    this.displayLoadMoreButton=false;
    if (this.selectedCity) {
      if (this.selectedCity.geometry?.viewport) {
        this.map.fitBounds(this.selectedCity.geometry.viewport);
        this.map.googleMap?.addListener
      } else if (this.selectedCity.geometry?.location) {
        this.map.googleMap?.setCenter(this.selectedCity.geometry.location);
        this.map.googleMap?.setZoom(14);
      }
      let listenerBoundsChangedFinished = this.map.googleMap?.addListener('idle', () => {
        this.placeSearchByKeyword();
        if (listenerBoundsChangedFinished) {
          google.maps.event.removeListener(listenerBoundsChangedFinished);
        }
      });
    }
    else{
      this.placeSearchByKeyword();
    }
  }

  placeSearchByKeyword() {

    const service = new google.maps.places.PlacesService(this.map.googleMap as google.maps.Map);

    const request: google.maps.places.PlaceSearchRequest = {
      bounds: this.map.googleMap?.getBounds() || this.worldBounds,
      name: this.searchKeyword,

    };

    this.placeMarkers = [];
    let that = this;
    let map = this.map.googleMap;
    service.nearbySearch(request, function (results, status) {
      const bounds = new google.maps.LatLngBounds();

      if (status === google.maps.places.PlacesServiceStatus.OK) {
        (results || []).forEach(place => {
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
        that.filterPics();
        that.ref.detectChanges();
      }
      map?.fitBounds(bounds);
    });
  }

  onImageUpload(event: any) {
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
            placeIcon: this.selectedPlace.icon,
            lat: this.selectedPlace.geometry?.location?.lat(),
            lng: this.selectedPlace.geometry?.location?.lng()
          } as RatePic;

          this.ratePicService.create(newitem).then(() => {
            this.isUploadCompleted = true;
            this.filterPics()
            setTimeout(() => {
              this.downloadPercentageFixed = -1;
              this.files = [];
            }, 1000);
          });
        });
      })
    ).subscribe();

  }

  onUploadRemove(event: any) {
    this.files.splice(this.files.indexOf(event), 1);
  }

  markerClicked(placeMarker: PlaceMarker) {
    this.selectedPlace = placeMarker.place;
    this.downloadPercentageFixed = -1;
    this.files = [];

    this.filterPics();
  }

  uploadNewPhoto() {
    this.downloadPercentageFixed = -1;
    this.files = [];
    this.isUploadCompleted = false;
    this.displayGallery = false;
  }

  picClicked(pic: RatePic) {

    if (this.selectedPlace.place_id == pic.placeId) {
      return;
    }

    let that = this;

    const service = new google.maps.places.PlacesService(this.map.googleMap as google.maps.Map);

    this.map.googleMap?.setZoom(12);
    this.map.googleMap?.setCenter(new google.maps.LatLng({
      lat: pic.lat as number,
      lng: pic.lng as number
    }));

    service.getDetails(
      { placeId: pic.placeId as string },
      (
        place: google.maps.places.PlaceResult | null,
        status: google.maps.places.PlacesServiceStatus
      ) => {
        if (
          status === "OK" &&
          place &&
          place.geometry &&
          place.geometry.location
        ) {
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
              animation: google.maps.Animation.BOUNCE
            },
            label: { text: place.name, className: 'marker-labels' } as google.maps.MarkerLabel,
            title: place.name,
          } as MapMarker;
          let newPlaceMarker: PlaceMarker = { place: place, marker: newMarker };
          that.placeMarkers = [];
          that.placeMarkers.push(newPlaceMarker);
          that.ref.detectChanges();
          setTimeout(() => {
            that.placeMarkers = [];
            that.ref.detectChanges();
            newPlaceMarker.marker.options.animation = null;
            that.placeMarkers.push(newPlaceMarker);
            that.ref.detectChanges();
          }, 1500);

          that.selectedPlace = place;
          that.filterPics();
          that.ref.detectChanges();

        }
      }
    );

  }


  removeSelectedCity() {
    this.selectedCity = null;
    this.searchKeyword = '';
    this.searchInput='';
    this.map.fitBounds(this.worldBounds);
    let listenerBoundsChangedFinished = this.map.googleMap?.addListener('idle', () => {
      this.ratePics = [];
      this.lastDocToGetNextPage = null;
      this.retrieveAllPics();
      if (listenerBoundsChangedFinished) {
        google.maps.event.removeListener(listenerBoundsChangedFinished);
      }
    });
  }
  removeSelectedKeyword() {
    this.searchKeyword = '';
    this.searchInput='';
    if (this.selectedCity) {
      this.searchPlacesInTheCity();
    }
    else {
      this.map.fitBounds(this.worldBounds);
      let listenerBoundsChangedFinished = this.map.googleMap?.addListener('idle', () => {
        this.ratePics = [];
        this.lastDocToGetNextPage = null;
        this.retrieveAllPics();
        if (listenerBoundsChangedFinished) {
          google.maps.event.removeListener(listenerBoundsChangedFinished);
        }
      });
    }
  }
}
