const MAX_DISP_COMMUNITIES = 10;
const colors = [...Array(MAX_DISP_COMMUNITIES).keys()].map(
  d3.scaleOrdinal(d3.schemeCategory10)
);

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
  smoothing: 0.75,
  ema: true,
  ismean: false,
  drawSpikes: false,
  sidebarHidden: true,
  autoRotate: false,
  isDragging: false,
  isSettingsShown: false,
  editsCountMax: 1
};

/******* Vue component *******/
var vm = new Vue({
  el: "#app",
  data: appState,
  methods: {
    filterCommunities: function() {
      this.communities.communities.forEach(c => (c.isVisible = false));
      const comm = communitiesSearch(this.communities.search);
      let max = 1;
      comm.forEach(c => {
        c.isVisible = true;
        max = Math.max(max, c.counts_max);
      });
      this.editsCountMax = max;
    },
    dragStart: function(event) {
      this.isDragging = true;
      const community = event.item._underlying_vm_;
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
    dragEnd: function() {
      this.isDragging = false;
    },
    showCommunity: function(event) {
      const community = event.item._underlying_vm_;
      if (this.displayedCommunities_.length <= MAX_DISP_COMMUNITIES) {
        const usedColors = new Set(
          this.displayedCommunities_.map(c => c.color)
        );
        const availableColors = colors.filter(c => !usedColors.has(c));
        community.color = availableColors.values().next().value;
        community.withTrashBtn = true;
      } else {
        // cancel move
        this.communities.communities.splice(event.oldIndex, 0, community);
        this.displayedCommunities_.splice(event.newIndex, 1);
      }
    },
    unshowCommunity: function(evt) {
      this.hideCommunity(evt.item._underlying_vm_);
    },
    hideCommunity: function(community) {
      community.color = null;
      community.withTrashBtn = false;
      const i = this.displayedCommunities_.indexOf(community);
      if (i != -1) {
        this.displayedCommunities_.splice(i, 1);
        this.communities.communities.splice(0, 0, community);
      }
    },
    timeSeek: function(time) {
      this.time = time;
    },
    windowUpdated: function(window) {
      this.window = window;
    },
    centerMap: function(event) {
      mapResetPosition();
    },

    pauseMap: function(pause) {
      mapTemporaryPause(pause);
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
        const window = Math.max(1, Math.floor(this.window / windowStep));
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
      communitiesInit().then(editsCountMax => {
        this.editsCountMax = editsCountMax;
      }),
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
        return cmdWorker
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

function appSetTime(t) {
  vm.time = t;
}
