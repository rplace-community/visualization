/*****************************************************************************
 * VueJs component used to display the timeline of the edits of the diplayed communities
 * It use the D3.js library for drawing a SVG stacked area chart.
 *****************************************************************************/

const startTs = 1490979533000;
const endTs = 1491238733000;
const startDate = new Date(startTs);
const endDate = new Date(endTs);

// x axis time ticks, we defined them statically to add the ticks at the begining and end of the axis
const datesTicks = [
  startDate,
  new Date(2017, 3, 1, 0, 0, 0, 0),
  new Date(2017, 3, 1, 12, 0, 0, 0),
  new Date(2017, 3, 2, 0, 0, 0, 0),
  new Date(2017, 3, 2, 12, 0, 0, 0),
  new Date(2017, 3, 3, 0, 0, 0, 0),
  new Date(2017, 3, 3, 12, 0, 0, 0),
  endDate
];
const formatTime = d3.timeFormat("%H:%M");
const formatDate = d3.timeFormat("%e %b");

const ticksInterval = 40.0;
const windowStep = 30 * 60 * 1000;
const addedAfterEnd = 0;
const defaultWindow = 3 * windowStep;

const marginLeftCorr = 20;

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
    <div id="timeline-container">
      <div class="timeline blur"></div>
      <div id="time-controls">
        <button class="btn btn-light" id="play" @click="togglePlayPause">
          <i class="fas" :class="{ 'fa-play': !isplaying, 'fa-pause': isplaying }"></i>
        </button>
        <button class="btn btn-light" id="speed" @click="speedUp()" data-toggle="tooltip" title="Change the visualization speed">{{this.speed}}x</button>
      </div>
    </div>`,

  props: [
    "communities", // array of currently displayed communities
    "time", // current time (used to position the brush)
    "fullWidth", // if the sidebar is currently closed, this prop is true
    "isplaying", // equals true if the animation is playing
    "speed" // current speed
  ],
  // internal state of the component
  data: function() {
    return {
      window: defaultWindow,
      //isplaying: false,
      //speed: defaultSpeed,
      speeding: 3
    };
  },
  // this callback is called by VueJs when the DOM tree is created
  mounted: function() {
    this.initTimeline();
  },
  computed: {
    // here we recompute the bounds of the stacked areas that are used to draw the chart
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
    // reactively called when communities are added/removed
    paths: function() {
      this.drawAreas();
    },
    // when time change, redraw the brush
    time: function() {
      this.drawBrush();
      if (!this.isplaying) {
        this.$emit("update:time-seek", this.time);
        mapSeekTime(this.time);
      }
    },
    // when the brush is resized, emit a vuejs event to main vuejs instance
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

      let winWidth = window.innerWidth;
      if (this.fullWidth) {
        winWidth = winWidth - 150;
      } else {
        winWidth = winWidth - Math.max(200, winWidth * 0.35);
      }

      const container = d3.select("#timeline-container");

      const margin = {
          top: 10,
          right: 10,
          bottom: 10,
          left: 10 + marginLeftCorr
        },
        width = winWidth - margin.left - margin.right,
        height = 120;

      const svg = container
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom);

      d3.selectAll(".timeline.blur")
        .style("width", width + margin.left + margin.right + 100 + "px")
        .style("height", height + margin.top + margin.bottom + "px");

      const x = d3.scaleTime().range([margin.left, width - margin.right]);

      const y = d3.scaleLinear().range([height - margin.top, margin.bottom]);
      d3ctx.x = x;
      d3ctx.y = y;

      x.domain([startDate, new Date(endTs + addedAfterEnd)]);
      y.domain([0, 200000]);

      const xAxis = d3
        .axisBottom(x)
        .tickValues(datesTicks)
        .tickFormat(d => (d.getHours() == 0 ? formatDate(d) : formatTime(d)));

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
        .attr("width", width - margin.left - margin.right + 1)
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
        .on("mouseover touchstart", function() {
          if (vm.isplaying) {
            vm.togglePlayPause();
            d3ctx.wasPlaying = true;
          }
        })
        .on("mouseout", function() {
          if (d3ctx.wasPlaying && !vm.isplaying) {
            vm.togglePlayPause();
          }
        })
        .call(brush)
        .call(
          brush.move,
          [new Date(vm.time - vm.window), vm.time].map(d3ctx.x)
        );

      d3.selectAll(".brush .handle--e").remove();
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
    // the following two methods are somewhat complex due to handling
    // the different play/pause, seekTime, brush window states changes
    brushing: function(x) {
      const vm = this;
      return function() {
        let t0, t1;
        if (!d3.event.sourceEvent) return;

        [t0, t1] = d3.event.selection.map(x.invert);
        const newWindow = t1 - t0;
        if (newWindow === d3ctx.oldWindow && !vm.isplaying) {
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
            t1 = x.invert(d3.event.sourceEvent.layerX - marginLeftCorr);
            t0 = new Date(t1.getTime() - defaultWindow);
            d3.select(this).call(d3.event.target.move, [t0, t1].map(x));
            if (t1.getTime() !== vm.time.getTime() && !vm.isplaying) {
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

        if (d3ctx.wasPlaying && !vm.isplaying) {
          vm.togglePlayPause();
        }
      };
    },
    // play/pause the time animation
    togglePlayPause: function() {
      const play = !this.isplaying;
      this.$emit("update:isplaying", play);
      d3ctx.wasPlaying = play;
    },
    // speed FSM
    speedUp: function() {
      let s = this.speed;
      if (s <= 0.25) {
        s = 0.5;
      } else if (s <= 0.5) {
        s = 1.0;
      } else if (s <= 1.0) {
        s = 2.0;
      } else if (s <= 2.0) {
        s = 4.0;
      } else if (s <= 4.0) {
        s = 0.25;
      }
      this.$emit("update:speed", s);
    }
  }
});
