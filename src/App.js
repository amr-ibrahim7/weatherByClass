import { useReducer, useEffect } from "react";

function getWeatherIcon(wmoCode) {
  const icons = new Map([
    [[0], "☀️"],
    [[1], "🌤"],
    [[2], "⛅️"],
    [[3], "☁️"],
    [[45, 48], "🌫"],
    [[51, 56, 61, 66, 80], "🌦"],
    [[53, 55, 63, 65, 57, 67, 81, 82], "🌧"],
    [[71, 73, 75, 77, 85, 86], "🌨"],
    [[95], "🌩"],
    [[96, 99], "⛈"],
  ]);
  const arr = [...icons.keys()].find((key) => key.includes(wmoCode));
  if (!arr) return "NOT FOUND";
  return icons.get(arr);
}

function convertToFlag(countryCode) {
  const codePoints = countryCode
    .toUpperCase()
    .split("")
    .map((char) => 127397 + char.charCodeAt());
  return String.fromCodePoint(...codePoints);
}

function formatDay(dateStr) {
  return new Intl.DateTimeFormat("en", {
    weekday: "short",
  }).format(new Date(dateStr));
}

function App() {
  const initialState = {
    location: "",
    isLoading: false,
    displayLocation: "",
    weather: {},
  };

  const reducer = (state, action) => {
    switch (action.type) {
      case "locationChange":
        return { ...state, location: action.payload };
      case "isLoadingChange":
        return { ...state, isLoading: action.payload };
      case "displayLocationChange":
        return { ...state, displayLocation: action.payload };
      case "weatherChange":
        return { ...state, weather: action.payload };
      default:
        return { ...state };
    }
  };

  const [state, dispatch] = useReducer(reducer, initialState);

  const fetchWeather = async () => {
    if (state.location.length < 2) {
      dispatch({ type: "weatherChange", payload: {} });
    }
    //

    try {
      dispatch({ type: "isLoadingChange", payload: true });
      // 1) Getting location (geocoding)
      const geoRes = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${state.location}`
      );
      const geoData = await geoRes.json();
      // console.log(geoData);

      if (!geoData.results) throw new Error("Location not found");

      const { latitude, longitude, timezone, name, country_code } =
        geoData.results.at(0);

      dispatch({
        type: "displayLocationChange",
        payload: `${name} ${convertToFlag(country_code)}`,
      });

      // 2) Getting actual weather
      const weatherRes = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&timezone=${timezone}&daily=weathercode,temperature_2m_max,temperature_2m_min&temperature_unit=fahrenheit`
      );
      const weatherData = await weatherRes.json();

      dispatch({ type: "weatherChange", payload: weatherData.daily });
    } catch (err) {
      console.error(err);
    } finally {
      dispatch({ type: "isLoadingChange", payload: false });
    }
  };

  const setLocation = (event) =>
    dispatch({ type: "locationChange", payload: event.target.value });

  useEffect(() => {
    fetchWeather();
    localStorage.setItem("location", state.location);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.location]);

  return (
    <div className="app">
      <h1>Classy Weather</h1>
      <div></div>
      <Input location={state.location} onChangeLocation={setLocation} />
      {state.isLoading && <p className="loader">Loading...</p>}
      {state.weather.weathercode && (
        <Weather weather={state.weather} location={state.displayLocation} />
      )}
    </div>
  );
}

const Weather = ({ weather, location }) => {
  const {
    temperature_2m_max: max,
    temperature_2m_min: min,
    time: dates,
    weathercode: codes,
  } = weather;

  return (
    <div>
      <h2>Weather in {location}</h2>
      <ul className="weather">
        {dates.map((date, i) => {
          return (
            <Day
              max={max.at(i)}
              min={min.at(i)}
              date={date}
              codes={codes.at(i)}
              key={date}
              isToday={i === 0}
            />
          );
        })}
      </ul>
    </div>
  );
};

const Day = ({ max, min, date, codes, isToday }) => {
  return (
    <li className="day">
      <span>{getWeatherIcon(codes)}</span>
      <p>{isToday ? "Today" : formatDay(date)}</p>
      <p>
        {Math.floor(min)}&deg; &mdash; <strong>{Math.ceil(max)}&deg;</strong>
      </p>
    </li>
  );
};

const Input = ({ location, onChangeLocation }) => {
  return (
    <input
      type="text"
      placeholder="Search location..."
      value={location}
      onChange={onChangeLocation}
    />
  );
};

export default App;
