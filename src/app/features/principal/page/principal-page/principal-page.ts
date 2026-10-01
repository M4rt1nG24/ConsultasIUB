import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Header } from '../../../../shared/components/header/header';
import { Nav } from '../../../../shared/components/nav/nav';
import { Footer } from '../../../../shared/components/footer/footer';

@Component({
  imports: [RouterOutlet, Header, Nav, Footer],
  selector: 'app-principal-page',
  styleUrl: './principal-page.css',
  templateUrl: './principal-page.html',
})
export class PrincipalPage {}
