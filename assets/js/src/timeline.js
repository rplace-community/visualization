const div = document.getElementById("timeline-container");

const margin = {
    top: 10,
    right: 10,
    bottom: 10,
    left: 10
  },
  width = div.clientWidth * 0.95,
  height = 25;

const svg = d3.select("#timeline-container").append("svg")
  .attr("width", width + margin.left + margin.right)
  .attr("height", (height + margin.top + margin.bottom));

var x = d3.scaleTime().range([0, width]),
    y = d3.scaleLinear().range([height, 0]);

var xAxis = d3.axisBottom(x).tickFormat(d3.timeFormat("%a %H:%M:%S")),
    yAxis = d3.axisLeft(y);
    
var brush = d3.brushX()
    .extent([[0, 0], [width, height]])
    .on("brush end", brushed);

var area = d3.area()
    .curve(d3.curveMonotoneX)
    .x(function(d) { return x(d.timestamp); })
    .y0(height)
    .y1(function(d) { return y(d.counts); });

var context = svg.append("g")
    .attr("class", "context")
    .attr("id", "timeline")
    .attr("style", "display: none")
    .attr("transform", "translate(" + margin.left + "," + 0 + ")");

d3.json("assets/json/levelmaps/global.json").then(function(data) { 
  const entries = Object.entries(data['null']);
  
  const now = new Date(); // TODO put the real starting date of r/place event
  data = entries.map(entry => {
    entry[1].timestamp = new Date(now.getTime() + entry[0] * 1000) // (entry[0] / 60) * 60000
    return entry[1];
  });
  
  x.domain(d3.extent(data, function(d) { return d.timestamp; }));
  y.domain([0, d3.max(data, function(d) { return d.counts; })]);

  context.append("path")
      .data([data])
      .attr("class", "area")
      .attr("d", area);

  context.append("g")
      .attr("class", "axis axis--x")
      .attr("transform", "translate(0," + height + ")")
      .call(xAxis);

  context.append("g")
      .attr("class", "brush")
      .call(brush)
      .call(brush.move, [now, new Date(now.getTime() + 15 * 60000)].map(x));
});

function brushed() {

}