import { Component ,inject} from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ReportesService } from '../../services/reportes';
import { Footer } from '../../../../shared/components/footer/footer';
import { Nav } from '../../../../shared/components/nav/nav';
import { Header } from '../../../../shared/components/header/header';

@Component({
  imports: [RouterOutlet, Header, Nav, Footer],
  selector: 'app-repotes-page',
  styleUrl: './repotes-page.css',
  templateUrl: './repotes-page.html',
})
export class RepotesPage {
  reportesService = inject(ReportesService);
}
