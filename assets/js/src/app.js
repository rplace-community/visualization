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

var vm = new Vue({
  el: "#app",
  data: appState,
  methods: {},
  computed: {
    filteredCommunities: function() {
      return communitiesSearch(this.communities.search);
    },
    displayedCommunities: function() {
      let res = this.communities.communities.filter(
        c => c.isShown && c.levelmaps.isLoaded
      );
      return res;
    },
    recomputeLevelmap: function() {
      this.displayedCommunities;
      this.window;
      this.ema;
      return performance.now();
    }
  },
  watch: {
    timelineTime: console.log("seek"),
    recomputeLevelmap: function(unused) {
      let arr = this.displayedCommunities;
      if (!arr || arr.length < 1) {
        arr = [this.globalCommunity.levelmaps.blobs];
      } else {
        arr = arr.map(c => c.levelmaps.blobs);
      }
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
    },
    smoothing: function(v) {
      cmdWorker
        .send("blurImages", { images: this.currentLevelmaps, radius: v })
        .then(result => mapSetLevelmaps(result));
    }
  },
  created: function() {
    communitiesInit();

    // enable global levelmaps when starting viz
    fetchLevelmaps("global").then(([index, levelmaps]) => {
      let globalCommunity = {};
      globalCommunity.idx = -1;
      globalCommunity.index = index;
      globalCommunity.name = "global";
      globalCommunity.levelmaps = { blobs: levelmaps, isLoaded: true };
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
    });

    preload();

    console.log("Visualization loaded!");
    this.loaded = true;
  },
  ready: function() {}
});
