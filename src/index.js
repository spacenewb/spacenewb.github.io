function setInnerHtmlbyId(element_id, content) {
  document.getElementById(element_id).innerHTML = content;
}

function dummtTLE() {
  var TLE = [
    "ISS (ZARYA)", 
    "1 25544U 98067A   23225.51503384  .00016273  00000-0  29947-3 0  9996",
    "2 25544  51.6403  44.4989 0003352 304.3394 146.6746 15.49326028410681"
  ];
  return TLE;
}

function getDayOfYear(time) {
  var year = time.getFullYear();
  var month = time.getMonth() + 1; 
  var day = time.getDate();
  
  // Array of days in each month, accounting for leap years
  const daysInMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  
  // Check for leap year and adjust February's days if necessary
  if ((year % 4 === 0 && year % 100 !== 0) || year % 400 === 0) {
  daysInMonth[1] = 29;
  };
  
  let dayOfYear = day;
  
  // Sum days in months leading up to the current month
  for (let i = 0; i < month - 1; i++) {
  dayOfYear += daysInMonth[i];
  };
  
  return dayOfYear;
};

function getSunLatitude(time) {
  var DayofYear = getDayOfYear(time);
  var obliquity = 23.4;
  var ang_travel_per_day = 2*obliquity/365.25;
  // Spring Equinox is 79th day
  var ang_offset = 79*ang_travel_per_day;
  var sun_lat = ((DayofYear*ang_travel_per_day) - ang_offset);
  
  var sun_latitude = sun_lat;
  if (sun_lat > obliquity) {
      var sun_latitude = 2*obliquity - sun_lat;
  };
  return sun_latitude;
};

function getSunLongitude(time) {
  var gmtHours = time.getUTCHours();
  var gmtMinutes = time.getUTCMinutes();
  var gmtSeconds = time.getUTCSeconds();
  var fracHours = gmtHours+gmtMinutes/60+gmtSeconds/3600;
  var hourAngle = (12 - fracHours)*15;
  return hourAngle;
};

function getSunLatLon(datetime) {
  var lat = getSunLatitude(datetime);
  var lng = getSunLongitude(datetime);
  return {longitude: lng, latitude: lat};
}

function millisecondsToJulianDate(milliseconds) {
  const unixEpoch = Date.parse('1970-01-01T00:00:00Z'); // Unix Epoch time in milliseconds
  const daysSinceUnixEpoch = (milliseconds - unixEpoch) / (24 * 60 * 60 * 1000);
  const julianDate = daysSinceUnixEpoch + 2440587.5; // January 1, 4713 BCE (Julian calendar)
  return julianDate;
}

function predictNOrbits(satrec, N_orbits, observer_loc) {
  var Steps_orbit = 180;
  var Total_steps = Steps_orbit * N_orbits;
  var period_min = (2 * Math.PI) / satrec.no;
  var Total_time = period_min * N_orbits;
  var deltaT_min = Total_time / Total_steps;

  var prediction = { value: [], time: [] };
  var time_start = new Date();

  for (let i = 1; i <= Total_steps; i++) {
    var Duration_min = deltaT_min * (i - 1);

    var ANS = propagateTLE(satrec, time_start, Duration_min, observer_loc);
    // prediction.push(ANS);
    prediction.value.push(ANS.vals);
    prediction.time.push(ANS.time);
  }

  prediction.satrec = satrec;

  return prediction;
}

function propagateTLE(satrec, time_start, deltaT_min, observer_loc) {
  var min2millisec = 60000;
  var time = new Date(time_start.getTime() + deltaT_min * min2millisec);
  var stale_min =
    (millisecondsToJulianDate(time) - satrec.jdsatepoch) * 24 * 60;

  //  Or you can use a JavaScript Date
  var positionAndVelocity = satellite.propagate(satrec, time);

  // The position_velocity result is a key-value pair of ECI coordinates.
  // These are the base results from which all other coordinates are derived.
  var positionEci = positionAndVelocity.position;
  var velocityEci = positionAndVelocity.velocity;

  // Set the Observer at 122.03 West by 36.96 North, in RADIANS
  var observerGd = {
    longitude: satellite.degreesToRadians(observer_loc.longitude),
    latitude: satellite.degreesToRadians(observer_loc.latitude),
    height: observer_loc.elevation,
  };

  // You will need GMST for some of the coordinate transforms.
  // http://en.wikipedia.org/wiki/Sidereal_time#Definition
  var gmst = satellite.gstime(new Date());

  // You can get ECF, Geodetic, Look Angles, and Doppler Factor.
  var positionEcf = satellite.eciToEcf(positionEci, gmst);
  var positionGd = satellite.eciToGeodetic(positionEci, gmst);
  var lookAngles = satellite.ecfToLookAngles(observerGd, positionEcf);

  // Look Angles may be accessed by `azimuth`, `elevation`, `range_sat` properties.
  var azimuth = lookAngles.azimuth;
  var elevation = lookAngles.elevation;
  var azimuthdeg = azimuth*180/Math.PI;
  var elevationdeg = elevation*180/Math.PI;
  var rangeSat = lookAngles.rangeSat;

  // Geodetic coords are accessed via `longitude`, `latitude`, `height`.
  var longitude = positionGd.longitude;
  var latitude = positionGd.latitude;
  var height = positionGd.height;

  //  Convert the RADIANS to DEGREES.
  var longitudeDeg = satellite.degreesLong(longitude);
  var latitudeDeg = satellite.degreesLat(latitude);

  //  Custom Values
  var velocityEciMag = Math.sqrt(
    velocityEci.x ** 2 + velocityEci.y ** 2 + velocityEci.z ** 2
  );
  var ma = satrec.mo + satrec.no * deltaT_min;

  return {
    time: time.getTime(),
    vals: {
      latitudeDeg,
      longitudeDeg,
      height,
      azimuthdeg,
      elevationdeg,
      rangeSat,
      velocityEciMag,
      ma,
      stale_min,
    },
  };
}

function parseTLE(TLE, FORMAT) {
  if (FORMAT === 'TLE') {
    const N_lines = 3;
    var TLEarray = TLE.split('\r\n')
      .slice(0, N_lines)
      .map((str) => str.trim());
    return TLEarray;
  }

  if (FORMAT === '2LE') {
    const N_lines = 2;
    var TLEarray = TLE.split('\r\n')
      .slice(0, N_lines)
      .map((str) => str.trim());
    return TLEarray;
  }
}

async function getGPDataCelestrack(CATNR, FORMAT) {
  const url =
    'https://celestrak.org/NORAD/elements/gp.php?CATNR=' +
    CATNR +
    '&FORMAT=' +
    FORMAT;

  let obj;

  const res = await fetch(url);

  if (res.ok) {
    if (FORMAT === 'TLE' || FORMAT === '2LE') {
      const rawTLE = await res.text();
      obj = parseTLE(rawTLE, FORMAT);
      return obj;
    }

    if (FORMAT === 'CSV') {
      const rawCSV = await res.text();
      obj = CSVToArray(rawCSV, ',').splice(0, 2);
      return obj;
    }

    if (FORMAT === 'JSON') {
      const jsonRes = await res.json();
      obj = JSON.parse(JSON.stringify(jsonRes[0], '', 2));
      return obj;
    }
  } else {
    return dummtTLE();
  }
}

function interp1(x, y, xq) {
  const n = x.length;

  // Find the indices of the two closest data points
  let idx1 = 0;
  let idx2 = n - 1;
  for (let i = 0; i < n - 1; i++) {
    if (xq >= x[i] && xq <= x[i + 1]) {
      idx1 = i;
      idx2 = i + 1;
      break;
    }
  }

  // Linear interpolation
  const yq =
    y[idx1] + ((y[idx2] - y[idx1]) * (xq - x[idx1])) / (x[idx2] - x[idx1]);
  return yq;
}

function getKey(arr, keyname) {
  var v = arr.map((item) => {
    return item[keyname];
  });
  return v;
}

function prediction2sattrack(predictionObj) {
  var satTrackPath = [];
  var lats = getKey(predictionObj.value, 'latitudeDeg');
  var lngs = getKey(predictionObj.value, 'longitudeDeg');
  
  let i = 0;
  while (i < lats.length) {
    satTrackPath.push([lngs[i], lats[i]]);
    i++;
  };
  return satTrackPath;
}

function prediction2skymap(predictionObj) {
  var satskycoords = [];
  var az = getKey(predictionObj.value, 'azimuthdeg');
  var el = getKey(predictionObj.value, 'elevationdeg');
  var time = predictionObj.time;
  
  let i = 0;
  while (i < az.length) {
    // only include values with positive elevation - visible in sky
    if (el[i] >= 0) {
      var a = az[i];
      var e = el[i];
      var t = time[i];
      satskycoords.push({az: a, el: e, t: t});
    };
    i++;
  };
  return satskycoords;
}

function getPredictedValsAt(queryTimes, predictionObj) {
  var all_keys = Object.keys(predictionObj.value[0]);

  let i = 0;
  var interpolatedSet = {};
  while (i < all_keys.length) {
    // Known data points
    const x = predictionObj.time;
    const y = getKey(predictionObj.value, all_keys[i]);

    if (Array.isArray(queryTimes)) {
      // Perform linear interpolation
      const interpolatedValues = queryTimes.map((queryPoint) =>
        interp1(x, y, queryPoint)
      );
      interpolatedSet[all_keys[i]] = interpolatedValues;
    } else {
      // Perform linear interpolation
      const interpolatedValues = [queryTimes].map((queryPoint) =>
        interp1(x, y, queryPoint)
      );
      interpolatedSet[all_keys[i]] = Number(interpolatedValues);
    }

    i++;
  }
  return interpolatedSet;
}

function updateInterpolatedPrediction(predictionObj) {
  // Query times for interpolation
  const queryTime = new Date();
  const interpolatedSet = getPredictedValsAt(queryTime, predictionObj);

  // compute other important stuff for updating elements
  var satskycoords_now = {az: interpolatedSet.azimuthdeg, el: interpolatedSet.elevationdeg};

  //update html inner content
  setInnerHtmlbyId("speed-card", interpolatedSet.velocityEciMag.toFixed(4));
  setInnerHtmlbyId("alt-card", interpolatedSet.height.toFixed(2));
  setInnerHtmlbyId("stale-card", interpolatedSet.stale_min.toFixed(2));
  setInnerHtmlbyId("dist-card", interpolatedSet.rangeSat.toFixed(2));

  setInnerHtmlbyId('az-text', 'Azimuth: ' + satskycoords_now.az.toFixed(4) + '°');
  setInnerHtmlbyId('el-text', 'Elevation: ' + satskycoords_now.el.toFixed(4) + '°');
};

function updateInterpolatedPredictionPlots(predictionObj, observer_loc, geojson) {
  // Query times for interpolation
  const queryTime = new Date();
  const interpolatedSet = getPredictedValsAt(queryTime, predictionObj);

  // compute other important stuff for updating elements
  var satskycoords_now = {az: interpolatedSet.azimuthdeg, el: interpolatedSet.elevationdeg};
  var satskycoords = prediction2skymap(predictionObj);
  var sun_loc = getSunLatLon(queryTime);
  var satTrackPath = prediction2sattrack(predictionObj);
  var sat_loc = {
    longitude: interpolatedSet.longitudeDeg,
    latitude: interpolatedSet.latitudeDeg,
    altitude: interpolatedSet.height,
  };

  // update plots
  make_orbit_plot(predictionObj.satrec.ecco, interpolatedSet.ma);
  make_map_plot(sun_loc, sat_loc, satTrackPath, observer_loc);
  make_sky_plot(satskycoords, satskycoords_now);
};

function updateLocalTime() {
  setInnerHtmlbyId('local_time', (new Date()).toLocaleString());
};

function getLocalDateTime(milliseconds) {
  const date = new Date(milliseconds);
  const localDateString = date.toLocaleDateString();
  const localTimeString = date.toLocaleTimeString();
  
  return {
    date: localDateString,
    time: localTimeString
  };
}


////////////////////////////////////////////////////////////////////////////////////////////
const deg2rad = 2*Math.PI/180;
const rad2deg = 180/2/Math.PI;
const MUearth = 3.986004418e5;
const Rearth = 6371.4;

window.onresize = function(){ location.reload(); };

document.addEventListener('DOMContentLoaded', async function () {
  // Start displaying local time and update it
  setInterval(updateLocalTime, 1000);

  const geojson = await getMapJson();
  make_map_plot([], [], [], [], true);
  make_orbit_plot(0, 0, true);
  make_sky_plot([], [], true);

  // Monitor the search button and corresponding  onclick event
  document.getElementById('get_sat_id').onclick = async function () {
    setInnerHtmlbyId('found_sat', 'Searching...');
    var textInput = document.getElementById('sat_id_input');
    var TLE = await getGPDataCelestrack(textInput.value.trim(), 'TLE');
    setInnerHtmlbyId('found_sat', TLE[0]);
  };

  // Monitor the apply button and corresponding  onclick event
  document.getElementById('apply_sat').onclick = async function () {

    var textInput = document.getElementById('sat_id_input');
    var apply_btn = document.getElementById('apply_sat');  
    var fund_btn  = document.getElementById('get_sat_id');

    if (apply_btn.getAttribute('mode') === 'stop') {
      location.reload();
    };

    var fadelayer = document.getElementById('fade-wrapper');
    var spinner = document.getElementById('spinner');
    fadelayer.style.display = 'block';
    fadelayer.style.opacity = 1;
    spinner.style.display = 'block';
    spinner.style.opacity = 1;

    const TLE = await getGPDataCelestrack(textInput.value.trim(), 'TLE');

    // Initialize a satellite record
    const satrec = satellite.twoline2satrec(TLE[1], TLE[2]);

    // Get the user location from browser geolocation API
    const observer_loc = await getUserLocation();
    const my_loc = {
      name: "",
      location: {
        latitude: observer_loc.latitude,
        longitude: observer_loc.longitude
      }
    };
    setInnerHtmlbyId('local_lat', observer_loc.latitude.toFixed(4) + '°');
    setInnerHtmlbyId('local_lon', observer_loc.longitude.toFixed(4) + '°');
    setInnerHtmlbyId('local_alt', observer_loc.elevation.toFixed(4) + ' km');

    setInnerHtmlbyId('found_sat', TLE[0]);
    setInnerHtmlbyId('tle0', TLE[0]);
    setInnerHtmlbyId('tle1', TLE[1]);
    setInnerHtmlbyId('tle2', TLE[2]);
    setInnerHtmlbyId('tle_update', (new Date()).toLocaleString() + ', generated at: ' + (new Date((satrec.jdsatepoch - 2440587.5)*86400000)).toLocaleString());
    setInnerHtmlbyId('apogee-text', 'Apogee: ' + ((1+satrec.ecco)*(Math.cbrt(MUearth/(satrec.no/60)**2)) - Rearth).toFixed(3) + ' km');
    setInnerHtmlbyId('perigee-text', 'Perigee: ' + ((1-satrec.ecco)*(Math.cbrt(MUearth/(satrec.no/60)**2)) - Rearth).toFixed(3) + ' km');
    setInnerHtmlbyId('inclination-text', 'Inclination: ' + ((satrec.inclo)*rad2deg).toFixed(4) + '°');
  
    const N_orbits = 1;
    const predictionObj = predictNOrbits(satrec, N_orbits, observer_loc);

    var refreshTimeData = 2000;
    var refreshIntervalId1 = setInterval(updateInterpolatedPrediction, refreshTimeData, predictionObj);
    var refreshTimePlots = 10000;
    var refreshIntervalId2 = setInterval(updateInterpolatedPredictionPlots, refreshTimePlots, predictionObj, my_loc, geojson);
    
    if (predictionObj.time.at(-1) <= (new Date())) {
      clearInterval(refreshIntervalId1);
      clearInterval(refreshIntervalId2);
    };

    fadelayer.style.display = 'None';
    fadelayer.style.opacity = 0;
    spinner.style.display = 'None';
    spinner.style.opacity = 0;

    textInput.disabled = true;
    fund_btn.disabled = true;
    setInnerHtmlbyId('apply_sat', 'Stop');
    apply_btn.setAttribute('mode', 'stop');
  };
});

////////////////////////////////////////////////////////////////////////////////////////////

function CSVToArray(strData, strDelimiter = ',') {
  // Create a regular expression to parse the CSV values.
  var objPattern = new RegExp(
    // Delimiters.
    '(\\' +
      strDelimiter +
      '|\\r?\\n|\\r|^)' +
      // Quoted fields.
      '(?:"([^"]*(?:""[^"]*)*)"|' +
      // Standard fields.
      '([^"\\' +
      strDelimiter +
      '\\r\\n]*))',
    'gi'
  );

  var arrData = [[]];

  var arrMatches = null;

  while ((arrMatches = objPattern.exec(strData))) {
    // Get the delimiter that was found.
    var strMatchedDelimiter = arrMatches[1];

    if (strMatchedDelimiter.length && strMatchedDelimiter !== strDelimiter) {
      arrData.push([]);
    }

    var strMatchedValue;

    if (arrMatches[2]) {
      strMatchedValue = arrMatches[2].replace(new RegExp('""', 'g'), '"');
    } else {
      strMatchedValue = arrMatches[3];
    }

    arrData[arrData.length - 1].push(strMatchedValue);
  }

  return arrData;
}

async function getUserLocation() {
  return new Promise((resolve, reject) => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          const elevation = await getUserAlt(latitude, longitude);
          resolve({ latitude, longitude, elevation });
        },
        (error) => {
          reject(error);
        }
      );
    } else {
      reject(new Error('Geolocation is not available in this browser.'));
    }
  });
}

async function getUserAlt(lat, lng) {
  const url = 'https://api.open-elevation.com/api/v1/lookup?locations=';
  const full_url = url + lat + ',' + lng;
  const response = await fetch(full_url);
  const data = await response.json();
  const elevation_km = data.results[0].elevation / 1000.0;
  return elevation_km;
}

function getMeanAnomalyAfter(
  MA_epoch_deg,
  Mean_motion_rev_day,
  Delta_T_after_epoch_mins
) {
  const Mean_motion_deg_min = (Mean_motion_rev_day * 360) / (24.0 * 60.0);
  const MA_at_T_deg =
    MA_epoch_deg + Mean_motion_deg_min * Delta_T_after_epoch_mins;
  return MA_at_T_deg;
}
