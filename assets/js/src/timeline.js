const startTs = 1490979533000;
const endTs = 1491238733000;
const startDate = new Date(startTs);
const endDate = new Date(endTs);

const ticksInterval = 40.0;
const defaultSpeed = 4380;
const windowStep = 30 * 60 * 1000;
const addedAfterEnd = 0; //2 * windowStep;

let d3ctx = {
  x: null,
  y: null,
  yAxis: null,
  brush: null,
  oldWindow: null,
  wasPlaying: false,
  area: null,
  timer: null
};

Vue.component("timeline-component", {
  template: `
    <div id="timeline-container" :style="{ 'width' : (fullWidth ? '100%' : '82%') }">
      <div class="timeline blur"></div>
      <div id="time-controls">
        <button id="speed" @click="speedUp()">
          1x
        </button>
        <button id="play" @click="togglePlayPause()">
          <i class="fas" :class="{ 'fa-play': !isPlaying, 'fa-pause': isPlaying }"></i>
        </button>
      </div>
    </div>`,

  props: ["communities", "time", "fullWidth"],
  data: function() {
    return {
      window: windowStep,
      isPlaying: false,
      speed: defaultSpeed,
      speeding: 3
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
    paths: function() {
      this.drawAreas();
    },
    time: function() {
      this.drawBrush();
      if (!this.isPlaying) {
        this.$emit("update:time-seek", this.time);
        mapSeekTime(this.time);
      }
    },
    window: function() {
      this.$emit("window-updated", this.window);
    },
    fullWidth: function() {
      this.resize();
    }
  },
  methods: {
    /********** timeline initialization **********/
    initTimeline: function() {
      const vm = this;
      const container = d3.select("#timeline-container");

      let winWidth = window.innerWidth;
      winWidth *= this.fullWidth ? 0.8 : 0.65;
      const margin = { top: 10, right: 10, bottom: 10, left: 30 },
        width = winWidth - margin.left - margin.right,
        height = 100;

      const svg = container
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom);

      d3.select(".timeline.blur")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom);

      const x = d3.scaleTime().range([margin.left, width - margin.right]);

      const y = d3.scaleLinear().range([height - margin.top, margin.bottom]);
      d3ctx.x = x;
      d3ctx.y = y;

      x.domain([startDate, new Date(endTs + addedAfterEnd)]);
      y.domain([0, 200000]);

      const xAxis = d3
        .axisBottom(x)
        .ticks(6)
        .tickFormat(d3.timeFormat("%e %b %H:%M"));

      const yAxis = d3.axisLeft(y).ticks(3);
      d3ctx.yAxis = yAxis;

      const brush = d3
        .brushX()
        .extent([[-width - margin.left, 0], [width - margin.right, height]])
        .on("end", vm.brushEnded(x))
        .on("brush", vm.brushing(x));
      d3ctx.brush = brush;

      const area = d3
        .area()
        .curve(d3.curveMonotoneX)
        .x(d => x(d.timestamp))
        .y0(d => y(d.counts[0]))
        .y1(d => y(d.counts[1]));
      d3ctx.area = area;

      const context = svg
        .append("g")
        .attr("class", "context")
        .attr("transform", "translate(" + margin.left + "," + 0 + ")");

      const clipPath = context
        .append("defs")
        .append("clipPath")
        .attr("id", "clip")
        .append("rect")
        .attr("width", width - margin.left - margin.right)
        .attr("transform", "translate(" + margin.left + "," + 0 + ")")
        .attr("height", height);

      context
        .append("g")
        .attr("class", "axis axis--x")
        .attr("transform", "translate(-1," + (height - margin.bottom) + ")")
        .call(xAxis);

      context
        .append("g")
        .attr("class", "axis axis--y")
        .attr("transform", "translate(" + (margin.left - 1) + "," + 0 + ")")
        .call(yAxis);

      vm.drawAreas();

      d3.select("#timeline-container")
        .selectAll(".brush")
        .remove();

      d3.select("g.context")
        .append("g")
        .attr("class", "brush")
        .attr("clip-path", "url(#clip)")
        .on("mousedown touchstart", function() {
          if (vm.isPlaying) {
            vm.togglePlayPause();
            d3ctx.wasPlaying = true;
          }
        })
        .call(brush)
        .call(
          brush.move,
          [new Date(vm.time - vm.window), vm.time].map(d3ctx.x)
        );

      d3.selectAll(".brush .handle--e").remove();

      this.togglePlayPause();

      d3.select(window).on("resize", vm.resize);
    },
    resize: function() {
      d3.select("svg").remove();
      this.initTimeline();
    },
    /********** draw areas **********/
    drawAreas: function() {
      const vm = this;
      const container = d3.select("#timeline-container");
      container.selectAll(".area").remove();

      const ydom = [
        0,
        d3.max(vm.paths[vm.paths.length - 1].data, d => d.counts[1])
      ];

      d3ctx.y.domain(ydom);

      var t = d3.transition().duration(500);

      d3.select(".axis--y")
        .transition(t)
        .call(d3ctx.yAxis);

      const context = d3.select("g.context");
      vm.paths.forEach(c => {
        const ar = d3ctx.area(c.data);
        context
          .insert("path", ".brush")
          .datum(c.data)
          .attr("class", "area")
          .attr("d", ar)
          .style("fill", function(d) {
            return c.color;
          });
      });
    },
    /********** update the brush **********/
    drawBrush: function() {
      const vm = this;
      d3.selectAll(".brush").call(
        d3ctx.brush.move,
        [new Date(vm.time - vm.window), vm.time].map(d3ctx.x)
      );
    },
    brushing: function(x) {
      const vm = this;
      return function() {
        let t0, t1;
        if (!d3.event.sourceEvent) return;

        [t0, t1] = d3.event.selection.map(x.invert);
        const newWindow = t1 - t0;
        if (newWindow === d3ctx.oldWindow && !vm.isPlaying) {
          vm.$emit("update:time-seek", t1);
          mapSeekTime(t1);
        }
      };
    },
    brushEnded: function(x) {
      const vm = this;
      return function() {
        let t0, t1;
        if (!d3.event.selection) {
          if (d3.event.sourceEvent) {
            t1 = x.invert(d3.event.sourceEvent.layerX);
            t0 = new Date(t1.getTime() - windowStep);
            d3.select(this).call(d3.event.target.move, [t0, t1].map(x));
            if (t1.getTime() !== vm.time.getTime() && !vm.isPlaying) {
              vm.$emit("update:time-seek", t1);
              mapSeekTime(t1);
            }
            const window = t1.getTime() - t0.getTime();
            if (window !== d3ctx.oldWindow) {
              vm.window = window;
            }
          }
        } else {
          [t0, t1] = d3.event.selection.map(x.invert);

          const window = t1.getTime() - t0.getTime();
          if (window !== d3ctx.oldWindow) {
            vm.window = window;
            d3ctx.oldWindow = window;
          }

          if (t1.getTime() !== vm.time.getTime()) {
            vm.$emit("update:time-seek", t1);
            mapSeekTime(t1);
          }
        }

        if (d3ctx.wasPlaying && !vm.isPlaying) {
          vm.togglePlayPause();
        }
      };
    },
    togglePlayPause: function() {
      this.isPlaying = !this.isPlaying;
      d3ctx.wasPlaying = this.isPlaying;
      mapPlay(this.isPlaying);
    },
    speedUp: function() {
      this.speeding = (this.speeding + 1) % 5;
      let x = undefined;
      switch (this.speeding) {
        case 1:
          x = 0.25;
          break;
        case 2:
          x = 0.5;
          break;
        case 3:
          x = 1;
          break;
        case 4:
          x = 2;
          break;
        default:
          x = 4;
      }
      mapSetSpeed(defaultSpeed * x);
      d3.select("#speed").text(`${x}x`);
    }
  }
});
