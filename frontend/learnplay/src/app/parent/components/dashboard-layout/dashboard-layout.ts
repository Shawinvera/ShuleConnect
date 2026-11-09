import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ParentNavbar } from '../parent-navbar/parent-navbar';

@Component({
  selector: 'app-dashboard-layout',
  imports: [ParentNavbar, RouterOutlet],
  templateUrl: './dashboard-layout.html',
  styleUrl: './dashboard-layout.css',
})
export class DashboardLayout {

}