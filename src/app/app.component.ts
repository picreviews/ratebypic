import { Component } from '@angular/core';
import {AngularFireAuth} from '@angular/fire/auth';
import {Observable}         from 'rxjs';
import {shareReplay, tap, filter, map} from 'rxjs/operators';
import {Router}           from '@angular/router';


@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  title = 'This is a test app';
  displaySignIn: boolean = false;

  currentUser$: Observable<string> = this.angularFireAuth.user.pipe(shareReplay(1)).pipe(
    filter((obj: any)=> !!obj),
    map((user) => user.email)
  );

  constructor(private angularFireAuth: AngularFireAuth, private router: Router) { }

  logout() {
    this.angularFireAuth.signOut().then(() => {
      this.router.navigate(['/'])
    });
  }
}
