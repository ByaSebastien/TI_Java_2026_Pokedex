# 7. Le composant `Pokedex` : signals, computed et OnPush

Fichier : `src/app/pages/pokedex/pokedex.ts`

## 7.1 Le décorateur `@Component`

```ts
@Component({
  selector: 'app-pokedex',
  imports: [],
  templateUrl: './pokedex.html',
  styleUrl: './pokedex.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Pokedex { ... }
```

| Propriété | Rôle |
|-----------|------|
| `selector` | Nom de la balise HTML du composant (non utilisé ici car il est affiché par le router) |
| `imports` | Composants/directives/pipes utilisés dans le template. Vide : `@for` et `@if` sont intégrés à Angular, pas besoin de les importer |
| `templateUrl` / `styleUrl` | Fichiers HTML et SCSS du composant |
| `changeDetection: OnPush` | Voir §7.7 |

## 7.2 Injection du service

```ts
private readonly _pokeService = inject(PokeService);
```

On récupère l'instance unique de `PokeService` (voir fiche 3). `private` car seul le composant l'utilise,
`readonly` car on ne la remplace jamais.

## 7.3 Les signals : l'état du composant

```ts
readonly pokeResult: WritableSignal<PokeResultDto | undefined> = signal(undefined);
readonly selectedPokemon: WritableSignal<PokeDetailsDto | undefined> = signal(undefined);
```

Un **signal** est une « boîte » qui contient une valeur et qui **prévient Angular quand elle change**.

| Action | Syntaxe |
|--------|---------|
| Créer avec une valeur initiale | `signal(valeurInitiale)` |
| **Lire** la valeur | `pokeResult()` ← on l'appelle comme une fonction |
| **Remplacer** la valeur | `pokeResult.set(nouvelleValeur)` |
| Modifier à partir de l'ancienne | `compteur.update((v) => v + 1)` |

Ici :

- `pokeResult` contient la page courante de la liste (`undefined` tant que la réponse n'est pas arrivée) ;
- `selectedPokemon` contient le Pokémon cliqué (`undefined` tant que rien n'est sélectionné).

Le type `WritableSignal<...>` est écrit explicitement pour la lisibilité ; il pourrait être déduit :
`signal<PokeResultDto | undefined>(undefined)`.

## 7.4 Les `computed` : des valeurs dérivées

Un `computed` est un signal **en lecture seule** dont la valeur est **calculée à partir d'autres signals**.
Angular le recalcule **automatiquement** quand un des signals lus à l'intérieur change.

```ts
readonly primaryTypeClass = computed(() => {
  const pokemon = this.selectedPokemon();      // ← dépendance : selectedPokemon
  if (!pokemon?.types.length) return '';
  return this.typeClass(pokemon.types[0]);     // 'Plante' → 'grass'
});

readonly detailPanelClass = computed(() => {
  const tc = this.primaryTypeClass();          // ← dépendance : primaryTypeClass
  return tc ? `poke-detail poke-detail--${tc}` : 'poke-detail';
});
```

Les computed peuvent **s'enchaîner** :

```
selectedPokemon  ──▶  primaryTypeClass  ──▶  detailPanelClass  ──▶  template [class]
   (signal)              (computed)              (computed)
```

Quand on clique sur un Pokémon, `selectedPokemon.set(...)` met à jour toute la chaîne, et donc la classe CSS du panneau.

```ts
readonly statsWithLabels = computed<StatEntry[]>(() => {
  const pokemon = this.selectedPokemon();
  if (!pokemon) return [];
  return pokemon.stats.map((value, i) => ({
    label: this.STAT_LABELS[i] ?? `Stat ${i + 1}`,
    value,
    percent: Math.min(Math.round((value / 255) * 100), 100),
    color: this.STAT_COLORS[i] ?? 'hp',
  }));
});
```

Transforme `[45, 49, 49, 65, 65, 45]` en un tableau d'objets prêts pour le template :

```js
[
  { label: 'PV',      value: 45, percent: 18, color: 'hp'  },
  { label: 'Attaque', value: 49, percent: 19, color: 'atk' },
  ...
]
```

- L'index `i` sert à associer chaque stat à son libellé et à sa couleur (l'API renvoie toujours les stats dans le même ordre).
- `??` (*nullish coalescing*) : valeur de secours si l'élément n'existe pas.
- `255` est la valeur maximale d'une stat de base ; `percent` sert à la largeur de la barre.

> 💡 **Pourquoi `computed` plutôt qu'une méthode appelée dans le template ?**
> Un `computed` **mémorise** son résultat : il n'est recalculé que si `selectedPokemon` change.
> Une méthode appelée dans le template serait réexécutée à chaque cycle de détection de changements.

## 7.5 Chargement des données : du service au signal

```ts
constructor() {
  this.getPokemons();
}

getPokemons(url: string = `${environment.POKE_API_URL}/pokemon?offset=0&limit=12`) {
  this._pokeService.getPokemons(url).subscribe((result) => {
    this.pokeResult.set(result);
  });
}

getPokemon(url: string) {
  this._pokeService.getPokemonDetails(url).subscribe((details) => {
    this.selectedPokemon.set(details);
  });
}
```

- Le **constructeur** lance le chargement de la première page dès la création du composant.
- Le paramètre `url` a une **valeur par défaut** (première page) : appelé sans argument, `getPokemons()` charge la page 1.
- C'est ici que se trouve le `subscribe()` : c'est lui qui **déclenche** toutes les requêtes préparées par le service.
- Dans le callback, on **stocke** le résultat dans le signal avec `.set(...)` → le template se met à jour.

```
clic / constructeur ─▶ service.getX(url) ─▶ .subscribe() ─▶ requêtes HTTP ─▶ DTO ─▶ signal.set(DTO) ─▶ template
```

> 📝 Pas besoin de `unsubscribe()` ici : un Observable `HttpClient` se **termine tout seul**
> après avoir émis sa réponse, l'abonnement est alors automatiquement libéré.

## 7.6 La pagination

```ts
previous() {
  if (!this.pokeResult()?.previous) return;
  this.getPokemons(this.pokeResult()!.previous);
}

next() {
  if (!this.pokeResult()?.next) return;
  this.getPokemons(this.pokeResult()!.next);
}
```

- L'API fournit directement l'URL de la page suivante/précédente (`next`/`previous`) : on la réutilise telle quelle.
- `?.` (*optional chaining*) : si `pokeResult()` est `undefined`, l'expression vaut `undefined` au lieu de planter.
- La garde `if (...) return;` évite un appel si on est sur la première/dernière page
  (en plus du `[disabled]` sur les boutons dans le template).
- Le `!` après `pokeResult()` est sûr car la ligne précédente a vérifié que la valeur existe.

## 7.7 `ChangeDetectionStrategy.OnPush`

Par défaut, Angular revérifie **tous** les composants après chaque événement (clic, réponse HTTP, timer…).

Avec `OnPush`, Angular ne revérifie le composant **que** si :

- un **signal lu dans le template** a changé ;
- un `@Input` a reçu une nouvelle référence ;
- un événement s'est produit **dans** ce composant.

Les signals et `OnPush` vont donc parfaitement ensemble : chaque `.set(...)` prévient Angular
précisément du composant à mettre à jour. C'est plus performant et c'est l'approche recommandée aujourd'hui.

## 7.8 La méthode utilitaire `typeClass`

```ts
private readonly TYPE_MAP: Record<string, string> = {
  'Normal': 'normal', 'Feu': 'fire', 'Eau': 'water', ...
};

typeClass(frenchType: string): string {
  return this.TYPE_MAP[frenchType] ?? 'normal';
}
```

- `Record<string, string>` : un objet dont les clés et les valeurs sont des chaînes (un dictionnaire).
- Convertit le nom français d'un type (reçu du service) en identifiant anglais, utilisé pour construire un nom de classe CSS.
- Méthode **publique** (pas de `private`) car elle est appelée depuis le template.
