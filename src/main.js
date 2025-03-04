import axios from 'axios';

// Constants
const TMDB_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p';
const DEFAULT_ERROR_IMAGE = 'https://static.platzi.com/static/images/error/img404.png';
const API_KEY = import.meta.env.VITE_API_KEY;

// API configuration
const api = axios.create({
    baseURL: 'https://api.themoviedb.org/3/',
    headers: {
        'Content-Type': 'application/json;charset=utf-8',
    },
    params: {
        'api_key': API_KEY
    },
});

// DOM Elements
const headerSection = document.querySelector('#header');
const trendingPreviewSection = document.querySelector('#trendingPreview .trendingPreview-movieList');
const categoriesPreviewSection = document.querySelector('#categoriesPreview .categoriesPreview-list');
const genericSection = document.querySelector('#genericList');
const movieDetailSection = document.querySelector('#movieDetail');

// Add movie detail elements
const movieDetailTitle = document.createElement('h1');
movieDetailTitle.classList.add('movieDetail-title');
const movieDetailDescription = document.createElement('p');
movieDetailDescription.classList.add('movieDetail-description');
const movieDetailScore = document.createElement('span');
movieDetailScore.classList.add('movieDetail-score');
const movieDetailCategoriesList = document.createElement('article');
movieDetailCategoriesList.classList.add('categories-list');
const relatedMoviesContainer = document.createElement('article');
relatedMoviesContainer.classList.add('relatedMovies-scrollContainer');

// Initialize movie detail section
movieDetailSection.appendChild(movieDetailTitle);
movieDetailSection.appendChild(movieDetailScore);
movieDetailSection.appendChild(movieDetailDescription);
movieDetailSection.appendChild(movieDetailCategoriesList);
movieDetailSection.appendChild(relatedMoviesContainer);

// Add pagination variables
let page = 1;
let maxPage = 0;
let infiniteScroll;

// Lazy loading observer
const lazyLoader = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.setAttribute('src', entry.target.dataset.img);
    }
  });
});

// Helper functions
const createImageUrl = (path, size = 'w300') => `${TMDB_IMAGE_BASE_URL}/${size}${path}`;

// API calls with error handling
const fetchApi = async (endpoint, params = {}) => {
  try {
    const { data } = await api(endpoint, { params });
    return data;
  } catch (error) {
    console.error(`Error fetching ${endpoint}:`, error);
    throw error;
  }
};

const createMovieElement = (movie, lazyLoad) => {
  const container = document.createElement('div');
  container.classList.add('movie-container');

  const img = document.createElement('img');
  img.classList.add('movie-img');
  img.setAttribute('alt', movie.title);
  img.setAttribute(
    lazyLoad ? 'data-img' : 'src',
    createImageUrl(movie.poster_path)
  );
  
  img.addEventListener('click', () => location.hash = `#movie=${movie.id}`);
  img.addEventListener('error', () => img.setAttribute('src', DEFAULT_ERROR_IMAGE));

  const btn = document.createElement('button');
  btn.classList.add('movie-btn');
  btn.addEventListener('click', () => btn.classList.toggle('movie-btn--liked'));

  if (lazyLoad) {
    lazyLoader.observe(img);
  }

  container.append(img, btn);
  return container;
};

function createMovies(movies, container, { lazyLoad = false, clean = true } = {}) {
  if (clean) container.innerHTML = '';
  
  const fragment = document.createDocumentFragment();
  movies.forEach(movie => {
    fragment.appendChild(createMovieElement(movie, lazyLoad));
  });
  container.appendChild(fragment);
}

function createCategories(categories, container) {
  container.innerHTML = '';
  
  const fragment = document.createDocumentFragment();
  categories.forEach(category => {
    const categoryContainer = document.createElement('div');
    categoryContainer.classList.add('category-container');

    const title = document.createElement('h3');
    title.classList.add('category-title');
    title.id = 'id' + category.id;
    title.textContent = category.name;
    title.addEventListener('click', () => {
      location.hash = `#category=${category.id}-${category.name}`;
    });

    categoryContainer.appendChild(title);
    fragment.appendChild(categoryContainer);
  });
  container.appendChild(fragment);
}

// API functions
async function getTrendingMoviesPreview() {
  try {
    const { results: movies } = await fetchApi('trending/movie/day');
    createMovies(movies, trendingPreviewSection, { lazyLoad: true });
  } catch (error) {
    console.error('Error getting trending movies:', error);
  }
}

async function getCategegoriesPreview() {
  const { genres } = await fetchApi('genre/movie/list');
  createCategories(genres, categoriesPreviewSection);
}

// Navigation section
function navigator() {
  if (location.hash.startsWith('#trends')) {
    trendingPage();
  } else if (location.hash.startsWith('#category=')) {
    categoryPage();
  } else if (location.hash.startsWith('#movie=')) {
    movieDetailsPage();
  } else if (location.hash.startsWith('#search=')) {
    searchPage();
  } else {
    homePage();
  }

  // Remove previous infinite scroll listener
  if (infiniteScroll) {
    window.removeEventListener('scroll', infiniteScroll, { passive: true });
  }

  // Scroll to top when navigating
  document.documentElement.scrollTop = 0;
}

function homePage() {
  headerSection.classList.remove('header-container--long');
  headerSection.style.background = '';
  document.querySelector('.header-title').classList.remove('inactive');
  document.querySelector('.header-arrow').classList.add('inactive');
  document.querySelector('.header-home').classList.remove('header-home--white');
  document.querySelector('.header-title--categoryView').classList.add('inactive');
  document.querySelector('.header-searchForm').classList.remove('inactive');

  trendingPreviewSection.parentElement.classList.remove('inactive');
  categoriesPreviewSection.parentElement.classList.remove('inactive');
  genericSection.classList.add('inactive');
  movieDetailSection.classList.add('inactive');

  getTrendingMoviesPreview();
  getCategegoriesPreview();
}

function categoryPage() {
  headerSection.classList.remove('header-container--long');
  headerSection.style.background = '';
  document.querySelector('.header-title').classList.add('inactive');
  document.querySelector('.header-arrow').classList.remove('inactive');
  document.querySelector('.header-home').classList.remove('header-home--white');
  document.querySelector('.header-title--categoryView').classList.remove('inactive');
  document.querySelector('.header-searchForm').classList.add('inactive');

  trendingPreviewSection.parentElement.classList.add('inactive');
  categoriesPreviewSection.parentElement.classList.add('inactive');
  genericSection.classList.remove('inactive');
  movieDetailSection.classList.add('inactive');

  const [_, categoryData] = location.hash.split('=');
  const [categoryId, categoryName] = categoryData.split('-');

  document.querySelector('.header-title--categoryView').textContent = decodeURIComponent(categoryName);
  getMoviesByCategory(categoryId);

  infiniteScroll = getPaginatedMoviesByCategory(categoryId);
  window.addEventListener('scroll', infiniteScroll, { passive: true });
}

function movieDetailsPage() {
  headerSection.classList.add('header-container--long');
  document.querySelector('.header-title').classList.add('inactive');
  document.querySelector('.header-arrow').classList.remove('inactive');
  document.querySelector('.header-arrow').classList.add('header-arrow--white');
  document.querySelector('.header-home').classList.add('header-home--white');
  document.querySelector('.header-title--categoryView').classList.add('inactive');
  document.querySelector('.header-searchForm').classList.add('inactive');

  trendingPreviewSection.parentElement.classList.add('inactive');
  categoriesPreviewSection.parentElement.classList.add('inactive');
  genericSection.classList.add('inactive');
  movieDetailSection.classList.remove('inactive');

  const [_, movieId] = location.hash.split('=');
  getMovieById(movieId);
}

function searchPage() {
  headerSection.classList.remove('header-container--long');
  headerSection.style.background = '';
  document.querySelector('.header-title').classList.add('inactive');
  document.querySelector('.header-arrow').classList.remove('inactive');
  document.querySelector('.header-home').classList.remove('header-home--white');
  document.querySelector('.header-title--categoryView').classList.add('inactive');
  document.querySelector('.header-searchForm').classList.remove('inactive');

  trendingPreviewSection.parentElement.classList.add('inactive');
  categoriesPreviewSection.parentElement.classList.add('inactive');
  genericSection.classList.remove('inactive');
  movieDetailSection.classList.add('inactive');

  const [_, query] = location.hash.split('=');
  getMoviesBySearch(decodeURIComponent(query));

  infiniteScroll = getPaginatedMoviesBySearch(query);
  window.addEventListener('scroll', infiniteScroll, { passive: true });
}

// Add event listeners for navigation
window.addEventListener('DOMContentLoaded', navigator, false);
window.addEventListener('hashchange', navigator, false);
document.querySelector('.header-arrow').addEventListener('click', () => {
  history.back();
});
document.querySelector('.header-home').addEventListener('click', () => {
  location.hash = '';
});

// Update the search form event listener
document.querySelector('#searchForm')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const searchInput = e.target.querySelector('input');
    if (searchInput.value) {
        location.hash = `#search=${searchInput.value}`;
    }
});

// Add the getMovieById function
async function getMovieById(id) {
  const movie = await fetchApi(`movie/${id}`);
  
  const movieImgUrl = createImageUrl(movie.poster_path, 'w500');
  headerSection.style.background = `
    linear-gradient(
      180deg,
      rgba(0, 0, 0, 0.35) 19.27%,
      rgba(0, 0, 0, 0) 29.17%
    ),
    url(${movieImgUrl})
  `;
  
  movieDetailTitle.textContent = movie.title;
  movieDetailDescription.textContent = movie.overview;
  movieDetailScore.textContent = movie.vote_average;

  createCategories(movie.genres, movieDetailCategoriesList);
  getRelatedMoviesId(id);
}

// Add the getMoviesBySearch function
async function getMoviesBySearch(query) {
  const { results } = await fetchApi('search/movie', { query });
  maxPage = data.total_pages;
  createMovies(results, genericSection, { lazyLoad: true });
}

// Initial load
async function init() {
    try {
        console.log('App initialized');
        await Promise.all([
            getTrendingMoviesPreview(),
            getCategegoriesPreview(),
        ]);
    } catch (error) {
        console.error('Error initializing app:', error);
    }
}

init();

async function getMoviesByCategory(id) {
  const data = await fetchApi('discover/movie', { with_genres: id });
  maxPage = data.total_pages;
  createMovies(data.results, genericSection, { lazyLoad: true });
}

// Pagination helper
const createPaginatedFetch = (fetchFunction) => {
  return async function() {
    const { scrollTop, scrollHeight, clientHeight } = document.documentElement;
    const scrollIsBottom = (scrollTop + clientHeight) >= (scrollHeight - 15);
    
    if (scrollIsBottom && page < maxPage) {
      page++;
      await fetchFunction(page);
    }
  };
};

// Paginated functions
const getPaginatedMoviesByCategory = (id) => {
  return createPaginatedFetch(async (page) => {
    const data = await fetchApi('discover/movie', { 
      with_genres: id, 
      page 
    });
    createMovies(data.results, genericSection, { lazyLoad: true, clean: false });
  });
};

const getPaginatedMoviesBySearch = (query) => {
  return createPaginatedFetch(async (page) => {
    const data = await fetchApi('search/movie', { query, page });
    createMovies(data.results, genericSection, { lazyLoad: true, clean: false });
  });
};

async function getRelatedMoviesId(id) {
  const { results } = await fetchApi(`movie/${id}/recommendations`);
  createMovies(results, relatedMoviesContainer);
}

// Add new trending functions
async function getTrendingMovies() {
  const data = await fetchApi('trending/movie/day');
  maxPage = data.total_pages;
  createMovies(data.results, genericSection, { lazyLoad: true });
}

const getPaginatedTrendingMovies = () => {
  return createPaginatedFetch(async (page) => {
    const data = await fetchApi('trending/movie/day', { page });
    createMovies(data.results, genericSection, { lazyLoad: true, clean: false });
  });
};

// Add trending page function
function trendingPage() {
  headerSection.classList.remove('header-container--long');
  headerSection.style.background = '';
  document.querySelector('.header-title').classList.add('inactive');
  document.querySelector('.header-arrow').classList.remove('inactive');
  document.querySelector('.header-home').classList.remove('header-home--white');
  document.querySelector('.header-title--categoryView').classList.remove('inactive');
  document.querySelector('.header-searchForm').classList.add('inactive');

  trendingPreviewSection.parentElement.classList.add('inactive');
  categoriesPreviewSection.parentElement.classList.add('inactive');
  genericSection.classList.remove('inactive');
  movieDetailSection.classList.add('inactive');

  document.querySelector('.header-title--categoryView').textContent = 'Trending Movies';
  getTrendingMovies();

  infiniteScroll = getPaginatedTrendingMovies();
  window.addEventListener('scroll', infiniteScroll, { passive: true });
}

// Add event listener to trending button
document.querySelector('.trendingPreview-btn').addEventListener('click', () => {
  location.hash = '#trends';
});