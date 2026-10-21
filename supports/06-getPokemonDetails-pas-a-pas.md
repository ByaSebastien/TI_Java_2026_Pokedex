# 6. `getPokemonDetails()` pas à pas

Objectif : à partir de l'URL d'un Pokémon (ex. `https://pokeapi.co/api/v2/pokemon/1/`), obtenir un
`PokeDetailsDto` avec son nom, sa description, ses types (en français), ses stats et sa grande image.

> Si ce n'est pas déjà fait, lisez d'abord [04-operateurs-rxjs.md](04-operateurs-rxjs.md)
> et [05-getPokemons-pas-a-pas.md](05-getPokemons-pas-a-pas.md) : on réutilise les mêmes idées.

## 6.1 Le code complet

```ts
getPokemonDetails(url: string) {
  return this._http.get<PokeDetails>(url).pipe(                                // ① le détail
    switchMap((details) =>
      this._http.get<PokeSpecies>(details.species.url).pipe(                   // ② la species
        switchMap((species: PokeSpecies) =>
          forkJoin(
            details.types.map((type) => this._http.get<PokeType>(type.type.url)), // ③ les types
          ).pipe(
            map((types) =>                                                     // ④ assemblage
              ({
                name: species.names.find((entry) => entry.language.name === 'fr')!.name,
                description: species.flavor_text_entries.find(
                  (entry) => entry.language.name === 'fr',
                )!.flavor_text,
                types: types.map(
                  (type) => type.names.find((entry) => entry.language.name === 'fr')!.name,
                ),
                stats: details.stats.map((stat) => stat.base_stat),
                sprite: details.sprites.other.dream_world.front_default,
              }) as PokeDetailsDto,
            ),
          ),
        ),
      ),
    ),
  );
}
```

## 6.2 Vue d'ensemble

```
   ① GET /pokemon/1/              ──▶ details   (stats, image, URL species, URL des types)
                                        │
                      switchMap         ▼
   ② GET /pokemon-species/1/      ──▶ species   (nom FR, description FR)
                                        │
                      switchMap         ▼
   ③ GET /type/12/ + GET /type/4/ ──▶ types[]   (noms FR des types)   ← forkJoin (1 ou 2 requêtes)
                                        │
                      map               ▼
   ④ PokeDetailsDto               ──▶ subscribe() du composant
```

Total : **1 + 1 + (1 ou 2) = 3 ou 4 requêtes** selon le nombre de types du Pokémon.

---

## 6.3 Étape ① : le détail du Pokémon

```ts
return this._http.get<PokeDetails>(url).pipe(
```

On obtient `details` qui contient déjà :

- les **stats** → `details.stats` ;
- la **grande image** → `details.sprites.other.dream_world.front_default` ;
- l'**URL de la species** → `details.species.url` ;
- les **URL des types** → `details.types[i].type.url`.

Il manque le nom, la description et les noms des types **en français**.

## 6.4 Étape ② : la species (une seule requête → pas de forkJoin)

```ts
switchMap((details) =>
  this._http.get<PokeSpecies>(details.species.url).pipe( ... )
)
```

- Une **seule** requête, qui dépend de `details` → `switchMap` suffit, **pas besoin de `forkJoin`**.
- Comparez avec `getPokemons()`, où il y avait **12** species à charger, d'où le `forkJoin`.

On obtient `species`, qui contient `names` (nom dans chaque langue) et `flavor_text_entries` (descriptions dans chaque langue).

## 6.5 Étape ③ : les types (plusieurs requêtes → forkJoin)

```ts
switchMap((species: PokeSpecies) =>
  forkJoin(
    details.types.map((type) => this._http.get<PokeType>(type.type.url)),
  ).pipe( ... )
)
```

Un Pokémon a **1 ou 2 types**. Pour Bulbizarre :

```js
details.types = [
  { type: { url: 'https://pokeapi.co/api/v2/type/12/' } },  // grass
  { type: { url: 'https://pokeapi.co/api/v2/type/4/' } },   // poison
]
```

- `details.types.map(...)` (Array) → `[ get('/type/12/'), get('/type/4/') ]` ;
- `forkJoin` → lance les 2 en parallèle et émet `[typeGrass, typePoison]`.

Remarque : on utilise ici `details` (étape ①) **et non** `species` (étape ②). C'est possible grâce à l'imbrication :
`details` est toujours accessible dans les fonctions intérieures.

## 6.6 Étape ④ : assembler le DTO

```ts
map((types) => ({
  name:        species.names.find((entry) => entry.language.name === 'fr')!.name,
  description: species.flavor_text_entries.find((entry) => entry.language.name === 'fr')!.flavor_text,
  types:       types.map((type) => type.names.find((entry) => entry.language.name === 'fr')!.name),
  stats:       details.stats.map((stat) => stat.base_stat),
  sprite:      details.sprites.other.dream_world.front_default,
}) as PokeDetailsDto)
```

Plus aucune requête : on ne fait que **remettre en forme** → `map` de RxJS.

| Champ du DTO | Source | Étape |
|--------------|--------|-------|
| `name` | `species.names` (entrée `fr`) | ② |
| `description` | `species.flavor_text_entries` (entrée `fr`) | ② |
| `types` | `types[i].names` (entrée `fr`) | ③ |
| `stats` | `details.stats[i].base_stat` | ① |
| `sprite` | `details.sprites.other.dream_world.front_default` | ① |

- `details.stats.map((stat) => stat.base_stat)` : transforme `[{ base_stat: 45 }, { base_stat: 49 }, …]`
  en `[45, 49, 49, 65, 65, 45]`.
- `types.map(...)` : transforme le tableau de `PokeType` en tableau de noms : `['Plante', 'Poison']`.
- `as PokeDetailsDto` : indique à TypeScript le type de l'objet renvoyé. Ainsi, la méthode
  renvoie un `Observable<PokeDetailsDto>` même si on n'a pas écrit son type de retour.

Résultat final :

```js
{
  name: 'Bulbizarre',
  description: '(première description en français trouvée dans flavor_text_entries)',
  types: ['Plante', 'Poison'],
  stats: [45, 49, 49, 65, 65, 45],
  sprite: 'https://.../dream-world/1.svg',
}
```

## 6.7 Pour aller plus loin : une petite optimisation possible

Les étapes ② (species) et ③ (types) dépendent **toutes les deux uniquement** de `details`.
Elles ne dépendent pas l'une de l'autre. Pourtant, dans la correction, ③ attend la fin de ② :

```
① ───details──▶ ② ───species──▶ ③ ───types──▶ ④        (3 vagues successives)
```

On pourrait les lancer **en parallèle** avec un `forkJoin` sur un **objet** (forkJoin accepte aussi un objet,
et émet alors un objet avec les mêmes clés) :

```ts
getPokemonDetails(url: string): Observable<PokeDetailsDto> {
  return this._http.get<PokeDetails>(url).pipe(
    switchMap((details) =>
      forkJoin({
        species: this._http.get<PokeSpecies>(details.species.url),
        types: forkJoin(details.types.map((t) => this._http.get<PokeType>(t.type.url))),
      }).pipe(
        map(({ species, types }) => ({
          name: species.names.find((e) => e.language.name === 'fr')!.name,
          description: species.flavor_text_entries.find((e) => e.language.name === 'fr')!.flavor_text,
          types: types.map((t) => t.names.find((e) => e.language.name === 'fr')!.name),
          stats: details.stats.map((s) => s.base_stat),
          sprite: details.sprites.other.dream_world.front_default,
        })),
      ),
    ),
  );
}
```

```
① ───details──▶ ② + ③ en parallèle ──▶ ④                (2 vagues seulement)
```

Le résultat est identique, l'affichage est juste un peu plus rapide. C'est un bon exercice pour vérifier
qu'on a compris la différence entre `switchMap` (séquentiel, dépendant) et `forkJoin` (parallèle, indépendant).
