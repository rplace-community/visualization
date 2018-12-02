let now = new Date();

Vue.component("timeline-component", {
  template: `<div id="timeline-container"><svg id="timeline"></svg></div>`,
  props: ["communities", "time", "window"],
  mounted: function() {
    this.drawSVG();
  },
  computed: {
    paths: function() {
      const res = this.communities
        .map(function(c) {
          let r = {};
          if (c.levelmaps.isLoaded) {
            r.data = c.levelmaps.index.map(d => ({
              timestamp: new Date(now.getTime() + d.ts * 1000),
              counts: d.counts
            }));
            r.color = c.color;
          } else {
            r = [];
          }
          return r;
        })
        .reverse();

      for (const j of res[0].data.keys()) {
        let counts0 = 0;
        res.forEach((c, i) => {
          c.data[j].counts = [counts0, counts0 + c.data[j].counts];
          counts0 = c.data[j].counts[1];
        });
      }
      return res;
    }
  },
  watch: {
    paths: function(data) {
      this.drawSVG();
    }
  },
  methods: {
    drawSVG: function() {
      const vm = this;

      const container = d3.select("#timeline-container");
      console.log("re-drawing");
      container.selectAll("*").remove();

      const margin = { top: 10, right: 10, bottom: 10, left: 10 },
        width = Math.max(0, 1000) - margin.left - margin.right,
        height = 100;

      const svg = container
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom);

      // const blur = container
      //   .append("div")
      //   .attr("id", "timeline-blur")
      //   .attr("width", width + margin.left + margin.right)
      //   .attr("height", height + margin.top + margin.bottom)
      //   .attr("class", "blur");

      const x = d3.scaleTime().range([margin.left, width - margin.right]),
        y = d3.scaleLinear().range([height - margin.top, margin.bottom]);

      const xAxis = d3.axisBottom(x).tickFormat(d3.timeFormat("%H:%M")),
        yAxis = d3.axisLeft(y);

      const brush = d3
        .brushX()
        .extent([[0, 0], [width, height]])
        .on("brush end", vm.brushed);

      const area = d3
        .area()
        .curve(d3.curveMonotoneX)
        .x(function(d) {
          // const v = x(d.timestamp);
          // console.log(`x=${v} (${d.timestamp})`);
          return x(d.timestamp);
        })
        .y0(d => y(d.counts[0]))
        .y1(d => y(d.counts[1]));

      const context = svg
        .append("g")
        .attr("class", "context")
        .attr("transform", "translate(" + margin.left + "," + 0 + ")");

      const xdom = d3.extent(vm.paths[0].data, d => d.timestamp);
      const ydom = [
        0,
        d3.max(vm.paths[vm.paths.length - 1].data, d => d.counts[1])
      ];
      console.log(`xdom=${xdom}, ydom=${ydom}`);
      x.domain(xdom);
      y.domain(ydom);

      vm.paths.forEach(c => {
        const ar = area(c.data);
        context
          .append("path")
          .datum(c.data)
          .attr("class", "area")
          .attr("d", ar)
          .style("fill", function(d) {
            return c.color;
          });
      });

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
    },
    brushed: function() {
      console.log("brushed!");
    }
  }
});
