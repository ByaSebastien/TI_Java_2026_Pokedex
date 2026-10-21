# 4. Les opérateurs RxJS utilisés : `pipe`, `map`, `switchMap`, `forkJoin`

Le service n'utilise que **4 outils** RxJS. Une fois qu'on les comprend un par un,
le code du service devient beaucoup plus simple à lire.

```ts
import { forkJoin, map, Observable, switchMap } from 'rxjs';
```

---

## 4.1 `pipe()` : la chaîne de montage

`pipe()` permet d'appliquer des **opérateurs** à un Observable, les uns après les autres.
Chaque opérateur reçoit ce que le précédent a produit et le transforme.

```ts
source$.pipe(
  operateur1(...),
  operateur2(...),
  operateur3(...),
)
```

Image mentale : une **chaîne de montage**. La valeur entre à gauche, passe par chaque poste, et ressort transformée à droite.

```
réponse HTTP ──▶ [ operateur1 ] ──▶ [ operateur2 ] ──▶ [ operateur3 ] ──▶ valeur finale reçue dans subscribe()
```

Points importants :

- `pipe()` **ne modifie pas** l'Observable d'origine : il en **renvoie un nouveau**.
- `pipe()` **ne déclenche rien** : la requête ne part toujours qu'au `subscribe()`.

---

## 4.2 `map()` : transformer une valeur

`map` reçoit chaque valeur émise et renvoie **une autre valeur**. C'est le même principe que `Array.map`,
mais appliqué à la valeur qui sort de l'Observable.

```ts
this._http.get<PokeResult>(url).pipe(
  map((result) => result.count)
)
// Observable<PokeResult>  devient  Observable<number>
```

```
Avant map :   ───{ count: 1302, results: [...] }───|
Après map :   ───1302───|
```

(`|` = l'Observable se termine)

👉 **Règle** : on utilise `map` quand la transformation est **synchrone** (calcul, sélection, remise en forme)
et qu'on n'a **pas besoin d'une nouvelle requête**.

### ⚠️ Ne pas confondre les deux `map`

Dans le service, on voit souvent les deux à la suite :

```ts
map((speciesList) => ...)                  // map de RxJS   → transforme la valeur émise par l'Observable
result.results.map((pokemon, index) => ...) // map de Array → transforme chaque élément d'un tableau
```

- Le `map` **RxJS** est dans un `pipe(...)` et s'importe depuis `'rxjs'`.
- Le `map` **Array** est appelé sur un tableau (`unTableau.map(...)`) et fait partie de JavaScript.

---

## 4.3 Le problème : et si la transformation est elle-même une requête HTTP ?

Imaginons qu'on veuille, à partir du détail d'un Pokémon, récupérer sa *species* :

```ts
this._http.get<PokeDetails>(url).pipe(
  map((details) => this._http.get<PokeSpecies>(details.species.url))
)
```

Quel est le type obtenu ? `map` renvoie ce que la fonction renvoie, donc ici… **un Observable** :

```
Observable<Observable<PokeSpecies>>   😱
```

On obtient un Observable **qui contient** un autre Observable. Dans le `subscribe`, on recevrait
l'Observable intérieur (non souscrit, donc la 2ᵉ requête ne partirait même jamais), et pas la species.

C'est exactement le problème que résout `switchMap`.

---

## 4.4 `switchMap()` : enchaîner une requête qui dépend de la précédente

`switchMap` fonctionne comme `map`, mais la fonction doit renvoyer **un Observable**.
`switchMap` va alors **s'abonner lui-même** à cet Observable intérieur et **émettre ses valeurs** à sa place.

```ts
this._http.get<PokeDetails>(url).pipe(
  switchMap((details) => this._http.get<PokeSpecies>(details.species.url))
)
// type : Observable<PokeSpecies>  ✅  (et plus Observable<Observable<...>>)
```

```
get(details)  ───details───|
                     │
                     └─ switchMap lance : get(species) ───species───|
                                                              │
Résultat final :  ────────────────────────────────────────species───|
```

Image mentale : **un relais**. Le premier coureur (requête 1) arrive, passe le témoin (`details`)
au second coureur (requête 2), et c'est le second qui franchit la ligne d'arrivée.

👉 **Règle** : on utilise `switchMap` quand on a besoin du **résultat d'une requête pour lancer la suivante**.

| | La fonction renvoie… | Résultat |
|---|---|---|
| `map` | une **valeur** | l'Observable émet cette valeur |
| `switchMap` | un **Observable** | l'Observable émet les valeurs de cet Observable |

### Et le « switch » dans switchMap ?

Si la source émet une **nouvelle** valeur alors que l'Observable intérieur précédent n'est pas terminé,
`switchMap` **annule** l'ancien et **bascule** (*switch*) sur le nouveau.

Dans notre service, la source est toujours un `http.get`, qui n'émet **qu'une seule valeur** :
il n'y a donc jamais rien à annuler. Ici `switchMap` sert uniquement à **enchaîner** les requêtes.
(`mergeMap` ou `concatMap` donneraient exactement le même résultat dans ce cas précis.)

---

## 4.5 `forkJoin()` : lancer plusieurs requêtes en parallèle et attendre qu'elles soient toutes finies

`forkJoin` reçoit un **tableau d'Observables**, s'abonne à **tous en même temps**, attend qu'ils soient
**tous terminés**, puis émet **un seul tableau** contenant le dernier résultat de chacun, **dans le même ordre**.

```ts
forkJoin([
  this._http.get<PokeDetails>('https://pokeapi.co/api/v2/pokemon/1/'),
  this._http.get<PokeDetails>('https://pokeapi.co/api/v2/pokemon/2/'),
  this._http.get<PokeDetails>('https://pokeapi.co/api/v2/pokemon/3/'),
])
// type : Observable<PokeDetails[]>
```

```
get(1)  ──────details1──|
get(2)  ───details2─────|
get(3)  ─────────details3──|
                           │
forkJoin ──────────────────[details1, details2, details3]──|
```

Remarques sur ce schéma :

- Les 3 requêtes partent **en même temps** (en parallèle), elles ne s'attendent pas.
- La requête 2 répond la première, mais `forkJoin` **attend la plus lente**.
- Le tableau final respecte **l'ordre du tableau d'entrée**, pas l'ordre d'arrivée.
  ➜ `resultat[0]` correspond toujours à `get(1)`, `resultat[1]` à `get(2)`, etc.
  C'est **essentiel** dans le service, qui associe les résultats par leur **index**.

Image mentale : **un serveur au restaurant** qui attend que tous les plats d'une table soient prêts
avant de les apporter ensemble.

### Construire le tableau d'Observables avec `Array.map`

On ne connaît pas à l'avance le nombre de requêtes : on les génère à partir d'un tableau.

```ts
const urls = ['https://.../pokemon/1/', 'https://.../pokemon/2/', 'https://.../pokemon/3/'];

forkJoin(
  urls.map((url) => this._http.get<PokeDetails>(url))
)
```

`urls.map(...)` (map de **Array**) transforme un tableau de chaînes en un tableau d'Observables :

```
['url1', 'url2', 'url3']
        │ Array.map
        ▼
[get(url1), get(url2), get(url3)]   ← tableau d'Observables (aucune requête lancée)
        │ forkJoin
        ▼
Observable<[details1, details2, details3]>
```

### Points de vigilance

- Si **une seule** requête échoue, `forkJoin` émet une **erreur** et on perd tous les résultats.
- Si le tableau passé est **vide** (`forkJoin([])`), il se termine **sans rien émettre** :
  le `subscribe` ne reçoit alors jamais de valeur.

👉 **Règle** : on utilise `forkJoin` quand on a **plusieurs requêtes indépendantes** à faire
et qu'on veut **tous les résultats ensemble**.

---

## 4.6 Récapitulatif

| Outil | Question à se poser | Exemple dans le projet |
|-------|---------------------|------------------------|
| `pipe` | « Je veux transformer ce que l'Observable émet » | Toujours présent dès qu'on utilise un opérateur |
| `map` | « Je transforme le résultat **sans** nouvelle requête » | Construire le DTO final |
| `switchMap` | « J'ai besoin de ce résultat **pour lancer** une autre requête » | Liste → détails, détails → species |
| `forkJoin` | « J'ai **plusieurs** requêtes à lancer et je veux **tous** les résultats » | Les 12 détails, les 12 species, les types |

## 4.7 Pourquoi les `pipe` sont-ils imbriqués dans le service ?

En lisant le service, on remarque que les `pipe` sont **imbriqués** les uns dans les autres
au lieu d'être simplement mis à la suite. Ce n'est pas un hasard : c'est pour garder accès aux **variables des étapes précédentes**.

```ts
get(liste).pipe(
  switchMap((result) =>               // result est visible à partir d'ici…
    forkJoin(...).pipe(
      switchMap((details) =>          // details est visible à partir d'ici…
        forkJoin(...).pipe(
          map((speciesList) => {
            // …et ici on a accès à result, details ET speciesList !
          })
        )
      )
    )
  )
)
```

Chaque fonction fléchée « voit » les variables des fonctions qui l'entourent (c'est une **closure**).
Le `map` final a besoin des **trois** résultats pour construire le DTO (le `next`/`previous` de `result`,
l'image de `details`, le nom FR de `speciesList`), c'est pourquoi il est placé tout au fond.

Si on avait mis les opérateurs à plat, chacun n'aurait accès qu'au résultat de l'étape **juste avant** :

```ts
get(liste).pipe(
  switchMap((result) => forkJoin(...)),
  switchMap((details) => forkJoin(...)),   // ❌ result n'est plus accessible ici
  map((speciesList) => ...),               // ❌ ni result, ni details
)
```

Les deux fiches suivantes appliquent tout cela au code réel, étape par étape :

- [05-getPokemons-pas-a-pas.md](05-getPokemons-pas-a-pas.md)
- [06-getPokemonDetails-pas-a-pas.md](06-getPokemonDetails-pas-a-pas.md)
