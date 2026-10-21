# 3. Le service, HttpClient et les Observables

Fichier : `src/app/services/poke.service.ts`

## 3.1 Déclarer un service

```ts
@Injectable({
  providedIn: 'root',
})
export class PokeService {
  private readonly _http: HttpClient = inject(HttpClient);
  ...
}
```

- `@Injectable` indique que la classe peut être **injectée** ailleurs (et qu'elle peut elle-même recevoir des injections).
- `providedIn: 'root'` → Angular crée **une seule instance** (singleton) partagée par toute l'application,
  sans avoir besoin de l'ajouter dans `providers`.
- `inject(HttpClient)` récupère le service `HttpClient` fourni par `provideHttpClient()` (voir fiche 1).

`inject()` est l'équivalent moderne de l'injection par constructeur :

```ts
// Ancienne syntaxe (toujours valide)
constructor(private readonly _http: HttpClient) {}

// Syntaxe moderne utilisée ici
private readonly _http = inject(HttpClient);
```

> ⚠️ `inject()` ne peut être appelé que pendant la **construction** de la classe
> (initialisation d'un champ ou dans le constructeur), pas dans une méthode appelée plus tard.

## 3.2 Pourquoi un service ?

Le composant s'occupe de **l'affichage**, le service s'occupe de **récupérer et préparer les données**.

- Le composant reste simple et lisible.
- La logique d'appel API est réutilisable par d'autres composants.
- On peut tester le service séparément.

## 3.3 `HttpClient.get` renvoie un Observable

```ts
this._http.get<PokeResult>(url)   // type : Observable<PokeResult>
```

Le `<PokeResult>` indique le type attendu de la réponse JSON (déjà convertie en objet JS par Angular).

### Qu'est-ce qu'un Observable ?

Un **Observable** est un objet qui **émettra des valeurs plus tard**. C'est comme une Promise, avec quelques différences :

| | Promise | Observable |
|---|---------|------------|
| Nombre de valeurs | 1 seule | 0, 1 ou plusieurs |
| Démarrage | **Immédiat** dès sa création | **Seulement quand on fait `subscribe()`** |
| Annulation | Impossible | Possible (`unsubscribe()`) |
| Transformation | `.then()` | `.pipe(opérateurs…)` |

Pour une requête `HttpClient` : l'Observable émet **une seule valeur** (la réponse), puis se **termine** (*complete*).
En cas d'erreur HTTP, il émet une **erreur** à la place.

### Point capital : rien ne se passe sans `subscribe()`

```ts
const obs = this._http.get<PokeResult>(url);   // ❌ AUCUNE requête n'est envoyée ici !

obs.subscribe((result) => console.log(result)); // ✅ c'est ICI que la requête part
```

On dit que les Observables HTTP sont **froids** (*cold*) : ils décrivent un travail à faire, mais ne le font
que lorsque quelqu'un s'abonne. Chaque `subscribe()` relance une nouvelle requête.

C'est pour cela que le service **renvoie** un Observable (la « recette ») et que c'est le **composant**
qui fait le `subscribe()` (qui « lance la cuisson ») :

```ts
// Dans le service : on prépare la recette, on ne lance rien
getPokemons(url: string): Observable<PokeResultDto> {
  return this._http.get<PokeResult>(url).pipe( ... );
}

// Dans le composant : on lance et on récupère le résultat
this._pokeService.getPokemons(url).subscribe((result) => {
  this.pokeResult.set(result);
});
```

## 3.4 Le problème à résoudre

Pour afficher **une page de 12 Pokémon en français avec image**, l'API nous oblige à faire :

1. 1 requête pour la liste → on obtient 12 noms **anglais** + 12 URL ;
2. 12 requêtes de détail → on obtient les 12 images + 12 URL de *species* ;
3. 12 requêtes de *species* → on obtient les 12 noms **français**.

Soit **25 requêtes**, dont certaines dépendent du résultat des précédentes, et dont il faut
**rassembler les résultats** en un seul objet.

Avec des callbacks imbriqués, ce serait vite illisible. C'est exactement le rôle des **opérateurs RxJS**,
expliqués dans la fiche suivante : [04-operateurs-rxjs.md](04-operateurs-rxjs.md).
