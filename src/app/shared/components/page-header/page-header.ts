import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-page-header',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './page-header.html',
  styleUrl: './page-header.css',
})
export class PageHeader {
  @Input() badge = 'Sistema MiTutoría IUB';
  @Input() titulo = '';
  @Input() subtitulo = '';
}
