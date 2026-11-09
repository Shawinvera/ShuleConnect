import { Component } from '@angular/core';
import { ProfileEdit } from './profile-edit';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [ProfileEdit],
  templateUrl: './profile.html',
  styleUrls: ['./profile.css']
})
export class Profile {

}
