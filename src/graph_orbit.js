function true2eccentric(f, ecc) {
    var sinE = Math.sqrt(1 - ecc**2) * Math.sin(f);
    var cosE = ecc + Math.cos(f);
    var E = Math.atan2(sinE, cosE);
    return E;
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

/////////////////////////////////////////////////////////////////////
