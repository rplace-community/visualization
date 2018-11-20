var timelineState = {
  time: null,
  windowSize: null
};

var svg = d3.select("#timeline svg"),
  margin = { top: 20, right: 20, bottom: 110, left: 40 },
  margin2 = { top: 430, right: 20, bottom: 30, left: 40 },
  width = +svg.attr("width") - margin.left - margin.right,
  height2 = +svg.attr("height") - margin2.top - margin2.bottom;

var x = d3.scaleTime().range([0, width]),
  y = d3.scaleLinear().range([height2, 0]);

var xAxis = d3.axisBottom(x).tickFormat(d3.timeFormat("%a %H:%M:%S")),
  yAxis = d3.axisLeft(y);

var brush = d3
  .brushX()
  .extent([[0, 0], [width, height2]])
  .on("brush end", brushed);

var area = d3
  .area()
  .curve(d3.curveMonotoneX)
  .x(function(d) {
    return x(d.timestamp);
  })
  .y0(height2)
  .y1(function(d) {
    return y(d.counts);
  });

var context = svg
  .append("g")
  .attr("class", "context")
  .attr("transform", "translate(" + margin2.left + "," + margin2.top + ")");

d3.json("assets/json/levelmaps/global.json").then(function(data) {
  const entries = Object.entries(data["null"]);
  const now = new Date(); // TODO put the real date of r/place event
  data = entries.map(entry => {
    entry[1].timestamp = new Date(now.getTime() + entry[0] * 1000); // (entry[0] / 60) * 60000
    return entry[1];
  });

  x.domain(
    d3.extent(data, function(d) {
      return d.timestamp;
    })
  );
  y.domain([
    0,
    d3.max(data, function(d) {
      return d.counts;
    })
  ]);

  context
    .append("path")
    .data([data])
    .attr("class", "area")
    .attr("d", area);

  context
    .append("g")
    .attr("class", "axis axis--x")
    .attr("transform", "translate(0," + height2 + ")")
    .call(xAxis);

  context
    .append("g")
    .attr("class", "brush")
    .call(brush)
    .call(brush.move, [now, new Date(now.getTime() + 15 * 60000)].map(x));
});

function timelineInit() {}

function brushed() {
  //var s = d3.event.selection || x.range();
  //x.domain(s.map(x.invert, x));
  timelineState.time = 7;
}
