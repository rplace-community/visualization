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
  communities: communitiesState,
  currentLevelmaps: [],
  smoothing: 1,
  window: 1,
  ema: true
};

/******* Vue component *******/
var vm = new Vue({
  el: "#app",
  data: appState,
  methods: {},
  /******** computed properties ********/
  computed: {
    filteredCommunities: function() {
      return communitiesSearch(this.communities.search);
    },
    displayedCommunities: function() {
      let res = this.communities.communities.filter(
        c => c.isShown && c.levelmaps.isLoaded
      );
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
    timelineTime: console.log("seek"),
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
        cmdWorker
          .send("mergeLevelmaps", {
            images: arr,
            range: this.window,
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
        let loadingBar = document.getElementsByClassName("w3-grey")[0];
        loadingBar.style.width = `${(50 * loaded_backs) / (tot_images + 1)}%`;
      })
    ]).then(() => {
      console.log("Visualization loaded!");
      this.loaded = true;
    });
  },
  ready: function() {}
});
