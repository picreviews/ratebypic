import { AngularFireAuth } from '@angular/fire/auth';
export default class RatePic {
  id?: string;
  url?: string;
  userId?: string;
  placeName?: string;
  placeId?: string;
  placeIcon?: string;
  lat?: number;
  lng?: number;
  createdDateTime?: Date;
  geoHash?: string;
}
