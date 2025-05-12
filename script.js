const OMDB_API_KEY = "b1f80cd5";
const PROJECT_ID = "zain";
const DATABASE_ID = "moviesDB";
const COLLECTION_ID = "movies";

const client = new Appwrite.Client();
client.setEndpoint("https://cloud.appwrite.io/v1").setProject(PROJECT_ID);

const databases = new Appwrite.Databases(client);

async function fetchMovies(query) {
  const res = await fetch(`https://www.omdbapi.com/?apikey=${OMDB_API_KEY}&s=${query}`);
  const data = await res.json();
  return data.Search || [];
}

async function renderMovies(movies, containerId) {
  const container = document.getElementById(containerId);
  container.innerHTML = "";

  for (const movie of movies) {
    const card = document.createElement("div");
    card.classList.add("movie-card");
    card.innerHTML = `
      <img src="${movie.Poster !== "N/A" ? movie.Poster : 'https://via.placeholder.com/300'}" />
      <h3>${movie.Title}</h3>
    `;
    container.appendChild(card);
    await logSearch(movie);
  }
}

async function searchMovies() {
  const input = document.getElementById("searchInput").value.trim();
  if (!input) return;
  const movies = await fetchMovies(input);
  renderMovies(movies, "randomMovies");
}

async function loadRandomMovies() {
  const titles = ["Batman", "Avengers", "Iron Man", "Frozen", "Spiderman"];
  const randomQuery = titles[Math.floor(Math.random() * titles.length)];
  const movies = await fetchMovies(randomQuery);
  renderMovies(movies, "randomMovies");
}

async function logSearch(movie) {
  try {
    const existing = await databases.listDocuments(DATABASE_ID, COLLECTION_ID, [
      Appwrite.Query.equal("movieId", movie.imdbID)
    ]);

    if (existing.documents.length > 0) {
      const doc = existing.documents[0];
      await databases.updateDocument(DATABASE_ID, COLLECTION_ID, doc.$id, {
        searchCount: (doc.searchCount || 0) + 1
      });
    } else {
      await databases.createDocument(DATABASE_ID, COLLECTION_ID, Appwrite.ID.unique(), {
        movieId: movie.imdbID,
        movieTitle: movie.Title,
        moviePoster: movie.Poster,
        searchCount: 1,
        visitCount: 0
      });
    }
  } catch (error) {
    console.error("Error logging search:", error.message);
  }
}

async function loadTopMovies(field, containerId) {
  try {
    const docs = await databases.listDocuments(DATABASE_ID, COLLECTION_ID, [
      Appwrite.Query.orderDesc(field),
      Appwrite.Query.limit(6)
    ]);
    renderMovies(docs.documents, containerId);
  } catch (err) {
    console.error(`Failed to load ${field} movies:`, err);
  }
}

window.onload = () => {
  loadRandomMovies();
  loadTopMovies("searchCount", "mostSearched");
  loadTopMovies("visitCount", "mostVisited");
};
