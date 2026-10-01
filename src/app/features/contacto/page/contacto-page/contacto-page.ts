import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Header } from '../../../../shared/components/header/header';
import { Nav } from '../../../../shared/components/nav/nav';
import { Footer } from '../../../../shared/components/footer/footer';

@Component({
  imports: [RouterOutlet, Header, Nav, Footer],
  selector: 'app-contacto-page',
  styleUrl: './contacto-page.css',
  templateUrl: './contacto-page.html',
})
export class ContactoPage {

}
