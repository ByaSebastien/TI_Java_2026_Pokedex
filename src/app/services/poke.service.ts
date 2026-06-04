import { inject, Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { HttpClient } from '@angular/common/http';
import { forkJoin, map, Observable, switchMap } from 'rxjs';
import {
  PokeDetails,
  PokeDetailsDto,
  PokeResult,
  PokeResultDto,
  PokeSpecies,
  PokeType,
} from '../models/poke-result';

@Injectable({
  providedIn: 'root',
})
export class PokeService {
  private readonly _http: HttpClient = inject(HttpClient);

  getPokemons(
    url: string,
  ): Observable<PokeResultDto> {
    return this._http.get<PokeResult>(url).pipe(
      switchMap((result) =>
        forkJoin(
          result.results.map((pokemon) =>
            this._http.get<PokeDetails>(pokemon.url),
          ),
        ).pipe(
          switchMap((details) =>
            forkJoin(
              details.map((detail) =>
                this._http.get<PokeSpecies>(detail.species.url),
              ),
            ).pipe(
              map((speciesList) => ({
                ...result,
                results: result.results.map((pokemon, index) => ({
                  name:
                    speciesList[index].names.find(
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

  getPokemonDetails(url: string) {
    return this._http.get<PokeDetails>(url).pipe(
      switchMap((details) =>
        this._http.get<PokeSpecies>(details.species.url).pipe(
          switchMap((species: PokeSpecies) =>
            forkJoin(
              details.types.map((type) => this._http.get<PokeType>(type.type.url)),
            ).pipe(
              map((types) =>
                ({
                  name:
                    species.names.find((entry) => entry.language.name === 'fr')!.name,
                  description:
                    species.flavor_text_entries.find(
                      (entry) => entry.language.name === 'fr',
                    )!.flavor_text,
                  types: types.map(
                    (type) =>
                      type.names.find((entry) => entry.language.name === 'fr')!.name,
                  ),
                  stats: details.stats.map((stat) => stat.base_stat),
                  sprite:
                    details.sprites.other.dream_world.front_default
                }) as PokeDetailsDto,
              ),
            ),
          ),
        ),
      ),
    );
  }
}
