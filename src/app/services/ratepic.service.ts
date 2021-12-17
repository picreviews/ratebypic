import { Injectable } from '@angular/core';
import { AngularFirestore, AngularFirestoreCollection, DocumentChangeAction } from '@angular/fire/firestore';
import RatePic from '../models/ratepic.model';
import { AngularFireAuth } from '@angular/fire/auth';
import * as geofire from "geofire-common";
import * as turf from "@turf/turf";
import { forkJoin, Observable, zip } from 'rxjs';
import { combineLatest } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class RatePicService {
  private dbPath = '/ratepics';
  userId: string = '';

  ratePicRef: AngularFirestoreCollection<RatePic>;
  lastDocInResponseForPaging: RatePic;

  constructor(private db: AngularFirestore, private afAuth: AngularFireAuth) {
    this.ratePicRef = db.collection(this.dbPath);
    this.lastDocInResponseForPaging = {};
    this.afAuth.authState.subscribe(user => {
      if (user) this.userId = user.uid;
    });
  }

  getAll(placeIds: string[] = []): Observable<RatePic[][]> {

    const observables: Observable<RatePic[]>[] = [];

    if (placeIds.length > 0) {
      while (placeIds.length) {
        // firestore limits batches to 10
        const batch = placeIds.splice(0, 10);
        const collection: AngularFirestoreCollection<RatePic> = this.db.collection(this.dbPath, ref => ref
          .where('placeId', 'in', batch)
          .orderBy('createdDateTime', 'desc')
        );
        observables.push(collection.valueChanges())
      }
    }
    else {
      if (this.lastDocInResponseForPaging.id) {
        //next page
        console.log('next page', this.lastDocInResponseForPaging);
        const collection: AngularFirestoreCollection<RatePic> = this.db.collection(this.dbPath, ref => ref
          .limit(3)
          .orderBy('createdDateTime', 'desc')
          .orderBy('id') //for paging accuracy
          .startAfter(this.lastDocInResponseForPaging.createdDateTime, this.lastDocInResponseForPaging.id)
        );
        observables.push(collection.valueChanges())
      }
      else {
        //first page
        const collection: AngularFirestoreCollection<RatePic> = this.db.collection(this.dbPath, ref => ref
          .limit(3)
          .orderBy('createdDateTime', 'desc')
          .orderBy('id') //for paging accuracy
        );
        observables.push(collection.valueChanges())
      }
    }
    return combineLatest(observables);
  }

  getAllByBounds(swLngLat: number[], neLngLat: number[]): Observable<RatePic[][]> {
    const from = turf.point(swLngLat);
    const to = turf.point(neLngLat);
    const distanceKm = turf.distance(from, to);
    const features = turf.points([swLngLat, neLngLat]);
    const center = turf.center(features);
    const radiusInM = distanceKm / 2 * 1000;
    const bounds = geofire.geohashQueryBounds([center.geometry.coordinates[1], center.geometry.coordinates[0]], radiusInM);

    const observables: Observable<RatePic[]>[] = [];
    for (const b of bounds) {
      console.log(b);
      const collection: AngularFirestoreCollection<RatePic> = this.db.collection(this.dbPath, ref => ref
        .orderBy('geoHash')
        .orderBy('createdDateTime', 'desc')
        .startAt(b[0])
        .endAt(b[1])
      );
      observables.push(collection.valueChanges())
    }

    return combineLatest(observables);
  }

  create(pic: RatePic): any {
    pic.userId = this.userId;
    pic.createdDateTime = new Date();
    pic.geoHash = geofire.geohashForLocation([pic.lat as number, pic.lng as number]);
    return this.ratePicRef.add({ ...pic });
  }

  update(id: string, data: RatePic): Promise<void> {
    data.geoHash = geofire.geohashForLocation([data.lat as number, data.lng as number]);
    return this.ratePicRef.doc(id).update(data);
  }

  delete(id: string): Promise<void> {
    return this.ratePicRef.doc(id).delete();
  }
}
