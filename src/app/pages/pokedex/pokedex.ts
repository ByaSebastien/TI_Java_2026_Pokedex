import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
  WritableSignal,
} from '@angular/core';
import { PokeService } from '../../services/poke.service';
import {
  PokeDetailsDto,
  PokeResultDto,
} from '../../models/poke-result';
import { environment } from '../../../environments/environment';

interface StatEntry {
  label: string;
  value: number;
  percent: number;
  color: string;
}

@Component({
  selector: 'app-pokedex',
  imports: [],
  templateUrl: './pokedex.html',
  styleUrl: './pokedex.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Pokedex {
  private readonly _pokeService = inject(PokeService);

  private readonly STAT_LABELS = ['PV', 'Attaque', 'Défense', 'Att. Spé.', 'Déf. Spé.', 'Vitesse'];
  private readonly STAT_COLORS = ['hp', 'atk', 'def', 'spatk', 'spdef', 'spd'];

  private readonly TYPE_MAP: Record<string, string> = {
    'Normal': 'normal', 'Feu': 'fire', 'Eau': 'water', 'Électrik': 'electric',
    'Plante': 'grass', 'Glace': 'ice', 'Combat': 'fighting', 'Poison': 'poison',
    'Sol': 'ground', 'Vol': 'flying', 'Psy': 'psychic', 'Insecte': 'bug',
    'Roche': 'rock', 'Spectre': 'ghost', 'Dragon': 'dragon',
    'Ténèbres': 'dark', 'Acier': 'steel', 'Fée': 'fairy',
  };

  readonly pokeResult: WritableSignal<PokeResultDto | undefined> = signal(undefined);
  readonly selectedPokemon: WritableSignal<PokeDetailsDto | undefined> = signal(undefined);

  readonly primaryTypeClass = computed(() => {
    const pokemon = this.selectedPokemon();
    if (!pokemon?.types.length) return '';
    return this.typeClass(pokemon.types[0]);
  });

  readonly detailPanelClass = computed(() => {
    const tc = this.primaryTypeClass();
    return tc ? `poke-detail poke-detail--${tc}` : 'poke-detail';
  });

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

  constructor() {
    this.getPokemons();
  }

  typeClass(frenchType: string): string {
    return this.TYPE_MAP[frenchType] ?? 'normal';
  }

  previous() {
    if (!this.pokeResult()?.previous) return;
    this.getPokemons(this.pokeResult()!.previous);
  }

  next() {
    if (!this.pokeResult()?.next) return;
    this.getPokemons(this.pokeResult()!.next);
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
}

