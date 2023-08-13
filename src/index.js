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
  var Steps_orbit = 360;
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
  console.log(res);

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

function updateInterpolatedPrediction(predictionObj, observer_loc) {
  // Query times for interpolation
  const queryTime = new Date();
  const interpolatedSet = getPredictedValsAt(queryTime, predictionObj);
  console.log(interpolatedSet);

  // compute other important stuff for updating elements
  var sun_loc = getSunLatLon(queryTime);
  var satTrackPath = prediction2sattrack(predictionObj);
  var sat_loc = {
    longitude: interpolatedSet.longitudeDeg,
    latitude: interpolatedSet.latitudeDeg,
    altitude: interpolatedSet.height,
  };
  var satskycoords = prediction2skymap(predictionObj);
  var satskycoords_now = {az: interpolatedSet.azimuthdeg, el: interpolatedSet.elevationdeg};

  //update html inner content
  setInnerHtmlbyId("speed-card", interpolatedSet.velocityEciMag.toFixed(4));
  setInnerHtmlbyId("alt-card", interpolatedSet.height.toFixed(2));
  setInnerHtmlbyId("stale-card", interpolatedSet.stale_min.toFixed(2));
  setInnerHtmlbyId("dist-card", interpolatedSet.rangeSat.toFixed(2));

  setInnerHtmlbyId('az-text', 'Azimuth: ' + satskycoords_now.az.toFixed(4) + '°');
  setInnerHtmlbyId('el-text', 'Elevation: ' + satskycoords_now.el.toFixed(4) + '°');

  // update plots
  console.log(sun_loc);
  console.log(sat_loc);
  console.log(satTrackPath);
  console.log(observer_loc);
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


function true2eccentric(f, ecc) {
  var sinE = Math.sqrt(1 - ecc**2) * Math.sin(f);
  var cosE = ecc + Math.cos(f);
  var E = Math.atan2(sinE, cosE);
  return E;
}


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

function mean2eccentric(meanAnomaly, eccentricity, tolerance = 1e-6) {
  let eccentricAnomaly = meanAnomaly; // Initial guess
  
  while (true) {
    const deltaM = eccentricAnomaly - eccentricity * Math.sin(eccentricAnomaly) - meanAnomaly;
    const deltaE = deltaM / (1 - eccentricity * Math.cos(eccentricAnomaly));
    eccentricAnomaly -= deltaE;
    
    if (Math.abs(deltaE) < tolerance) {
      break;
    }
  }
  
  return eccentricAnomaly;
}

function polar2cartesian(r, E) {
  var x = r * Math.cos(E);
  var y = r * Math.sin(E);
  return {x, y}
}

function aef2r(a, ecc, E) {
  var b = a * Math.sqrt(1 - ecc**2);
  var num = a*b;
  var denom1 = b**2 * Math.cos(E)**2;
  var denom2 = a**2 * Math.sin(E)**2;
  var denom = Math.sqrt(denom1 + denom2);
  var r = num/denom;
  return r;
}

function aeftor(a, ecc, f) {
  var E = true2eccentric(f, ecc);
  var r = aef2r(a, ecc, E);
  return r;
}

function appendIfExist(element, appending) {
  const appended = element.node()
      ? element
      : g.append(appending);
}

function make_orbit_plot(ecc, MA_now, only_base=false) {

  var elem_id = 'orbit_plot_svg';
  var canvas = d3.select("#" + elem_id);
  canvas.selectAll("svg").remove();
  var svg = canvas.append("svg");

  var asked_ar = Number(canvas.attr("ar"));
  var canvas_width = svg.node().getBoundingClientRect().width;
  var canvas_height = canvas_width*asked_ar;
  svg.attr("height", canvas_width*asked_ar);

  var margin = 7;
  var cX = canvas_width/2;
  var cY = canvas_height/2;
  var radius = Math.min(cX-margin, cY-margin);

  var SMA = radius;
  var SmA = SMA*Math.sqrt(1 - ecc**2);
  var C = SMA*ecc;

  var E_now = mean2eccentric(MA_now, ecc);

  var R = aef2r(SMA, ecc, E_now);
  var satpos = polar2cartesian(R, E_now);

  var xScale = d3.scaleLinear(
      [-radius, radius], 
      [-radius+cX, radius+cX]
  );
  var yScale = d3.scaleLinear(
      [-radius, radius], 
      [-radius+cY, radius+cY]
  );

  var tooltip = svg
      .append("div")
      .style("position", "absolute")
      .style("z-index", "10")
      .style("visibility", "hidden")
      .style("background", "#000")
      .text("a simple tooltip");

  var circle = svg.append("ellipse")
      .attr("cx", xScale(0))
      .attr("cy", yScale(0))
      .attr("rx", SMA)
      .attr("ry", SmA)
      .attr("class", "line3");

  var focus = svg.append("circle")
      .attr("cx", xScale(C))
      .attr("cy", yScale(0))
      .attr("r", 7)
      .attr("class", "scatter4");
      
  var earth_text = svg.append("text")
      .text("Earth")
      .attr("x", xScale(C))
      .attr("y", yScale(0))
      .attr("dx", -10)
      .attr("dy", 5)
      .attr("text-anchor", "end")
      .attr("class", "graphtext");

  if (only_base!=true) {
      var sat = svg.append("circle")
          .attr("cx", xScale(satpos.x))
          .attr("cy", yScale(-satpos.y))
          .attr("r", 5)
          .attr("class", "satpin blink");
  };

};


function getSubtendedHalfAngle(SatCurrLoc) {
  var EarthR = 6371.4; //km
  var subtendHalfAngle = Math.acos(EarthR/(EarthR+SatCurrLoc.altitude));
  return subtendHalfAngle;
}

function projectOnMap(projection, coord) {
  var projected = projection([
    coord.longitude,
    coord.latitude
  ]);
  return projected;
}

async function getMapJson() {
  var MapJsonUrl = 'https://raw.githubusercontent.com/holtzy/D3-graph-gallery/master/DATA/world.geojson';

  let obj;
  obj = await d3.json(MapJsonUrl);
  return obj;
}
	

async function make_map_plot(SunPos, SatCurrLoc, SatTrackPath, place, only_base=false) {

  const geojson = await getMapJson();

  //////////////////////////////////////////////////

  var elem_id = 'map_plot_svg';
  var canvas = d3.select("#" + elem_id);
  canvas.selectAll("svg").remove();

  var asked_ar = Number(canvas.attr("ar"));

  var svg = canvas.append("svg");
  var canvas_width = svg.node().getBoundingClientRect().width;
  var canvas_height = canvas_width*asked_ar;
  svg.attr("height", canvas_width*asked_ar);

  let projection = d3.geoEquirectangular()
      .precision(1);

  let geoGenerator = d3.geoPath()
      .pointRadius(5)
    .projection(projection);

  //////////////////////////////////////////////////

  let u = svg.selectAll('path')
		.data(geojson.features);
    
  projection.fitExtent([ [0, 0], [canvas_width, canvas_height] ], geojson);

  // Make Land Map
  // Draw a rectangle as a background
  var water = svg.append("rect")
    .attr("x", 0)
    .attr("y", 0)
    .attr("width", canvas_width)
    .attr("height", canvas_height)
    .attr("class", "mapwater");
    
  var map = u.enter()
    .append('path')
    .attr('d', geoGenerator)
    .attr("class", "mapland");
  
  //  Make Graticules
  let graticuleGenerator = d3.geoGraticule();

  let graticules = graticuleGenerator();

  var grid = u.enter()
  .append('path')
  .attr('d', geoGenerator(graticules))
  .attr("class", "mapgraticule");

  if (only_base!=true) {
    // Make Satellite Current Pos and View Circle
    var sat_point = u.enter().append("circle")
        .attr("r", 4)
        .attr("transform", "translate(" + projectOnMap(projection, SatCurrLoc) + ")")
        .attr('class', 'satpin blink');

    let circleGenerator1 = d3.geoCircle()
        .center([SatCurrLoc.longitude, SatCurrLoc.latitude])
        .radius(getSubtendedHalfAngle(SatCurrLoc)*180/Math.PI);

    let circle1 = circleGenerator1();

    var sat_view = u.enter()
    .append('path')
    .attr('d', geoGenerator(circle1))
    .attr("class", "satviewarea");
      
    // Make Circle Sun Pos
    var sun_point = u.enter().append("circle")
        .attr("r", 4)
        .attr("transform", "translate(" + projectOnMap(projection, SunPos) + ")")
        .attr('class', 'sunpin');

    let circleGenerator2 = d3.geoCircle()
        .center([SunPos.longitude, SunPos.latitude])
        .radius(90);

    let circle2 = circleGenerator2();

    var sun_circle = u.enter()
      .append('path')
      .attr('d', geoGenerator(circle2))
      .attr('class', 'sunlitarea')
      .attr('fill-opacity', 0.2);

    //  Make Sat Track Lines
    let line = {
        type: 'Feature',
        geometry: {
            type: 'LineString',
            coordinates: SatTrackPath
        }
    };
    var sat_tracks = u.enter()
    .append('path')
    .attr('d', geoGenerator(line))
    .attr('class', 'sattrack');
        
    //  Make Ground Location Points
    var gnd_points = u.enter().append("circle")
        .attr("r", 4)
        .attr("class", "pin")
        .attr("transform", "translate(" + projectOnMap(projection, place.location) + ")")
        .attr('class', 'citypin');
  };

};


function sky2cartpolar(SkyCoords, xScale, yScale, rScale) {
  if (typeof SkyCoords !== 'undefined' && SkyCoords.length > 0) {
      // the array is defined and has at least one element
      const coords = [];
      let i = 0;
      while (i<SkyCoords.length) {
          var satR = 1 - Math.abs(SkyCoords[i].el)/90.0;
          var satX = xScale(0) + rScale(satR*Math.cos((SkyCoords[i].az-90)*Math.PI/180));
          var satY = yScale(0) + rScale(satR*Math.sin((SkyCoords[i].az-90)*Math.PI/180));
          var coord = {x: satX, y: satY};
          coords.push(coord);
          i++
      };
      return coords;
  } else {
      var satR = 1 - Math.abs(SkyCoords.el)/90.0;
      var satX = xScale(0) + rScale(satR*Math.cos((SkyCoords.az-90)*Math.PI/180));
      var satY = yScale(0) + rScale(satR*Math.sin((SkyCoords.az-90)*Math.PI/180));
      var coord = {x: satX, y: satY};
      return coord;
  };
};


function make_sky_plot(SkyCoords, SkyCoords_now, only_base=false) {
  //Make an SVG Container
  var margin = 5;
  var axis_factor = 1.2;
  var canvas = d3.select("#sky_plot_svg");
  canvas.selectAll("svg").remove();

  var asked_ar = Number(canvas.attr("ar"));

  var svg = canvas.append("svg");
  var canvas_width = svg.node().getBoundingClientRect().width;
  var canvas_height = canvas_width*asked_ar;
  svg.attr("height", canvas_width*asked_ar);

  var cX = canvas_width/2;
  var cY = canvas_height/2;
  var radius = Math.min(cX-margin, cY-margin)/axis_factor;

  var xScale = d3.scaleLinear(
      [-radius, radius], 
      [-radius+cX, radius+cX]
  );
  var yScale = d3.scaleLinear(
      [-radius, radius], 
      [-radius+cY, radius+cY]
  );
  var rScale = d3.scaleLinear(
      [-1, 1], 
      [-radius, radius]
  );

  var N_circles = 3;
  for (let i = 1; i <= N_circles; i++) {
      var r_step = 1/N_circles;
      var eff_r = i*r_step;
      svg.append("circle")
          .attr("cx", xScale(0))
          .attr("cy", yScale(0))
          .attr("r", rScale(eff_r))
          .attr("class", "axis");
  };

  var dir_labels = ['N', 'E', 'S', 'W'];
  var dir_angles = [0, 90, 180, 270];
  const len_dir = dir_angles.length;

  for (let i = 0; i < len_dir; i++) {
      var eff_ang = (dir_angles[i] - 90)*Math.PI/180;
      var x = Math.cos(eff_ang);
      var y = Math.sin(eff_ang);
      svg.append("line")
          .attr("x1", xScale(0))
          .attr("y1", yScale(0))
          .attr("x2", xScale(0) + rScale(x*(axis_factor-0.1)))
          .attr("y2", yScale(0) + rScale(y*(axis_factor-0.1)))
          .attr("class", "axis");
      svg.append("text")
          .text(dir_labels[i])
          .attr("x", xScale(0) + rScale(x*(axis_factor-0.025)))
          .attr("y", yScale(0) + rScale(y*(axis_factor-0.025)))
          .attr("dx", 0)
          .attr("dy", 5)
          .attr("text-anchor", "middle")
          .attr("class", "graphlabels");
  };

  var SatCoords_now = sky2cartpolar(SkyCoords_now, xScale, yScale, rScale);

  if (only_base!=true) {
      if (typeof SkyCoords !== 'undefined' && SkyCoords.length > 0) {
          // the array is defined and has at least one element
          var SatCoords = sky2cartpolar(SkyCoords, xScale, yScale, rScale);

          var rise_time = getLocalDateTime(SkyCoords[0].t);
          var set_time = getLocalDateTime(SkyCoords[SkyCoords.length - 1].t);

          var pathLine = d3.line()
              .x(d => d.x)
              .y(d => d.y)
              .curve(d3.curveCatmullRom.alpha(.5));

          svg.append("path")
              .attr("d", pathLine(SatCoords))
              .attr("class", "line4");

          svg.append("circle")
              .attr("cx", SatCoords[0].x )
              .attr("cy", SatCoords[0].y )
              .attr("r", 4)
              .attr("class", "scatter3");
          if (SatCoords_now.el < 0) {
              svg.append("text")
                  .text("Rise: " + rise_time.date + ' ' + rise_time.time)
                  .attr("x", 0)
                  .attr("y", 0)
                  .attr("dx", 5)
                  .attr("dy", 10)
                  .attr("text-anchor", "start")
                  .attr("class", "graphtext");
          };
          
          svg.append("circle")
              .attr("cx", SatCoords[SatCoords.length - 1].x )
              .attr("cy", SatCoords[SatCoords.length - 1].y )
              .attr("r", 4)
              .attr("class", "scatter2");
          if (SatCoords_now.el < 0) {
              svg.append("text")
                  .text("Set: " + set_time.date + ' ' + set_time.time)
                  .attr("x", canvas_width)
                  .attr("y", 0)
                  .attr("dx", -5)
                  .attr("dy", 10)
                  .attr("text-anchor", "end")
                  .attr("class", "graphtext");
          };

      };

      var sat = svg.append("circle")
              .attr("cx", SatCoords_now.x )
              .attr("cy", SatCoords_now.y )
              .attr("r", 5)
              .attr("class", "satpin blink");
  };
          


};

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

const deg2rad = 2*Math.PI/180;
const rad2deg = 180/2/Math.PI;
const MUearth = 3.986004418e5;
const Rearth = 6371.4;

// window.onresize = function(){ location.reload(); };

make_orbit_plot(0, 0, true);
make_map_plot([], [], [], [], true);

document.addEventListener('DOMContentLoaded', async function () {
  // Start displaying local time and update it
  setInterval(updateLocalTime, 1000);

  // Monitor the search button and corresponding  onclick event
  document.getElementById('get_sat_id').onclick = async function () {
    setInnerHtmlbyId('found_sat', 'Searching...');
    var textInput = document.getElementById('sat_id_input');
    var TLE = await getGPDataCelestrack(textInput.value.trim(), 'TLE');
    setInnerHtmlbyId('found_sat', TLE[0]);
  };

  // Monitor the apply button and corresponding  onclick event
  document.getElementById('apply_sat').onclick = async function () {
    var fadelayer = document.getElementById('fade-wrapper');
    var spinner = document.getElementById('spinner');
    fadelayer.style.display = 'block';
    fadelayer.style.opacity = 1;
    spinner.style.display = 'block';
    spinner.style.opacity = 1;

    var textInput = document.getElementById('sat_id_input');
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
    console.log(observer_loc);

    setInnerHtmlbyId('found_sat', TLE[0]);
    setInnerHtmlbyId('tle0', TLE[0]);
    setInnerHtmlbyId('tle1', TLE[1]);
    setInnerHtmlbyId('tle2', TLE[2]);
    setInnerHtmlbyId('tle_update', (new Date()).toLocaleString() + ', generated at: ' + (new Date((satrec.jdsatepoch - 2440587.5)*86400000)).toLocaleString());
    setInnerHtmlbyId('apogee-text', 'Apogee: ' + ((1+satrec.ecco)*(Math.cbrt(MUearth/(satrec.no/60)**2)) - Rearth).toFixed(3) + ' km');
    setInnerHtmlbyId('perigee-text', 'Perigee: ' + ((1-satrec.ecco)*(Math.cbrt(MUearth/(satrec.no/60)**2)) - Rearth).toFixed(3) + ' km');
    setInnerHtmlbyId('inclination-text', 'Inclination: ' + ((satrec.inclo)*rad2deg).toFixed(4) + '°');
    console.log(TLE);
  
    const N_orbits = 1;
    const predictionObj = predictNOrbits(satrec, N_orbits, observer_loc);
    console.log(predictionObj);

    var refreshTime = 2000;
    var refreshIntervalId = setInterval(updateInterpolatedPrediction, refreshTime, predictionObj, my_loc);
    if (predictionObj.time.at(-1) <= (new Date())) {
      clearInterval(refreshIntervalId);
    };

    fadelayer.style.display = 'None';
    fadelayer.style.opacity = 0;
    spinner.style.display = 'None';
    spinner.style.opacity = 0;
  };
});

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////