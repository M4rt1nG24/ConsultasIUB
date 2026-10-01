import { Component,inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import {CommonModule} from '@angular/common';
import { UsuariosService } from '../../services/usuarios';
import { Header } from '../../../../shared/components/header/header';
import { Nav } from '../../../../shared/components/nav/nav';
import { Footer } from '../../../../shared/components/footer/footer';

@Component({
  imports: [RouterOutlet, Header, Nav, Footer],
  selector: 'app-usuarios-page',
  styleUrl: './usuarios-page.css',
  templateUrl: './usuarios-page.html',
})
export class UsuariosPage {
  usuariosService = inject(UsuariosService);
}
 