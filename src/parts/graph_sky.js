
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

/////////////////////////////////////////////////////////////////////

const SkyCoords = [
    {az: 200, el: 40},
    {az: 150, el: 10},
    {az: 100, el: 50},
];

const SkyCoords_now = {az: 150, el: 10};

/////////////////////////////////////////////////////////////////////
