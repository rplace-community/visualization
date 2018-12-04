const startTs = 1490979533000;
const endTs = 1491238733000;
const startDate = new Date(startTs);
const endDate = new Date(endTs);

const windowStep = 30 * 60 * 1000;

Vue.component("timeline-component", {
  template: `
    <div id="timeline-container">
      <div id="time-controls">
        <button id="play" @click="togglePlayPause()">
          <i class="fas" :class="{ 'fa-play': !isPlaying, 'fa-pause': isPlaying }"></i>
        </button> 
      </div>
    </div>`,
  props: ["communities", "time", "window"],
  data: function() {
    return {
      isPlaying: true,
      timer: null,
      speed: 4320, // rplace seconds per true second
      brush: {
        brush: null,
        t0: startDate,
        t1: startDate,
        wasPlaying: false
      },
      x: null,
      y: null,
      area: null
    };
  },
  mounted: function() {
    this.initTimeline();
  },
  computed: {
    paths: function() {
      const res = this.communities
        .map(function(c) {
          let r = {};
          if (c.levelmaps.isLoaded) {
            r.data = c.levelmaps.index.map(d => ({
              timestamp: new Date(startTs + d.ts * 1000),
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
      this.drawAreas();
    },
    time: function() {
      this.brush.t1 = this.time;
      this.brush.t0 = new Date(this.time - (this.window[1] - this.window[0]));
      this.drawBrush();
    }
  },
  methods: {
    togglePlayPause: function() {
      const vm = this;
      const interval = 42.0;
      if (vm.timer) {
        clearInterval(vm.timer);
      }
      vm.isPlaying = !vm.isPlaying;
      if (vm.isPlaying) {
        vm.timer = setInterval(function() {
          if (!vm.time || !vm.speed) {
            console.error("this.time is undefined!!!");
            return;
          }
          const newTime = vm.time.getTime() + vm.speed * interval;
          if (newTime > endTs) {
            vm.$emit("update:time", startDate);
          } else {
            vm.$emit("update:time", new Date(newTime));
          }
        }, interval);
      }
    },
    initTimeline: function() {
      const vm = this;
      const container = d3.select("#timeline-container");

      const margin = { top: 10, right: 10, bottom: 10, left: 10 },
        width = Math.max(0, 800) - margin.left - margin.right,
        height = 100;

      const svg = container
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom);

      const x = d3.scaleTime().range([margin.left, width - margin.right]);
      const y = d3.scaleLinear().range([height - margin.top, margin.bottom]);
      this.x = x;
      this.y = y;

      const xAxis = d3.axisBottom(x).tickFormat(d3.timeFormat("%H:%M")),
        yAxis = d3.axisLeft(y);

      const brush = d3
        .brushX()
        //.extent([[now, x(new Date(now.getTime() + 30 * 60 * 1000))]])
        .on("end", vm.brushEnded(x))
        .on("brush", vm.brushing(x));
      this.brush.brush = brush;

      const area = d3
        .area()
        .curve(d3.curveMonotoneX)
        .x(function(d) {
          return x(d.timestamp);
        })
        .y0(d => y(d.counts[0]))
        .y1(d => y(d.counts[1]));
      this.area = area;

      const context = svg
        .append("g")
        .attr("class", "context")
        .attr("transform", "translate(" + margin.left + "," + 0 + ")");

      context
        .append("g")
        .attr("class", "axis axis--x")
        .attr("transform", "translate(0," + height + ")")
        .call(xAxis);

      this.drawAreas();
    },
    drawAreas: function() {
      const vm = this;

      const container = d3.select("#timeline-container");
      console.log("re-drawing");
      container.selectAll(".area").remove();

      const xdom = d3.extent(vm.paths[0].data, d => d.timestamp);
      const ydom = [
        0,
        d3.max(vm.paths[vm.paths.length - 1].data, d => d.counts[1])
      ];

      this.x.domain(xdom);
      this.y.domain(ydom);

      const context = d3.select("g.context");
      vm.paths.forEach(c => {
        const ar = this.area(c.data);
        context
          .append("path")
          .datum(c.data)
          .attr("class", "area")
          .attr("d", ar)
          .style("fill", function(d) {
            return c.color;
          });
      });
      vm.drawBrush();
    },
    drawBrush: function() {
      const vm = this;
      d3.select("#timeline-container")
        .selectAll(".brush")
        .remove();
      const brush = this.brush.brush;
      d3.select("g.context")
        .append("g")
        .attr("class", "brush")
        .on("mousedown", function() {
          console.log("brush mouse down");
          if (vm.isPlaying) {
            vm.brush.wasPlaying = true;
            vm.togglePlayPause();
          }
        })
        .on("mouseup", function() {
          console.log("brush mouse up");
          // if (vm.brush.wasPlaying && !vm.isPlaying) {
          //   vm.brush.wasPlaying = false;
          //   vm.togglePlayPause();
          // }
        })
        .call(brush)
        .call(brush.move, [this.brush.t0, this.brush.t1].map(this.x));

      d3.selectAll(".brush .handle--e").remove();
    },
    brushing: function(x) {
      const vm = this;
      return function() {
        // if (!vm.brush.wasPlaying && vm.isPlaying) {
        //   vm.brush.wasPlaying = true;
        //   vm.togglePlayPause();
        // }
        let t0, t1;
        if (!d3.event.sourceEvent) return;

        [t0, t1] = d3.event.selection.map(x.invert);
        if (t1.getTime() !== vm.brush.t1.getTime()) {
          vm.brush.t0 = t0;
          vm.brush.t1 = t1;
          vm.$emit("update:time", t1); // time seek
        }
      };
    },
    brushEnded: function(x) {
      const vm = this;
      let t0, t1;
      return function() {
        if (!d3.event.selection) {
          if (d3.event.sourceEvent) {
            t1 = x.invert(d3.event.sourceEvent.layerX);
            t0 = new Date(t1.getTime() - windowStep);
            d3.select(this)
              .transition()
              .call(d3.event.target.move, [t0, t1].map(x));

            if (t1.getTime() !== vm.brush.t1.getTime()) {
              vm.$emit("update:time", t1); // time seek
            }
            if (t1 - t0 !== vm.brush.t1 - vm.brush.t0) {
              vm.$emit("update:window", [t0, t1]);
            }
          }
        } else {
          [t0, t1] = d3.event.selection.map(x.invert);

          const diff = t1 - t0 !== vm.brush.t1 - vm.brush.t0;
          if (diff && (t1 - t0) % windowStep != 0) {
            t0 = new Date(t1 - Math.ceil((t1 - t0) / windowStep) * windowStep);
            d3.select(this)
              .transition()
              .call(d3.event.target.move, [t0, t1].map(x));

            vm.$emit("update:window", [t0, t1]);
          }
        }
        if (t0 && t1) {
          vm.brush.t0 = t0;
          vm.brush.t1 = t1;
        }

        if (vm.brush.wasPlaying == vm.isPlaying) {
          vm.togglePlayPause();
          vm.brush.wasPlaying = vm.isPlaying;
        }
      };
    }
  }
});
