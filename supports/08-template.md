# 8. Le template du Pokédex

Fichier : `src/app/pages/pokedex/pokedex.html`

On ne s'intéresse ici qu'à la **syntaxe Angular** (bindings, événements, contrôle de flux), pas au CSS.

## 8.1 Rappel des syntaxes de base

| Syntaxe | Nom | Sens | Exemple du projet |
|---------|-----|------|-------------------|
| `{{ expr }}` | Interpolation | TS → texte affiché | `{{ p.name }}` |
| `[prop]="expr"` | Property binding | TS → propriété d'un élément | `[src]="p.sprite"` |
| `(event)="expr"` | Event binding | Événement → appel TS | `(click)="next()"` |
| `@for` / `@if` | Contrôle de flux | Répéter / afficher conditionnellement | `@for (p of ...; track p.name)` |

⚠️ Dans le template, un signal se **lit en l'appelant** : `pokeResult()`, `selectedPokemon()`, `statsWithLabels()`.

## 8.2 Les boutons de navigation

```html
<button
  class="nav-arrow"
  type="button"
  (click)="previous()"
  [disabled]="!pokeResult()?.previous"
  aria-label="Page precedente"
>
```

- `(click)="previous()"` : appelle la méthode `previous()` du composant au clic.
- `[disabled]="!pokeResult()?.previous"` : le bouton est désactivé s'il n'y a pas de page précédente.
  - `pokeResult()` lit le signal ;
  - `?.` évite une erreur tant que `pokeResult()` vaut `undefined` (données pas encore chargées) ;
  - `!` inverse : pas d'URL `previous` → `disabled = true`.

Comme `pokeResult` est un signal, le bouton se réactive/désactive **automatiquement** quand on change de page.

## 8.3 La liste : `@for`

```html
<ul class="poke-list" role="list">
  @for (p of pokeResult()?.results; track p.name) {
    <li class="poke-card" tabindex="0" (click)="getPokemon(p.url)">
      <img [src]="p.sprite" [alt]="p.name" width="100" height="100" loading="lazy" decoding="async">
      <p>{{ p.name }}</p>
    </li>
  }
</ul>
```

- `@for (p of liste; track ...)` répète le bloc pour chaque élément ; `p` est l'élément courant (un `PokeSimpleDto`).
- `pokeResult()?.results` : tant que les données ne sont pas arrivées, cela vaut `undefined` et `@for` n'affiche simplement rien.
- `track p.name` est **obligatoire** : il donne un identifiant unique à chaque élément. Quand la liste change,
  Angular s'en sert pour savoir quels éléments du DOM il peut **réutiliser** au lieu de tout recréer.
- `(click)="getPokemon(p.url)"` : on passe l'URL du Pokémon cliqué à la méthode du composant,
  qui appellera `getPokemonDetails()` du service.
- `[src]="p.sprite"` / `[alt]="p.name"` : property bindings vers les propriétés de l'image.
- `{{ p.name }}` : affiche le nom (déjà en français grâce au service).

> 💡 `@for` accepte aussi un bloc `@empty { ... }` pour afficher un message quand la liste est vide.

## 8.4 La classe dynamique du panneau

```html
<div [class]="detailPanelClass()">
```

`[class]` remplace l'attribut `class` par la valeur du computed `detailPanelClass()`,
par exemple `"poke-detail poke-detail--grass"`. La classe change dès qu'un autre Pokémon est sélectionné.

## 8.5 Affichage conditionnel : `@if … as … @else`

```html
@if (selectedPokemon(); as pokemon) {
  <!-- fiche détaillée -->
} @else {
  <!-- message "Sélectionne un Pokémon !" -->
}
```

- Si `selectedPokemon()` contient une valeur (*truthy*), on affiche le premier bloc, sinon le bloc `@else`.
- `as pokemon` crée une **variable locale** contenant la valeur du signal. Avantages :
  - on écrit `pokemon.name` au lieu de `selectedPokemon()!.name` partout ;
  - TypeScript sait que `pokemon` **n'est pas `undefined`** dans ce bloc.

## 8.6 Les types : `@for` imbriqué et interpolation dans une classe

```html
@for (type of pokemon.types; track type) {
  <span class="poke-detail__type-badge type--{{ typeClass(type) }}" role="listitem">{{ type }}</span>
}
```

- `pokemon.types` est un simple tableau de chaînes (`['Plante', 'Poison']`) ; on peut donc tracker la valeur elle-même : `track type`.
- `class="... type--{{ typeClass(type) }}"` : l'interpolation fonctionne aussi **dans un attribut**.
  `typeClass('Plante')` renvoie `'grass'` → classe `type--grass`.

## 8.7 Image et description

```html
<img class="poke-detail__sprite" [src]="pokemon.sprite" [alt]="pokemon.name" ...>

<p class="poke-detail__description">{{ pokemon.description }}</p>
```

Rien de nouveau : property bindings et interpolation, sur la variable locale `pokemon`.

## 8.8 Les statistiques : bindings d'attributs et de style

```html
@for (stat of statsWithLabels(); track stat.label) {
  <div class="poke-detail__stat-row">
    <dt class="poke-detail__stat-label">{{ stat.label }}</dt>
    <dd class="poke-detail__stat-value">{{ stat.value }}</dd>
    <div
      class="poke-detail__stat-bar"
      role="progressbar"
      [attr.aria-valuenow]="stat.value"
      [attr.aria-valuemin]="0"
      [attr.aria-valuemax]="255"
      [attr.aria-label]="stat.label + ': ' + stat.value + '/255'"
    >
      <div
        class="poke-detail__stat-fill stat-fill--{{ stat.color }}"
        [style.width.%]="stat.percent"
      ></div>
    </div>
  </div>
}
```

- On boucle sur le **computed** `statsWithLabels()` (voir fiche 7), pas directement sur `pokemon.stats` :
  le template reçoit des données déjà prêtes (libellé, valeur, pourcentage, couleur).
- `[attr.aria-valuenow]="..."` : **attribute binding**. Les attributs `aria-*` n'existent pas comme propriétés
  de l'élément DOM, on ne peut donc pas écrire `[aria-valuenow]`. Le préfixe `attr.` indique à Angular
  de définir l'**attribut HTML**.
- `[attr.aria-label]="stat.label + ': ' + stat.value + '/255'"` : on peut écrire une expression (ici une concaténation).
- `[style.width.%]="stat.percent"` : **style binding** avec unité. Si `stat.percent` vaut `18`,
  Angular applique `style="width: 18%"`. On aurait pu écrire `[style.width]="stat.percent + '%'"`.

## 8.9 Résumé du flux complet

```
1. Le composant est créé
      └─ constructor() → getPokemons() → subscribe → pokeResult.set(page1)
                                                       └─ @for affiche les 12 cartes

2. Clic sur ←/→
      └─ (click)="next()" → getPokemons(next) → pokeResult.set(page2)
                                                  └─ @for met à jour les cartes, [disabled] se recalcule

3. Clic sur une carte
      └─ (click)="getPokemon(p.url)" → subscribe → selectedPokemon.set(details)
                                                    ├─ @if affiche la fiche
                                                    ├─ detailPanelClass() change la classe du panneau
                                                    └─ statsWithLabels() recalcule les barres
```
