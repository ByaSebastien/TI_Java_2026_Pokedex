# Supports – Correction de l'exercice Pokédex

Ces fiches expliquent la correction de l'exercice Pokédex, fichier par fichier.
Le CSS/SCSS n'est **pas** expliqué : on se concentre sur ce qui relève d'Angular et de RxJS.

## Ce que fait l'application

1. Au démarrage, elle affiche une liste de 12 Pokémon (nom **en français** + image).
2. Deux flèches permettent de passer à la page précédente / suivante.
3. Un clic sur un Pokémon affiche sa fiche détaillée : nom, types, image, description et statistiques.

Toutes les données viennent de l'API publique [PokéAPI](https://pokeapi.co/).

## Ordre de lecture conseillé

| # | Fiche | Contenu |
|---|-------|---------|
| 1 | [01-structure-et-demarrage.md](01-structure-et-demarrage.md) | Démarrage de l'app, configuration, routing, environnements |
| 2 | [02-modeles-et-dto.md](02-modeles-et-dto.md) | Les interfaces : ce que renvoie l'API vs ce qu'on veut afficher |
| 3 | [03-service-httpclient-observable.md](03-service-httpclient-observable.md) | Le service, `HttpClient` et les bases des Observables |
| 4 | [04-operateurs-rxjs.md](04-operateurs-rxjs.md) | **`pipe`, `map`, `switchMap`, `forkJoin` expliqués simplement** |
| 5 | [05-getPokemons-pas-a-pas.md](05-getPokemons-pas-a-pas.md) | **Décorticage complet de `getPokemons()`** |
| 6 | [06-getPokemonDetails-pas-a-pas.md](06-getPokemonDetails-pas-a-pas.md) | **Décorticage complet de `getPokemonDetails()`** |
| 7 | [07-composant-et-signals.md](07-composant-et-signals.md) | Le composant `Pokedex` : `signal`, `computed`, `OnPush` |
| 8 | [08-template.md](08-template.md) | Le template : `@for`, `@if`, bindings, événements |

> 💡 Les fiches 4, 5 et 6 forment le cœur de l'exercice. Prenez le temps de les lire dans l'ordre :
> la fiche 4 donne les outils, les fiches 5 et 6 montrent comment ils s'assemblent.

## Arborescence du code concerné

```
src/
├── main.ts                         → point d'entrée
├── environments/
│   ├── environment.ts              → URL de l'API
│   └── environment.development.ts
└── app/
    ├── app.ts / app.html           → composant racine (header, router-outlet, footer)
    ├── app.config.ts               → providers globaux (router, HttpClient…)
    ├── app.routes.ts               → routes (lazy loading)
    ├── models/
    │   └── poke-result.ts          → interfaces API + DTO
    ├── services/
    │   └── poke.service.ts         → appels HTTP + transformation RxJS
    └── pages/pokedex/
        ├── pokedex.ts              → logique du composant (signals)
        └── pokedex.html            → template
```
