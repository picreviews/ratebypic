import { Component, OnInit } from '@angular/core';
import { RatePicService } from 'src/app/services/ratepic.service';
import { map } from 'rxjs/operators';
import RatePic from 'src/app/models/ratepic.model';

@Component({
  selector: 'app-tutorials-list',
  templateUrl: './tutorials-list.component.html',
  styleUrls: ['./tutorials-list.component.css']
})
export class TutorialsListComponent implements OnInit {

  ratePics?: RatePic[];
  currentPic?: RatePic;
  currentIndex = -1;
  title = '';

  constructor(private ratePicService: RatePicService) { }

  ngOnInit(): void {
    this.retrievePics();
  }

  refreshList(): void {
    this.currentPic = undefined;
    this.currentIndex = -1;
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
    });
  }

  setActivePic(pic: RatePic, index: number): void {
    this.currentPic = pic;
    this.currentIndex = index;
  }

}
