import { Component } from '@angular/core';
import { AngularFireAuth } from '@angular/fire/auth';
import { Observable, EMPTY } from 'rxjs';
import { shareReplay, tap, filter, map, first } from 'rxjs/operators';
import { Router } from '@angular/router';
import { FirebaseUISignInSuccessWithAuthResult } from 'firebaseui-angular';


@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  title = 'This is a test app';
  displaySignIn: boolean = false;

  currentUser$: Observable<string> = this.afAuth.user.pipe(shareReplay(1)).pipe(
    filter((obj: any) => !!obj),
    map((user) => user.email)
  );

  constructor(private afAuth: AngularFireAuth, private router: Router) { }

  successLoggedin(signInSuccessData: FirebaseUISignInSuccessWithAuthResult) {
    this.displaySignIn=false;
    this.currentUser$ = this.afAuth.user.pipe(shareReplay(1)).pipe(
      filter((obj: any) => !!obj),
      map((user) => user.email)
    );
  }

  logout() {
    this.afAuth.signOut().then(() => {
      this.currentUser$ = EMPTY;
    });
  }
}
