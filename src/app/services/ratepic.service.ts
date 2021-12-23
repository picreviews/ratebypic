import { Injectable } from '@angular/core';
import { AngularFirestore, AngularFirestoreCollection, AngularFirestoreDocument } from '@angular/fire/firestore';
import RatePic from '../models/ratepic.model';
import { AngularFireAuth } from '@angular/fire/auth';
import * as geofire from "geofire-common";
import * as turf from "@turf/turf";
import { Observable, zip } from 'rxjs';
import { combineLatest } from 'rxjs';
import { environment } from '../../environments/environment';
import * as firebase from 'firebase';

@Injectable({
  providedIn: 'root'
})
export class RatePicService {
  private dbPath = '/ratepics';
  private counterDbPath = '/user_pic_counts';
  userId: string = '';

  ratePicRef: AngularFirestoreCollection<RatePic>;
  counterRef!: AngularFirestoreDocument;

  constructor(private db: AngularFirestore, private afAuth: AngularFireAuth) {
    this.ratePicRef = db.collection(this.dbPath);
    this.afAuth.authState.subscribe(user => {
      if (user) {
        this.userId = user.uid;
        this.counterRef = db.doc(this.counterDbPath + "/" + this.userId);
      }
    });
  }

  getAll(lastDocToGetNextPage: RatePic | null): Observable<RatePic[]> {
    return this.db.collection<RatePic>(this.dbPath, ref => {
      let query = ref
        .limit(environment.picsPageSize || 10)
        .orderBy('createdDateTime', 'desc')
      if (lastDocToGetNextPage) {
        query = query.startAfter(lastDocToGetNextPage.createdDateTime)
      };
      return query;
    }).valueChanges({ idField: 'id' })
  }

  filterByPlaceId(placeIds: string[] = []): Observable<RatePic[][]> {

    const observables: Observable<RatePic[]>[] = [];

    while (placeIds.length) {
      // firestore limits batches to 10
      const batch = placeIds.splice(0, 10);
      const collection: AngularFirestoreCollection<RatePic> = this.db.collection(this.dbPath, ref => ref
        .where('placeId', 'in', batch)
        .orderBy('createdDateTime', 'desc')
      );
      observables.push(collection.valueChanges({ idField: 'id' }))
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
      const collection: AngularFirestoreCollection<RatePic> = this.db.collection(this.dbPath, ref => ref
        .orderBy('geoHash')
        .orderBy('createdDateTime', 'desc')
        .startAt(b[0])
        .endAt(b[1])
      );
      observables.push(collection.valueChanges({ idField: 'id' }))
    }

    return combineLatest(observables);
  }

  create(pic: RatePic): any {
    pic.userId = this.userId;
    pic.createdDateTime = new Date();
    pic.geoHash = geofire.geohashForLocation([pic.lat as number, pic.lng as number]);
    console.log(pic);
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
