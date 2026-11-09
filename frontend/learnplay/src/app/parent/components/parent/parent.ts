import { Component } from '@angular/core';
import { ParentNavbar } from '../parent-navbar/parent-navbar';
import { ParentPage } from '../parent-page/parent-page';

@Component({
  selector: 'app-parent',
  imports: [ParentNavbar, ParentPage],
  templateUrl: './parent.html',
  styleUrl: './parent.css',
})
export class Parent {

}
