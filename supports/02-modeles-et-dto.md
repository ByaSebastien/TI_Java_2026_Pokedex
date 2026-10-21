# 2. Les modèles : interfaces API et DTO

Fichier : `src/app/models/poke-result.ts`

## 2.1 Pourquoi des interfaces ?

En TypeScript, une `interface` décrit la **forme** d'un objet. Elle n'existe plus une fois le code compilé
(aucun coût à l'exécution), mais elle permet :

- l'**autocomplétion** dans l'éditeur (`details.sprites.front_default`…) ;
- la **détection d'erreurs** à la compilation (faute de frappe dans un nom de propriété, mauvais type…).

> ⚠️ Une interface ne **vérifie rien** à l'exécution. Écrire `http.get<PokeDetails>(url)` dit à TypeScript
> « fais-moi confiance, la réponse aura cette forme ». Si l'API renvoie autre chose, TypeScript ne le saura pas.

## 2.2 Deux familles d'interfaces

Le fichier contient deux familles bien distinctes :

| Interfaces « API » | Interfaces « DTO » |
|--------------------|--------------------|
| `PokeResult`, `PokeDetails`, `PokeSpecies`, `PokeType` | `PokeResultDto`, `PokeSimpleDto`, `PokeDetailsDto` |
| Décrivent **ce que renvoie PokéAPI** | Décrivent **ce dont le composant a besoin** |
| Données brutes, en anglais, dispersées sur plusieurs URL | Données prêtes à afficher, en français, regroupées |

**DTO** = *Data Transfer Object* : un objet simple qui transporte uniquement les données utiles.

Le rôle du **service** est justement de transformer les premières en secondes :

```
PokéAPI ──(PokeResult, PokeDetails, PokeSpecies, PokeType)──▶ PokeService ──(…Dto)──▶ Composant
```

Le composant n'a ainsi **aucune connaissance** de la structure compliquée de l'API.

## 2.3 Les interfaces API (partielles !)

L'API renvoie énormément de champs. On ne déclare **que ceux qu'on utilise** :

```ts
export interface PokeDetails {
  species: { url: string };                 // lien vers la "species" (noms FR, description)
  types: { type: { url: string } }[];       // liens vers chaque type
  stats: { base_stat: number }[];           // les 6 statistiques
  sprites: {
    front_default: string;                  // petite image (liste)
    other: { dream_world: { front_default: string } }; // grande image SVG (détail)
  };
}
```

Exemple de réponse réelle (très simplifiée) de `https://pokeapi.co/api/v2/pokemon/1/` :

```json
{
  "name": "bulbasaur",
  "species": { "name": "bulbasaur", "url": "https://pokeapi.co/api/v2/pokemon-species/1/" },
  "types": [
    { "slot": 1, "type": { "name": "grass",  "url": "https://pokeapi.co/api/v2/type/12/" } },
    { "slot": 2, "type": { "name": "poison", "url": "https://pokeapi.co/api/v2/type/4/" } }
  ],
  "stats": [ { "base_stat": 45 }, { "base_stat": 49 }, ... ],
  "sprites": { "front_default": "https://.../1.png", "other": { "dream_world": { "front_default": "https://.../1.svg" } } }
}
```

On remarque que **le nom français n'est pas là** : il faut aller le chercher dans la *species*.
Idem pour le nom français des types : il faut appeler l'URL de chaque type.
C'est ce qui oblige à enchaîner plusieurs requêtes HTTP (voir fiches 4 à 6).

Les tableaux `names` et `flavor_text_entries` contiennent une entrée par langue :

```json
"names": [
  { "name": "フシギダネ", "language": { "name": "ja" } },
  { "name": "Bulbizarre", "language": { "name": "fr" } },
  { "name": "Bulbasaur",  "language": { "name": "en" } }
]
```

D'où le `.find((entry) => entry.language.name === 'fr')` qu'on retrouve partout dans le service.

## 2.4 Les DTO

```ts
export interface PokeResultDto {
  count: number;
  next: string;           // URL de la page suivante (ou null)
  previous: any;          // URL de la page précédente (ou null)
  results: PokeSimpleDto[];
}

export interface PokeSimpleDto {
  name: string;           // nom FR
  url: string;            // URL du détail (utilisée au clic)
  sprite: string;         // image
}

export interface PokeDetailsDto {
  name: string;           // nom FR
  description: string;    // description FR
  stats: number[];        // [45, 49, 49, 65, 65, 45]
  sprite: string;         // grande image
  types: string[];        // ["Plante", "Poison"]
}
```

`PokeResultDto` garde `next` et `previous` tels quels : ce sont les URL que l'API nous donne pour la pagination,
le composant les réutilise directement pour les boutons ← et →.

> 📝 Remarque : `previous: any` fonctionne, mais `previous: string | null` serait plus précis
> (et `next` devrait aussi être `string | null`, car il vaut `null` sur la dernière page).
