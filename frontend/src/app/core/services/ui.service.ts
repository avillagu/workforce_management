import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class UiService {
  // Estado del sidebar (inicia colapsado por defecto para maximizar espacio)
  private readonly _isSidebarExpanded = signal<boolean>(false);
  readonly isSidebarExpanded = this._isSidebarExpanded.asReadonly();

  toggleSidebar(): void {
    this._isSidebarExpanded.update(v => !v);
  }

  setSidebarExpanded(expanded: boolean): void {
    this._isSidebarExpanded.set(expanded);
  }
}
