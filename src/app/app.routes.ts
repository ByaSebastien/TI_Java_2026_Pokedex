import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/pokedex/pokedex').then((m) => m.Pokedex),
  },
];
