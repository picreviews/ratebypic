import { Component, OnInit } from '@angular/core';
import RatePic from 'src/app/models/ratepic.model';
import { RatePicService } from 'src/app/services/ratepic.service';

@Component({
  selector: 'app-add-tutorial',
  templateUrl: './add-tutorial.component.html',
  styleUrls: ['./add-tutorial.component.css']
})
export class AddTutorialComponent implements OnInit {

  ratePic: RatePic = new RatePic();
  submitted = false;

  constructor(private ratePicService: RatePicService) { }

  ngOnInit(): void {
  }

  savePic(): void {
    this.ratePicService.create(this.ratePic).then(() => {
      console.log('Created new item successfully!');
      this.submitted = true;
    });
  }

  newPic(): void {
    this.submitted = false;
    this.ratePic = new RatePic();
  }

}
