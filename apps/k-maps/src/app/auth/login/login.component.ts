import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';

import { IconDirective } from '@coreui/icons-angular';
import {
  ButtonDirective,
  CardBodyComponent,
  CardComponent,
  ColComponent,
  ContainerComponent,
  FormControlDirective,
  FormDirective,
  InputGroupComponent,
  InputGroupTextDirective,
  RowComponent
} from '@coreui/angular';

import { AuthService } from '../../../services/AuthService';

type LoginResponse = {
  token: string;
  expiresAt: string | number | Date;
};

@Component({
  selector: 'app-login',
  standalone: true,
  templateUrl: './login.component.html',
  imports: [
    // angular
    CommonModule,
    ReactiveFormsModule,

    // coreui
    ContainerComponent,
    RowComponent,
    ColComponent,
    CardComponent,
    CardBodyComponent,
    FormDirective,
    InputGroupComponent,
    InputGroupTextDirective,
    FormControlDirective,
    ButtonDirective,
    IconDirective
  ]
})
export class LoginComponent {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);

  loading = false;
  error: string | null = null;

  form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]]
  });

  // used by template: f.email / f.password
  get f() {
    return this.form.controls;
  }

  private toIso(expiresAt: string | number | Date): string {
    if (expiresAt instanceof Date) return expiresAt.toISOString();
    if (typeof expiresAt === 'number') return new Date(expiresAt).toISOString();
    // assume string (could already be ISO)
    return expiresAt;
  }

  submit(): void {
    this.error = null;

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { email, password } = this.form.getRawValue();
    this.loading = true;

    this.auth
      .login(email, password)
      .then((res: LoginResponse) => {
        if (!res?.token || !res?.expiresAt) {
          throw new Error('Invalid login response');
        }

        const expiresAtIso = this.toIso(res.expiresAt);
        this.auth.setToken(res.token, expiresAtIso);

        this.router.navigateByUrl('/');
      })
      .catch((err: unknown) => {
        const msg =
          err && typeof err === 'object' && 'message' in err
            ? String((err as any).message)
            : null;

        this.error = msg || 'Invalid email or password';
      })
      .finally(() => {
        this.loading = false;
      });
  }
}
