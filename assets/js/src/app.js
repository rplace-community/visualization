var appState = {
  loaded: false,
  showExtLinks: true,
  globalCommunity: {
    levelmaps: {
      blobs: [],
      isLoaded: false
    }
  },
  communities: communitiesState,
  selectedComm: [],
  smoothing: 50,

  loadGlobalLevelmaps: () => {
    fetch(`assets/json/levelmaps/max/global.json`)
      .then(response => {
        return response.json();
      })
      .then(index => {
        let blobs = Promise.all(
          index.map(element => {
            fetch(`assets/img/levelmaps/max/global/${element.idx}.png`).then(
              response => {
                return response.blob();
              }
            );
          })
        );
        blobs.then(bs => {
          let globalCommunity = {}; 
          globalCommunity.idx = -1;
          globalCommunity.name="global";
          globalCommunity.levelmaps = {};
          globalCommunity.levelmaps.blobs = bs;
          globalCommunity.levelmaps.isLoaded = true;
          appState.globalCommunity = globalCommunity;
        });
      });
  }
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
      let res = this.communities.communities.filter(function(c) {
        return c.isShown && c.levelmaps.isLoaded;
      });
      return res;
    }
  },
  watch: {
    timelineTime: console.log("seek"),
    displayedCommunities: function(arr) {
      console.log("Displayed communities changed", arr);
    },
    smoothing: function(v){
      mapSmooth(v/50);
    }
  },
  created: function() {
    // init3d()
    communitiesInit();
    appState.loadGlobalLevelmaps();

    console.log("Visualization loaded!");
    this.loaded = true;
  }
});
