import { Component } from '@angular/core';
import { AsyncPipe, NgFor, NgIf } from '@angular/common';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-toast-host',
  standalone: true,
  imports: [AsyncPipe, NgFor, NgIf],
  templateUrl: './toast-host.component.html',
  styleUrls: ['./toast-host.component.scss'],
})
export class ToastHostComponent {
  constructor(public toast: ToastService) {}
}
