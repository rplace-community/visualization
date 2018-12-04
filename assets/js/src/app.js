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
  window: [new Date(startTs - windowStep), startDate],
  communities: communitiesState,
  displayedCommunities_: [],
  currentLevelmaps: [],
  smoothing: 1,
  ema: true,
  drawSpikes: false,
  sidebarHidden: true
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
      if (!community.levelmaps.isLoaded) {
        fetchLevelmaps(community.id).then(([index, levelmaps]) => {
          community.levelmaps.index = index;
          community.levelmaps.blobs = levelmaps;
          community.levelmaps.isLoaded = true;
          this.$emit("update:community");
        });
      }
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

    sidebarHidden: function() {
      if(this.sidebarHidden) {

      }
    },

    time: function() {
      //console.log("Time seek: " + (this.time.getTime() - startTs));
      seekTime(this.time.getTime() - startTs);
    },

    drawSpikes: function() {
      mapSetDrawingMethod(this.drawSpikes);
    },
    // window: function() {
    //   console.log("Brushed window: " + this.window);
    // },
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
        const window = Math.floor(
          (this.window[1] - this.window[0]) / windowStep
        );
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
    Promise.all([
      communitiesInit(),
      // enable global levelmaps when starting viz
      fetchLevelmaps("global").then(([index, levelmaps]) => {
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
