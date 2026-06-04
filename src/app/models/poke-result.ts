export interface PokeResult {
  count: number;
  next: string;
  previous: any;
  results: {
    name: string;
    url: string;
  }[];
}

export interface PokeDetails {
  species: {
    url: string;
  };
  types: {
    type: {
      url: string;
    };
  }[];
  stats: {
    base_stat: number;
  }[];
  sprites: {
    front_default: string;
    other: {
      dream_world: {
        front_default: string;
      }
    };
  };
}

export interface PokeSpecies {
  flavor_text_entries: {
    flavor_text: string;
    language: {
      name: string;
    };
  }[];
  names: {
    name: string;
    language: {
      name: string;
    };
  }[];
}

export interface PokeType {
  name: string;
  names: {
    name: string;
    language: {
      name: string;
    };
  }[];
}

export interface PokeResultDto {
  count: number;
  next: string;
  previous: any;
  results: PokeSimpleDto[];
}

export interface PokeSimpleDto {
  name: string;
  url: string;
  sprite: string;
}

export interface PokeDetailsDto {
  name: string;
  description: string;
  stats: number[];
  sprite: string;
  types: string[];
}




