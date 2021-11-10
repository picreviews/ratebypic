import { Injectable } from '@angular/core';
import { AngularFirestore, AngularFirestoreCollection } from '@angular/fire/firestore';
import RatePic from '../models/ratepic.model';

@Injectable({
  providedIn: 'root'
})
export class RatePicService {
  private dbPath = '/ratepics';

  ratePicRef: AngularFirestoreCollection<RatePic>;

  constructor(private db: AngularFirestore) {
    this.ratePicRef = db.collection(this.dbPath);
  }

  getAll(): AngularFirestoreCollection<RatePic> {
    return this.ratePicRef;
  }

  create(pic: RatePic): any {
    return this.ratePicRef.add({ ...pic });
  }

  update(id: string, data: any): Promise<void> {
    return this.ratePicRef.doc(id).update(data);
  }

  delete(id: string): Promise<void> {
    return this.ratePicRef.doc(id).delete();
  }
}
