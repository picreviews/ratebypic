import { Injectable } from '@angular/core';
import { AngularFirestore, AngularFirestoreCollection } from '@angular/fire/firestore';
import RatePic from '../models/ratepic.model';
import { AngularFireAuth } from '@angular/fire/auth';

@Injectable({
  providedIn: 'root'
})
export class RatePicService {
  private dbPath = '/ratepics';
  userId: string = '';

  ratePicRef: AngularFirestoreCollection<RatePic>;

  constructor(private db: AngularFirestore, private afAuth: AngularFireAuth) {
    this.ratePicRef = db.collection(this.dbPath, ref => ref.orderBy('createdDateTime', 'desc'));
    this.afAuth.authState.subscribe(user => {
      if (user) this.userId = user.uid;
    });
  }

  getAll(): AngularFirestoreCollection<RatePic> {
    return this.ratePicRef;
  }

  create(pic: RatePic): any {
    pic.userId = this.userId;
    pic.createdDateTime= new Date();
    return this.ratePicRef.add({ ...pic });
  }

  update(id: string, data: any): Promise<void> {
    return this.ratePicRef.doc(id).update(data);
  }

  delete(id: string): Promise<void> {
    return this.ratePicRef.doc(id).delete();
  }
}
