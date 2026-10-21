# 5. `getPokemons()` pas à pas

Objectif : à partir de l'URL d'une page de la liste, obtenir un `PokeResultDto` contenant
les 12 Pokémon avec leur **nom français** et leur **image**.

## 5.1 Le code complet

```ts
getPokemons(url: string): Observable<PokeResultDto> {
  return this._http.get<PokeResult>(url).pipe(                       // ① la liste
    switchMap((result) =>
      forkJoin(
        result.results.map((pokemon) =>
          this._http.get<PokeDetails>(pokemon.url),                   // ② les 12 détails
        ),
      ).pipe(
        switchMap((details) =>
          forkJoin(
            details.map((detail) =>
              this._http.get<PokeSpecies>(detail.species.url),        // ③ les 12 species
            ),
          ).pipe(
            map((speciesList) => ({                                   // ④ assemblage du DTO
              ...result,
              results: result.results.map((pokemon, index) => ({
                name: speciesList[index].names.find(
                  (entry) => entry.language.name === 'fr',
                )!.name,
                sprite: details[index].sprites.front_default,
                url: pokemon.url,
              })),
            })),
          ),
        ),
      ),
    ),
  );
}
```

## 5.2 Vue d'ensemble

```
                        ① 1 requête
   GET /pokemon?offset=0&limit=12  ──▶  result  (12 noms EN + 12 URL)
                                          │
                     switchMap            │  pour chaque URL…
                                          ▼
                        ② 12 requêtes en parallèle (forkJoin)
   GET /pokemon/1/ … GET /pokemon/12/ ──▶  details[]  (12 images + 12 URL species)
                                          │
                     switchMap            │  pour chaque URL species…
                                          ▼
                        ③ 12 requêtes en parallèle (forkJoin)
   GET /pokemon-species/1/ … /12/     ──▶  speciesList[]  (12 noms FR)
                                          │
                     map                  │  on assemble result + details + speciesList
                                          ▼
                        ④ PokeResultDto  ──▶  subscribe() du composant
```

Total : **1 + 12 + 12 = 25 requêtes HTTP**, mais le composant ne reçoit **qu'une seule valeur**, déjà prête.

On suit maintenant les données réelles, étape par étape.

---

## 5.3 Étape ① : récupérer la liste

```ts
return this._http.get<PokeResult>(url).pipe(
```

L'URL vaut par exemple `https://pokeapi.co/api/v2/pokemon?offset=0&limit=12`.
La réponse (variable `result`) ressemble à :

```json
{
  "count": 1302,
  "next": "https://pokeapi.co/api/v2/pokemon?offset=12&limit=12",
  "previous": null,
  "results": [
    { "name": "bulbasaur", "url": "https://pokeapi.co/api/v2/pokemon/1/" },
    { "name": "ivysaur",   "url": "https://pokeapi.co/api/v2/pokemon/2/" },
    { "name": "venusaur",  "url": "https://pokeapi.co/api/v2/pokemon/3/" },
    ... (12 éléments)
  ]
}
```

Problème : noms en **anglais** et **pas d'image**. Il faut aller chercher le détail de chaque Pokémon.

## 5.4 Étape ② : récupérer les 12 détails en parallèle

```ts
switchMap((result) =>
  forkJoin(
    result.results.map((pokemon) =>
      this._http.get<PokeDetails>(pokemon.url),
    ),
  ).pipe( ... )
)
```

On lit de l'intérieur vers l'extérieur :

1. `result.results.map(...)` (map de **Array**) : transforme les 12 `{ name, url }` en **12 Observables** `http.get` :
   ```
   [ get('/pokemon/1/'), get('/pokemon/2/'), …, get('/pokemon/12/') ]
   ```
2. `forkJoin([...])` : lance les 12 requêtes **en même temps** et attend qu'elles soient **toutes** terminées.
   Il émettra un tableau de 12 `PokeDetails`, **dans le même ordre**.
3. `switchMap((result) => ...)` : on a besoin de `result` pour savoir quelles requêtes lancer → c'est une
   requête qui **dépend** de la précédente → `switchMap`.

Le tableau `details` obtenu ressemble à :

```js
[
  { species: { url: '.../pokemon-species/1/' }, sprites: { front_default: '.../1.png', ... }, ... }, // index 0
  { species: { url: '.../pokemon-species/2/' }, sprites: { front_default: '.../2.png', ... }, ... }, // index 1
  ...
]
```

On a maintenant les **images**, mais toujours pas les **noms français** : ils sont dans la *species*.

## 5.5 Étape ③ : récupérer les 12 species en parallèle

```ts
.pipe(
  switchMap((details) =>
    forkJoin(
      details.map((detail) =>
        this._http.get<PokeSpecies>(detail.species.url),
      ),
    ).pipe( ... )
  )
)
```

Exactement le même schéma qu'à l'étape ② :

1. `details.map(...)` → 12 Observables `get(species.url)` ;
2. `forkJoin` → les lance en parallèle, attend tout, émet un tableau `speciesList` de 12 éléments ;
3. `switchMap` → parce qu'on a besoin de `details` pour connaître les URL des species.

Le tableau `speciesList` ressemble à :

```js
[
  { names: [ {name:'フシギダネ', language:{name:'ja'}}, {name:'Bulbizarre', language:{name:'fr'}}, ... ], ... }, // index 0
  { names: [ ..., {name:'Herbizarre', language:{name:'fr'}}, ... ], ... },                                     // index 1
  ...
]
```

> ❓ **Pourquoi ne pas lancer les étapes ② et ③ en même temps ?**
> Parce que l'URL de la species se trouve **dans** la réponse du détail (`detail.species.url`).
> Impossible de lancer ③ avant d'avoir reçu ②.

## 5.6 Étape ④ : assembler le DTO

```ts
.pipe(
  map((speciesList) => ({
    ...result,
    results: result.results.map((pokemon, index) => ({
      name: speciesList[index].names.find((entry) => entry.language.name === 'fr')!.name,
      sprite: details[index].sprites.front_default,
      url: pokemon.url,
    })),
  })),
)
```

Ici, plus de requête : on **transforme** simplement des données → `map` (de RxJS).

Grâce à l'imbrication (voir fiche 4, §4.7), on a accès aux **trois** variables :

| Variable | Vient de | Ce qu'on y prend |
|----------|----------|------------------|
| `result` | étape ① | `count`, `next`, `previous`, et l'`url` de chaque Pokémon |
| `details` | étape ② | l'image (`sprites.front_default`) |
| `speciesList` | étape ③ | le nom français |

Détail de la construction :

- `({ ... })` : les parenthèses autour des accolades sont nécessaires pour qu'une fonction fléchée
  **renvoie un objet** (sinon `{` serait compris comme le début d'un bloc de code).
- `...result` (spread) : copie toutes les propriétés de `result` (`count`, `next`, `previous`, `results`)…
- `results: ...` : …puis **remplace** `results` par notre nouveau tableau.
- `result.results.map((pokemon, index) => ...)` (map de **Array**) : pour chaque Pokémon de la liste,
  on utilise son **index** pour retrouver les données correspondantes dans `details` et `speciesList`.
  Cela fonctionne **uniquement** parce que `forkJoin` garantit que l'ordre est conservé :

  ```
  index   result.results[i]   details[i]           speciesList[i]
    0     bulbasaur           …/1.png              Bulbizarre
    1     ivysaur             …/2.png              Herbizarre
    2     venusaur            …/3.png              Florizarre
  ```

- `.find((entry) => entry.language.name === 'fr')` : cherche dans le tableau `names` l'entrée en français.
- `!` (*non-null assertion*) : `find` peut renvoyer `undefined` s'il ne trouve rien. Le `!` dit à TypeScript
  « je te garantis qu'il y aura un résultat ». Si ce n'est pas le cas, on aura une erreur à l'exécution
  (`Cannot read properties of undefined`).

Résultat final émis par l'Observable :

```js
{
  count: 1302,
  next: 'https://pokeapi.co/api/v2/pokemon?offset=12&limit=12',
  previous: null,
  results: [
    { name: 'Bulbizarre', sprite: '.../1.png', url: 'https://pokeapi.co/api/v2/pokemon/1/' },
    { name: 'Herbizarre', sprite: '.../2.png', url: 'https://pokeapi.co/api/v2/pokemon/2/' },
    ...
  ]
}
```

C'est exactement un `PokeResultDto`, que le composant reçoit dans son `subscribe`.

## 5.7 Chronologie réelle

```
temps ─────────────────────────────────────────────────────────────────────▶

subscribe()
   │
   ├─ GET liste ──────▶ result
   │                      ├─ GET pokemon/1  ──────▶ ┐
   │                      ├─ GET pokemon/2  ────▶   │ forkJoin attend
   │                      ├─ …                      │ le plus lent
   │                      └─ GET pokemon/12 ──────────▶ details
   │                                                     ├─ GET species/1 ───▶ ┐
   │                                                     ├─ …                  │ forkJoin
   │                                                     └─ GET species/12 ──────▶ speciesList
   │                                                                               │ map
   │                                                                               ▼
   └──────────────────────────────────────────────────────────────── PokeResultDto ▶ composant
```

On a donc **3 « vagues »** successives : 1 requête, puis 12 en parallèle, puis 12 en parallèle.

## 5.8 Pour aller plus loin

- **Gestion d'erreur** : si une seule des 25 requêtes échoue, tout échoue. On pourrait ajouter
  l'opérateur `catchError` pour afficher un message plutôt que rien.
- **Écriture alternative** : on pourrait réduire l'imbrication en regroupant `details` et `speciesList`
  à l'étape ③ (par exemple `map((speciesList) => ({ details, speciesList }))`) pour les transmettre à
  l'opérateur suivant. Le résultat est identique ; la version imbriquée est simplement plus directe à écrire.
