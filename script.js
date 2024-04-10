'use strict';

const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');

class Workout {
  date = new Date();
  id = this.date.getTime();

  constructor(coords, distance, duration) {
    this.coords = coords; // [lat, lng]
    this.distance = distance; // km
    this.duration = duration; // min
  }

  _setDescription() {
    // prettier-ignore
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    this.description = `${this.type[0].toUpperCase() + this.type.slice(1)}
      on
      ${months[this.date.getMonth()]}
      ${this.date.getDate()}`;
  }
}

class Running extends Workout {
  constructor(coords, distance, duration, cadence) {
    super(coords, distance, duration);
    this.type = 'running';
    this.cadence = cadence;
    this.calcPace();
    this._setDescription();
  }

  calcPace() {
    // min/km
    this.pace = (this.duration / this.distance).toFixed(1);
    return this.pace;
  }
}

class Cycling extends Workout {
  constructor(coords, distance, duration, elevation) {
    super(coords, distance, duration);
    this.type = 'cycling';
    this.elevation = elevation;
    this.calcSpeed();
    this._setDescription();
  }

  calcSpeed() {
    // km/h
    this.speed = (this.distance / (this.duration / 60)).toFixed(1);
    return this.speed;
  }
}

/////////////////////////////////////////////
// Application Architecture
class App {
  #map;
  #mapZoomLevel = 17;
  #mapEvent;
  #workouts = [];

  constructor() {
    this._loadMap();
    this._setMarkerIcon();
    this._getLocalStorage();

    // attach event handlers
    inputType.addEventListener('change', this._toggleElevationForm);
    form.addEventListener('submit', this._newWorkout.bind(this));
    containerWorkouts.addEventListener('click', this._moveToPopup.bind(this));
  }

  _getPosition() {
    if (navigator.geolocation)
      navigator.geolocation.getCurrentPosition(this._loadMap.bind(this), err =>
        console.log(err)
      );
  }

  _loadMap(position) {
    const { latitude, longitude } = position?.coords || {
      latitude: 0,
      longitude: 0,
    };
    const coords = [36.27, 49.99435]; // [latitude, longitude]
    this.#map = L.map('map').setView(coords, this.#mapZoomLevel);

    L.tileLayer('https://tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);

    // Handling click on map
    this.#map.on('click', this._showForm.bind(this));
  }

  _setMarkerIcon() {
    // set custom marker
    this.markerIcon = L.icon({
      iconUrl: './images/Map-Marker-Free-Download-PNG.png',
      iconSize: [50, 50],
      iconAnchor: [23, 55],
      popupAnchor: [0, -50],
    });
  }

  _setLocalStorage() {
    localStorage.setItem('workouts', JSON.stringify(this.#workouts))
  }

  _getLocalStorage() {
    const data = JSON.parse(localStorage.getItem('workouts'))

    if(!data) return;

    this.#workouts = data
    this.#workouts.forEach(work => {
      this._renderWorkout(work)
      this._renderWorkoutMarker(work)
    })
  }

  _newWorkout(e) {
    e.preventDefault();

    const validInputs = (...inputs) =>
      inputs.every(input => Number.isFinite(input));
    const allPositive = (...inputs) => inputs.every(input => input > 0);

    const { lat, lng } = this.#mapEvent.latlng;
    const coords = [lat, lng];

    // Get data from form
    const type = inputType.value;
    const distance = +inputDistance.value;
    const duration = +inputDuration.value;
    const cadence = +inputCadence.value;
    const elevation = +inputElevation.value;
    let workout;

    // if workout running, create running object
    if (type === 'running') {
      // check if data is valid
      if (
        !validInputs(distance, duration, cadence) ||
        !allPositive(distance, duration, cadence)
      )
        return alert('inputs have to be posetive numbers');

      workout = new Running(coords, distance, duration, cadence);
    }

    // if workout cycling, create cycling object
    if (type === 'cycling') {
      // check if data is valid
      if (
        !validInputs(distance, duration, elevation) ||
        !allPositive(distance, duration)
      )
        return alert('inputs have to be posetive numbers');

      workout = new Cycling(coords, distance, duration, elevation);
    }
    // set local storage to all workouts
    this.#workouts.push(workout)
    this._setLocalStorage()
    // render workout marker on map
    this._renderWorkoutMarker(workout);
    // render workout on list
    this._renderWorkout(workout);
    // hide form + clear input fields
    this._hideForm();
  }

  _renderWorkout(workout) {
    const type = workout.type;
    const isCycling = type === 'cycling';
    const html = `<li class="workout workout--${type}" data-id="${workout.id}">
        <h2 class="workout__title">${workout.description}</h2>
        <div class="workout__details">
          <span class="workout__icon">${isCycling ? '🚴‍♀️' : '🏃‍♂️'}</span>
          <span class="workout__value">${workout.distance}</span>
          <span class="workout__unit">km</span>
        </div>
        <div class="workout__details">
          <span class="workout__icon">⏱</span>
          <span class="workout__value">${workout.duration}</span>
          <span class="workout__unit">min</span>
        </div>
        <div class="workout__details">
          <span class="workout__icon">⚡️</span>
          <span class="workout__value">${
            workout[isCycling ? 'speed' : 'pace']
          }</span>
          <span class="workout__unit">${isCycling ? 'km/h' : 'min/km'}</span>
        </div>
        <div class="workout__details">
          <span class="workout__icon">${isCycling ? '⛰' : '🦶🏼 '}</span>
          <span class="workout__value">${
            isCycling ? workout.elevation : workout.cadence
          }</span>
          <span class="workout__unit">${isCycling ? 'm' : 'spm'}</span>
        </div>
    </li>`;
    form.insertAdjacentHTML('afterend', html);
  }

  _renderWorkoutMarker(workout) {
    const title = `${workout.type === 'cycling' ? '🚴‍♀️' : '🏃‍♂️'} ${
      workout.description
    }`;

    // Display marker on the map
    L.marker(workout.coords, {
      icon: this.markerIcon,
    })
      .addTo(this.#map)
      .bindPopup(title, {
        className: 'markerPopup',
        closeOnClick: false,
        autoClose: false,
        maxWidth: 250,
        minWidth: 100,
        className: `${workout.type}-popup`,
      })
      .openPopup();
  }

  _showForm(mapE) {
    this.#mapEvent = mapE;
    form.classList.remove('hidden');
    inputDistance.focus();
  }

  _hideForm() {
    form.style.display = 'none';
    form.classList.add('hidden');
    setTimeout(() => (form.style.display = 'grid'), 100);

    // clear input fields
    inputDistance.value =
      inputDuration.value =
      inputCadence.value =
      inputElevation.value =
        '';
  }

  _toggleElevationForm() {
    inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
    inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
  }

  _moveToPopup(e) {
    const workoutEl = e.target.closest('.workout');
    if (!workoutEl) return;
    const id = +workoutEl.dataset.id;
    const workoutObj = this.#workouts.find(work => work.id === id);
    this.#map.setView(workoutObj.coords, this.#mapZoomLevel, {
      animate: true,
      duration: 0.5,
    });
  }

  reset() {
    localStorage.removeItem('workouts')
    location.reload()
  }
}

const app = new App();
