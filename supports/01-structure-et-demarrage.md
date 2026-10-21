# 1. Structure et démarrage de l'application

## 1.1 Le point d'entrée : `main.ts`

```ts
bootstrapApplication(App, appConfig)
  .catch((err) => console.error(err));
```

- `bootstrapApplication` démarre Angular avec un **composant racine** (`App`) et une **configuration** (`appConfig`).
- Angular cherche ensuite dans `index.html` la balise qui correspond au `selector` du composant racine :

```html
<body>
  <app-root></app-root>   <!-- remplacée par le template de App -->
</body>
```

Il n'y a pas de `NgModule` : depuis Angular 17+, les applications sont **standalone** par défaut.

## 1.2 La configuration globale : `app.config.ts`

```ts
export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideHttpClient(),
  ]
};
```

Les `providers` enregistrent des **services disponibles dans toute l'application** :

| Provider | Rôle |
|----------|------|
| `provideBrowserGlobalErrorListeners()` | Capture les erreurs non gérées du navigateur et les remonte à Angular |
| `provideRouter(routes)` | Active le routing avec nos routes |
| `provideHttpClient()` | **Indispensable** pour pouvoir injecter `HttpClient` dans le service |

> ⚠️ Oublier `provideHttpClient()` provoque l'erreur `NullInjectorError: No provider for HttpClient!`
> dès que le service est utilisé.

## 1.3 Le composant racine : `app.ts` / `app.html`

```ts
@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App { ... }
```

```html
<header><h1>Pokedex</h1></header>
<main>
  <router-outlet/>
</main>
<footer>© 2026 Pokedex App. All rights reserved.</footer>
```

- `<router-outlet/>` est l'**emplacement** où le router affiche le composant correspondant à l'URL.
- Pour pouvoir l'utiliser dans le template, il faut l'ajouter dans `imports: [RouterOutlet]`.
  En standalone, **chaque composant déclare lui-même ce qu'il utilise** dans son template.

Le header et le footer restent affichés en permanence ; seul le contenu de `<main>` change selon la route.

## 1.4 Les routes : `app.routes.ts`

```ts
export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/pokedex/pokedex').then((m) => m.Pokedex),
  },
];
```

- `path: ''` → la route par défaut (`http://localhost:4200/`).
- `loadComponent` → **lazy loading** : le code du composant `Pokedex` est placé dans un fichier JS séparé,
  téléchargé seulement quand on arrive sur cette route.

Comparaison :

```ts
// Chargement immédiat (eager) : Pokedex est inclus dans le bundle principal
{ path: '', component: Pokedex }

// Chargement différé (lazy) : Pokedex est téléchargé à la demande
{ path: '', loadComponent: () => import('./pages/pokedex/pokedex').then((m) => m.Pokedex) }
```

`import(...)` renvoie une `Promise` du module ; `.then((m) => m.Pokedex)` récupère la classe exportée.

## 1.5 Les environnements

```ts
// environments/environment.ts
export const environment = {
  POKE_API_URL: 'https://pokeapi.co/api/v2',
};
```

- On centralise l'URL de l'API au lieu de l'écrire en dur partout.
- `environment.development.ts` est utilisé à la place de `environment.ts` lors d'un `ng serve`
  (remplacement configuré dans `angular.json` via `fileReplacements`).
  Ici les deux fichiers ont la même valeur, mais on pourrait par exemple pointer vers une API locale en dev.

Utilisation dans le code :

```ts
import { environment } from '../../../environments/environment';

`${environment.POKE_API_URL}/pokemon?offset=0&limit=12`
// → "https://pokeapi.co/api/v2/pokemon?offset=0&limit=12"
```

On importe **toujours** `environment` (sans `.development`) : c'est Angular CLI qui fait le remplacement.
