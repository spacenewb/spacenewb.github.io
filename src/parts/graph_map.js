
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

/////////////////////////////////////////////////////////////////////

var SunPos = { latitude: 15, longitude: 0 };

var SatCurrLoc = {latitude: 0, longitude: 30, altitude: 562.4};

var SatTrackPath = [
  [0.128, 51.5074], 
  [-30, 0], 
  [-74.0059, 40.7128]
];

var place = {
    name: "Wollongong, Australia",
    location: {
      latitude: -34.42507,
      longitude: 150.89315
  }
};

/////////////////////////////////////////////////////////////////////
