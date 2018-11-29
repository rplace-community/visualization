const now = new Date();

Vue.component("timeline-component", {
  template: `<div id="timeline-container"></div>`,
  props: ["communities", "time", "window"],
  data() {
    return {
      scaled: {
        x: null,
        y: null
      }
    };
  },
  computed: {
    paths() {
      const res = this.communities.map(c => {
        if (c.levelmaps.isLoaded) {
          return c.levelmaps.index.map(d => {
            d.timestamp = new Date(now.getTime() + d.ts * 1000);
            return d;
          });
        } else {
          return [];
        }
      });
      return res;
    }
  },
  methods: {
    initChart() {
      const div = this.$el;

      const margin = {
          top: 10,
          right: 10,
          bottom: 10,
          left: 10
        },
        width = div.clientWidth * 0.95,
        height = 100;

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

      this.scaled.x = d3.scaleTime().range([0, width]);
      this.scaled.y = d3.scaleLinear().range([0, height]);

      const xAxis = d3
        .axisBottom(this.scaled.x)
        .tickFormat(d3.timeFormat("%a %H:%M:%S"));
      const yAxis = d3.axisLeft(this.scaled.y);

      const brush = d3
        .brushX()
        .extent([[0, 0], [width, height]])
        .on("brush end", this.brushed);

      const area = d3
        .area()
        .curve(d3.curveMonotoneX)
        .x(d => this.scaled.x(d.timestamp))
        .y0(0) //(d => this.scaled.y(d.counts))
        .y1(d => this.scaled.y(d.counts));

      const context = svg
        .append("g")
        .attr("class", "context")
        .attr("id", "timeline")
        .attr("transform", "translate(" + margin.left + "," + 0 + ")");

      context
        .append("g")
        .attr("class", "axis axis--x")
        .attr("transform", "translate(0," + height + ")")
        .call(xAxis);

      const paths = context
        .append("path")
        .data(this.paths)
        .attr("class", "area")
        .attr("d", area);

      paths
        .enter()
        .append("path")
        .attr("class", "area")
        .attr("d", area);

      paths.exit().remove();
    },
    brushed() {
      //const s = d3.event.selection || x.range();
      //x.domain(s.map(x.invert, x));
      console.log("brushed");
    }
  },
  watch: {
    time: function(time) {
      context
        .append("g")
        .attr("class", "brush")
        .call(brush)
        .call(
          brush.move,
          [time, new Date(time.getTime() + this.window)].map(x)
        );
    },
    paths: function(newPaths) {
      this.scaled.x.domain(d3.extent(newPaths[0], c => c.timestamp));
      this.scaled.y.domain([0, d3.max(newPaths, c => d3.max(d => d.counts))]);
    }
  },
  mounted() {
    this.initChart();
  }
});
