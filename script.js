const API_URL = "https://pokeapi.co/api/v2/pokemon/";
const pokemonGrid = document.getElementById("pokemon-grid");
const statusMessage = document.getElementById("status-message");
const searchForm = document.getElementById("search-form");
const searchInput = document.getElementById("search-input");
const typeFilter = document.getElementById("type-filter");
const loadMoreButton = document.getElementById("load-more");

const LIMIT = 24;
let offset = 0;
let isLoading = false;
let allLoadedPokemon = [];
let searchMode = false;

const typeNames = {
  normal: "Normal", fire: "Fogo", water: "Água", electric: "Elétrico",
  grass: "Planta", ice: "Gelo", fighting: "Lutador", poison: "Veneno",
  ground: "Terra", flying: "Voador", psychic: "Psíquico", bug: "Inseto",
  rock: "Pedra", ghost: "Fantasma", dragon: "Dragão", dark: "Sombrio",
  steel: "Aço", fairy: "Fada"
};

async function loadPokemon() {
  if (isLoading || searchMode) return;
  isLoading = true;
  loadMoreButton.disabled = true;
  statusMessage.textContent = "Carregando Pokémon...";
  statusMessage.classList.remove("error");

  try {
    // Primeiro buscamos a lista paginada de Pokémon.
    const response = await fetch(`${API_URL}?limit=${LIMIT}&offset=${offset}`);
    if (!response.ok) throw new Error(`Erro HTTP ${response.status} ao consultar a PokéAPI.`);
    const listData = await response.json();

    // Depois buscamos os detalhes de cada Pokémon para obter imagem, tipos e experiência.
    const details = await Promise.all(
      listData.results.map(item => fetch(item.url).then(result => {
        if (!result.ok) throw new Error("Não foi possível carregar os detalhes de um Pokémon.");
        return result.json();
      }))
    );

    allLoadedPokemon = allLoadedPokemon.concat(details);
    renderPokemon(allLoadedPokemon);
    offset += LIMIT;
    statusMessage.textContent = `Exibindo ${allLoadedPokemon.length} de ${listData.count} Pokémon.`;
    loadMoreButton.hidden = !listData.next;
  } catch (error) {
    console.error("Erro ao consultar a PokéAPI:", error);
    statusMessage.textContent = `${error.message} Verifique sua conexão e tente novamente.`;
    statusMessage.classList.add("error");
  } finally {
    isLoading = false;
    loadMoreButton.disabled = false;
  }
}

function createPokemonCard(pokemon) {
  // Os cards são montados pelo JavaScript, não ficam fixos no HTML.
  const card = document.createElement("article");
  card.className = "pokemon-card";

  const number = document.createElement("span");
  number.className = "pokemon-number";
  number.textContent = `#${String(pokemon.id).padStart(3, "0")}`;

  const image = document.createElement("img");
  image.className = "pokemon-image";
  image.alt = `Imagem de ${pokemon.name}`;
  image.loading = "lazy";
  image.src = pokemon.sprites.other?.["official-artwork"]?.front_default
    || pokemon.sprites.front_default
    || "https://placehold.co/300x300/f3f3f3/333?text=Pokemon";

  const name = document.createElement("h3");
  name.textContent = pokemon.name.replaceAll("-", " ");

  const types = document.createElement("div");
  types.className = "type-list";
  pokemon.types.forEach(item => {
    const tag = document.createElement("span");
    tag.className = `type-tag type-${item.type.name}`;
    tag.textContent = typeNames[item.type.name] || item.type.name;
    types.appendChild(tag);
  });

  const info = document.createElement("p");
  info.className = "pokemon-info";
  info.textContent = `Experiência base: ${pokemon.base_experience ?? "Não informada"}`;

  card.append(number, image, name, types, info);
  return card;
}

function renderPokemon(pokemonList) {
  const selectedType = typeFilter.value;
  const filtered = selectedType
    ? pokemonList.filter(p => p.types.some(t => t.type.name === selectedType))
    : pokemonList;

  pokemonGrid.replaceChildren();
  filtered.forEach(pokemon => pokemonGrid.appendChild(createPokemonCard(pokemon)));

  if (filtered.length === 0) {
    statusMessage.textContent = "Nenhum Pokémon desta lista corresponde ao tipo selecionado.";
  }
}

async function searchPokemon(query) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) {
    searchMode = false;
    offset = 0;
    allLoadedPokemon = [];
    pokemonGrid.replaceChildren();
    loadMoreButton.hidden = false;
    loadPokemon();
    return;
  }

  searchMode = true;
  loadMoreButton.hidden = true;
  statusMessage.textContent = "Procurando Pokémon...";
  statusMessage.classList.remove("error");

  try {
    const response = await fetch(`${API_URL}${encodeURIComponent(normalized)}`);
    if (!response.ok) throw new Error("Pokémon não encontrado. Confira o nome ou número digitado.");
    const pokemon = await response.json();
    allLoadedPokemon = [pokemon];
    renderPokemon(allLoadedPokemon);
    statusMessage.textContent = "1 Pokémon encontrado.";
  } catch (error) {
    pokemonGrid.replaceChildren();
    statusMessage.textContent = error.message;
    statusMessage.classList.add("error");
  }
}

searchForm.addEventListener("submit", event => {
  event.preventDefault();
  typeFilter.value = "";
  searchPokemon(searchInput.value);
});

typeFilter.addEventListener("change", () => {
  renderPokemon(allLoadedPokemon);
});

loadMoreButton.addEventListener("click", loadPokemon);

// Carregamento inicial dos primeiros Pokémon.
loadPokemon();
