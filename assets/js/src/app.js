const MAX_DISP_COMMUNITIES = 6;

var appState = {
  loaded: false,
  showExtLinks: true,
  globalCommunity: {
    levelmaps: {
      index: {},
      blobs: [],
      isLoaded: false
    }
  },
  time: startDate,
  window: windowStep,
  communities: communitiesState,
  displayedCommunities_: [],
  currentLevelmaps: [],
  smoothing: 1,
  ema: true,
  ismean: false,
  drawSpikes: false,
  sidebarHidden: true,
  autoRotate: false,
  freeColors: new Set(
    [...Array(MAX_DISP_COMMUNITIES).keys()].map(
      d3.scaleOrdinal(d3.schemeCategory10)
    )
  )
};

/******* Vue component *******/
var vm = new Vue({
  el: "#app",
  data: appState,
  methods: {
    filterCommunities: function() {
      this.communities.communities.forEach(c => (c.isVisible = false));
      const comm = communitiesSearch(this.communities.search);
      comm.forEach(c => {
        c.isVisible = true;
      });
    },
    dragStart: function(event) {
      const community = this.communities.communities[event.oldIndex];
       const mode = this.ismean ? "mean" : "max";
      if (!community.levelmaps.isLoaded) {
        fetchLevelmaps(community.id, mode).then(([index, levelmaps]) => {
          community.levelmaps.index = index;
          community.levelmaps.blobs = levelmaps;
          community.levelmaps.isLoaded = true;
          this.$emit("update:community");
        });
      }
    },
    showCommunity: function(event) {
      const community = event.item._underlying_vm_;
      if (this.displayedCommunities_.length <= MAX_DISP_COMMUNITIES) {
        const c = this.freeColors.values().next().value;
        community.color = c;
        this.freeColors.delete(c);
      } else {
        this.communities.communities.splice(event.oldIndex, 0, community);
        this.displayedCommunities_.splice(event.newIndex, 1);
      }
    },
    hideCommunity: function(evt) {
      this.freeColors.add(evt.item._underlying_vm_.color);
      evt.item._underlying_vm_.color = null;
    },
    timeSeek: function(time) {
      this.time = time;
      seekTime(time.getTime() - startTs);
    },
    windowUpdated: function(window) {
      this.window = window;
    },
    centerMap: function(event) {
      mapResetPosition();
    },

    toggleSidebar: function(event) {
      this.sidebarHidden = !this.sidebarHidden;
    }
  },
  /******** computed properties ********/
  computed: {
    displayedCommunities: function() {
      let res = this.displayedCommunities_.filter(c => c.levelmaps.isLoaded);
      if (res.length == 0) {
        res = [this.globalCommunity];
      }
      return res;
    },
    recomputeLevelmap: function() {
      this.displayedCommunities;
      this.window;
      this.ema;
      return performance.now();
    }
  },
  /******** watchers ********/
  watch: {
    drawSpikes: function() {
      mapSetDrawingMethod(this.drawSpikes);
    },

    autoRotate: function() {
      mapSetAutorotate(this.autoRotate);
    },

    recomputeLevelmap: function(unused) {
      let arr = this.displayedCommunities;
      if (!arr || arr.length < 1) {
        const global = this.globalCommunity.levelmaps.blobs;
        if (global && global.length > 0) {
          arr = [this.globalCommunity.levelmaps.blobs];
        }
      } else {
        arr = arr.map(c => c.levelmaps.blobs);
      }
      if (arr && arr.length > 0) {
        const window = Math.floor(this.window / windowStep);
        cmdWorker
          .send("mergeLevelmaps", {
            images: arr,
            range: window,
            ema: this.ema
          })
          .then(result => {
            this.currentLevelmaps = result;
            cmdWorker
              .send("blurImages", {
                images: result,
                radius: this.smoothing
              })
              .then(result => mapSetLevelmaps(result));
          });
      }
    },

    smoothing: function(v) {
      cmdWorker
        .send("blurImages", { images: this.currentLevelmaps, radius: v })
        .then(result => mapSetLevelmaps(result));
    }
  },
  /******** lifecycle events ********/
  created: function() {
    //console.log(endTs - startTs + 2 * windowStep);
    let loaded_backs = 0;
    const mode = this.ismean ? "mean" : "max";

    Promise.all([
      communitiesInit(mode),
      // enable global levelmaps when starting viz
      fetchLevelmaps("global", mode).then(([index, levelmaps]) => {
        let globalCommunity = {};
        globalCommunity.idx = -1;
        globalCommunity.name = "global";
        globalCommunity.levelmaps = {
          blobs: levelmaps,
          index: index,
          isLoaded: true
        };
        appState.globalCommunity = globalCommunity;

        appState.currentLevelmaps = globalCommunity.levelmaps.blobs;
        cmdWorker
          .send("blurImages", {
            images: appState.currentLevelmaps,
            radius: appState.smoothing
          })
          .then(result => {
            mapSetLevelmaps(result);
          });
      }),
      mapPreload(() => {
        loaded_backs++;
        let loadingBar = document.getElementsByClassName("w3-orange")[0];
        loadingBar.style.width = `${(50 * loaded_backs) / (TOT_IMAGES + 1)}%`;
      })
    ]).then(() => {
      console.log("Visualization loaded!");
      this.loaded = true;
    });
  },
  ready: function() {}
});
