Vue.component("timeline-component", {
  template: `<div id="timeline-container"></div>`,
  mounted: function() {
    const div = this.$el;

    const margin = {
        top: 10,
        right: 10,
        bottom: 10,
        left: 10
      },
      width = div.clientWidth * 0.95,
      height = 50;

    const blur = d3
      .select("#timeline-container")
      .append("div")
      .attr("id", "timeline-blur")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .attr("class", "blur");

    const svg = d3
      .select("#timeline-container")
      .append("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom);

    const x = d3.scaleTime().range([0, width]),
      y = d3.scaleLinear().range([height, 0]);

    const xAxis = d3.axisBottom(x).tickFormat(d3.timeFormat("%a %H:%M:%S")),
      yAxis = d3.axisLeft(y);

    const brush = d3
      .brushX()
      .extent([[0, 0], [width, height]])
      .on("brush end", brushed);

    const area = d3
      .area()
      .curve(d3.curveMonotoneX)
      .x(function(d) {
        return x(d.timestamp);
      })
      .y0(height)
      .y1(function(d) {
        return y(d.counts);
      });

    const context = svg
      .append("g")
      .attr("class", "context")
      .attr("id", "timeline")
      .attr("style", "display: none")
      .attr("transform", "translate(" + margin.left + "," + 0 + ")");

    d3.json("assets/json/levelmaps/max/global.json").then(function(data) {
      const now = new Date(); // TODO put the real starting date of r/place event
      data = data.map(entry => {
        entry.timestamp = new Date(now.getTime() + entry.ts * 1000); // (entry[0] / 60) * 60000
        return entry;
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
        .attr("transform", "translate(0," + height + ")")
        .call(xAxis);

      context
        .append("g")
        .attr("class", "brush")
        .call(brush)
        .call(brush.move, [now, new Date(now.getTime() + 15 * 60000)].map(x));
    });
    function brushed() {
      //const s = d3.event.selection || x.range();
      //x.domain(s.map(x.invert, x));
      console.log('brushed')
    }
  }
});
