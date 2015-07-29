var svg;
var linesvg;
d3.json("elevation.geojson", function(json) {
        //Retrieve array of elevation info from json file
        var elevation_data = json.features[0].properties.elevation;
        //Retrieve array of points from json file
        var coordinates = json.features[0].geometry.coordinates;
        //Calculate distances between points
        var distances = [];
        for (var i = 0; i < coordinates.length - 1; i++) {
            var j = i + 1;
            var x1 = coordinates[i][0]; //lon
            var y1 = coordinates[i][1]; //lat
            var x2 = coordinates[j][0]; //lon
            var y2 = coordinates[j][1]; //lat
            var d = getDistanceFromLatLonInKm(y1, x1, y2, x2);
            //var d = Math.sqrt((x1 - x2) * (x1 - x2) + (y1 - y2) * (y1 - y2));
            distances.push(d);
        }

        //Calculate x y points to graph based on elevations and distances
        var data = [];
        var data_zero = [];
        var line_endpoints = [];
        var line_endpoints_zero = [];
        var curr_x = 0;
        var counter = 0;
        while (elevation_data.length > 0) {
            curr_y = elevation_data.shift();
            data.push([curr_x, curr_y, coordinates[counter][0], coordinates[counter][1]]);
            data_zero.push([curr_x, 0, coordinates[counter][0], coordinates[counter][1]]);
            counter++;
            curr_x = curr_x + distances.shift();
        }
        //Also calculate endpoints for lines connecting the points

        for (var i = 0; i < data.length - 1; i++) {
            var j = i + 1;
            line_endpoints.push([data[i][0], data[i][1], data[j][0], data[j][1]]);
            line_endpoints_zero.push([data[i][0], 0, data[j][0], 0]);
        }

        //Data to plot is now stored in `data`; begin plotting
        var w = document.getElementById("elevation-graph").offsetWidth;
        var h = document.getElementById("elevation-graph").offsetHeight;
        var padding = 50;
        var point_radius = 6.5;
        var lineFunction = d3.svg.line()
            .x(function(d) {
                return xScale(d[0]);
            })
            .y(function(d) {
                return yScale(d[1]);
            })
            .interpolate("cardinal");

        var xScale = d3.scale.linear()
            .domain([0, d3.max(data, function(d) {
                return d[0];
            })])
            .range([padding, w - padding * 2]);
        var yScale = d3.scale.linear()
            .domain([0, d3.max(data, function(d) {
                return d[1];
            })])
            .range([h - padding, padding]);
        var xAxis = d3.svg.axis()
            .scale(xScale)
            .orient("bottom")
            .ticks(5);
        var yAxis = d3.svg.axis()
            .scale(yScale)
            .orient("left")
            .ticks(2);
        svg = d3.select("#elevation-graph")
            .append("svg")
            .attr("width", w)
            .attr("height", h);


        svg.selectAll("circle")
            .data(data_zero)
            .enter()
            .append("circle")
            .attr("clip-path", "url(#chart-area)")
            .attr("id", function(d, i) {
                return "circle" + i;
            })
            .attr("cx", function(d) {
                return xScale(d[0]);
            })
            .attr("cy", function(d) {
                return yScale(d[1]);
            })
            .attr("r", point_radius)
            .attr("class", "point")
            .on("mouseover", function(d, i) {
                //When a point on the graph is clicked, plot the correspoinding point on the map
                var lon = coordinates[i][0];
                var lat = coordinates[i][1];
                console.log(lon, lat);
                var newPoint = [{
                    "type": "Point",
                    "coordinates": [lon, lat]
                }];
                geoJsonLayer.addData(newPoint);
                var latlng = L.latLng(lat, lon);
                var layerPoint = map.latLngToContainerPoint(latlng);
                //Plot a line to 0, 0
                var linedata = [
                    [layerPoint.x, layerPoint.y],
                    [0, 0]
                ];
                linesvg
                    .append("line")
                    .attr("x1", function(d) {
                        return linedata[0][0];
                    })
                    .attr("y1", function(d) {
                        return linedata[0][1];
                    })
                    .attr("x2", function(d) {
                        return linedata[1][0];
                    })
                    .attr("y2", function(d) {
                        return linedata[1][1];
                    })
                    .attr("style", "stroke:rgb(255,0,0);stroke-width:2");
                console.log(layerPoint);
            })
            .on("mouseout", function(d, i) {
                //When a point on the graph is clicked, plot the correspoinding point on the map

                geoJsonLayer.clearLayers();
                geoJsonLayer = L.geoJson(freeBus, {
                    onEachFeature: function(feature, layer) {
                        layer.on('mouseover', function(e) {
                            //If user hovers over the line on the map
                            //Get coordinates associated with hover pointer
                            var mouselat = e.latlng.lat;
                            var mouselng = e.latlng.lng;
                            //Get the point on the graph closest to the mouse location

                            highlightPoint(mouselat, mouselng);


                        });
                        layer.on('mouseout', function(e) {
                            unhighlightPoint();

                        });
                    }

                }).addTo(map);
            });
        //X axis label
        svg.append("text")
            .attr("class", "xlabel")
            .attr("text-anchor", "end")
            .attr("x", w / 2 + 30)
            .attr("y", h - 30)
            .text("Distance (km)");
        svg.append("text")
            .attr("class", "ylabel")
            .attr("text-anchor", "middle")
            .attr("x", -h / 2)
            .attr("y", padding - 30)
            .attr("transform", "rotate(-90)")
            .text("Elevation (m)");
        svg.append("g")
            .attr("class", "axis")
            .attr("transform", "translate(0," + (h - padding - 20) + ")")
            .call(xAxis);
        svg.append("g")
            .attr("class", "axis")
            .attr("transform", "translate(" + padding + ",0)")
            .call(yAxis);
        lineGraph = svg.append("path")
            .attr("d", lineFunction(data))
            .attr("stroke", "blue")
            .attr("stroke-width", 2)
            .attr("fill", "none");
        var totalLength = lineGraph.node().getTotalLength();
        lineGraph
            .attr("stroke-dasharray", totalLength + " " + totalLength)
            .attr("stroke-dashoffset", totalLength)
            .transition()
            .duration(2000)
            .ease("linear")
            .attr("stroke-dashoffset", 0);
        //Define clipping path
        svg.append("clipPath") //Make a new clipPath
            .attr("id", "chart-area") //Assign an ID
            .append("rect") //Within the clipPath, create a new rect
            .attr("x", padding - 10) //Set rect's position and size…
            .attr("y", padding - 20)
            .attr("width", w - padding * 2)
            .attr("height", h - padding * 2);
        svg.selectAll("circle")
            .data(data)
            .transition()
            .duration(1000)
            .delay(function(d, i) {
                return i * 50;
            })
            .attr("cy", function(d) {
                return yScale(d[1]);
            })
            /*
            lineGraph.attr("d", lineFunction(data))
            	.transition()
            	.duration(500)
            	.delay(5000);
            */
        linesvg = d3.select("body")
            .append("svg")
            .attr("width", window.innerWidth)
            .attr("height", window.innerHeight);


    })
    //http://stackoverflow.com/questions/18883601/function-to-calculate-distance-between-two-coordinates-shows-wrong
function getDistanceFromLatLonInKm(lat1, lon1, lat2, lon2) {
    var R = 6371; // Radius of the earth in km
    var dLat = deg2rad(lat2 - lat1); // deg2rad below
    var dLon = deg2rad(lon2 - lon1);
    var a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    var d = R * c; // Distance in km
    return d;
}
var highlightid = -1;

function unhighlightPoint() {
    svg.selectAll("#circle" + highlightid)
        .attr("r", 6.5);
}

function highlightPoint(mouselat, mouselng) {

    var minDist = 1000;
    var minDistLat = 0;
    var minDistLng = 0;
    var minDistId = -1;
    svg.selectAll("circle").each(function(dval, i) {

        //Find the point whose geographic location corresponds most closely to the
        //geographic location the mouse is hovering over
        var dist = Math.sqrt((mouselat - dval[3]) * (mouselat - dval[3]) + (mouselng - dval[2]) * (mouselng - dval[2]));
        if (dist < minDist) {
            minDist = dist;
            minDistLat = dval[3];
            minDistLng = dval[2];
            highlightid = i;
            minDistId = "circle" + i;
        }


    });
    //console.log(mouselat, mouselng);
    //console.log(minDist);
    //console.log(minDistLat);
    //console.log(minDistLng);
    //console.log(minDistId);
    svg.selectAll("#" + minDistId)
        .attr("r", 20);




}

function deg2rad(deg) {
    return deg * (Math.PI / 180)
}