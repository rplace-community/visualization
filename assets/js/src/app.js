const MAX_DISP_COMMUNITIES = 10;
const colors = [...Array(MAX_DISP_COMMUNITIES).keys()].map(
  d3.scaleOrdinal(d3.schemeCategory10)
);

const MAX_EDIT_THRESHOLD = 200;

const MAX_HEIGHT_MAP = 500;

let TutorialStates = {
  Loading: 0,
  Start: 1,
  MapInteractions: 2,
  ShowTimeline: 3,
  ChooseCommunities: 4,
  CaseStudy: 5,
  GoodLuck: 6,
  End: 7
};
Object.freeze(TutorialStates);

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
  isDragging: false,
  tutorialState: TutorialStates.Loading,
  isSettingsShown: false,
  editsCountMax: 0,
  isSortByEditsCounts: false,

  disableTimeLine: false,
  disableMapInteractions: false,
  disableMenu: false,

  speed: 1,
  isplaying: false
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
    },

    prevTutoStep: function() {
      this.tutorialState = Math.max(
        this.tutorialState - 1,
        TutorialStates.Start
      );
    },

    nextTutoStep: function() {
      this.tutorialState = Math.min(this.tutorialState + 1, TutorialStates.End);
    },

    beginTuto: function() {
      this.tutorialState = TutorialStates.Start;
    },

    endTuto: function() {
      this.tutorialState = TutorialStates.End;
    },

    disableEverything: function() {
      this.disableTimeLine = true;
      this.disableMapInteractions = true;
      this.disableMenu = true;
      this.autoRotate = false;
      this.displayedCommunities_ = [];
    },

    enableEverything: function() {
      this.disableTimeLine = false;
      this.disableMapInteractions = false;
      this.disableMenu = false;
      this.autoRotate = false;
      this.displayedCommunities_ = [];
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
    },
    currentFrame: function() {
      return Math.floor((this.time.getTime() - startTs) / windowStep);
    },
    currentEditsCountMax: function() {
      return Math.max(
        ...this.communities.communities.map(c =>
          c.isVisible ? c.counts[this.currentFrame] : 0
        )
      );
    }
  },
  /******** watchers ********/
  watch: {
    isSortByEditsCounts: function(v) {
      if (v) {
        this.communities.communities = this.communities.communities.sort(
          (a, b) => b.counts[this.currentFrame] - a.counts[this.currentFrame]
        );
      } else {
        this.communities.communities = this.communities.communities.sort(
          (a, b) => a.name.localeCompare(b.name)
        );
      }
    },
    currentFrame: function() {
      if (!this.isDragging && this.isSortByEditsCounts) {
        this.communities.communities = this.communities.communities.sort(
          (a, b) => b.counts[this.currentFrame] - a.counts[this.currentFrame]
        );
      }
    },
    drawSpikes: function() {
      mapSetDrawingMethod(this.drawSpikes);
    },

    autoRotate: function() {
      mapSetAutorotate(this.autoRotate);
    },

    disableMapInteractions: function() {
      mapSetInteraction(!this.disableMapInteractions);
    },

    disableMenu: function() {
      if (this.disableMenu) {
        this.sidebarHidden = true;
      }
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
          .then(([result, max]) => {
            this.currentLevelmaps = result;

            this.currentLevelmaps.forEach(levelmap => {
              levelmap.forEach((value, i) => {
                levelmap[i] =
                  (Math.min(MAX_EDIT_THRESHOLD, value) /
                    Math.min(MAX_EDIT_THRESHOLD, max)) *
                  MAX_HEIGHT_MAP;
              });
            });

            cmdWorker
              .send("blurImages", {
                images: this.currentLevelmaps,
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
    },
    isplaying: function() {
      mapPlay(this.isplaying);
    },
    speed: function() {
      mapSetSpeed(this.speed);
    },

    tutorialState: function() {
      this.speed = 1;
      switch (this.tutorialState) {
        case TutorialStates.Loading:
          this.disableEverything();
          this.autoRotate = true;
          this.isplaying = false;

        case TutorialStates.Start:
          mapResetPosition();
          this.disableEverything();
          this.autoRotate = true;
          this.isplaying = false;

          mapSeekTime(new Date(endTs));
          break;

        case TutorialStates.MapInteractions:
          this.disableEverything();
          this.disableMapInteractions = false;
          this.isplaying = false;

          mapSeekTime(new Date(endTs));
          break;

        case TutorialStates.ShowTimeline:
          this.disableEverything();
          this.disableMapInteractions = false;
          this.disableTimeLine = false;

          this.isplaying = true;

          mapSeekTime(new Date(startTs));
          break;

        case TutorialStates.ChooseCommunities:
          this.disableEverything();
          this.disableMapInteractions = false;
          this.disableMenu = false;
          this.disableTimeLine = false;
          this.isplaying = true;
          break;

        case TutorialStates.CaseStudy:
          this.disableEverything();
          this.disableMapInteractions = false;
          this.disableMenu = false;
          this.disableTimeLine = false;
          setFrenchGerman();
          mapSeekTime(new Date(startTs));
          this.isplaying = true;
          this.speed = 4;
          break;

        case TutorialStates.GoodLuck:
          this.isplaying = true;
          break;

        case TutorialStates.End:
          this.enableEverything();
          mapResetPosition();
          mapSeekTime(new Date(startTs));
          this.isplaying = true;
          break;
      }
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
        globalCommunity.color = "rgb(200, 200, 200)";
        appState.globalCommunity = globalCommunity;

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
      mapPreload()
    ]).then(() => {
      //console.log("Visualization loaded!");
      this.tutorialState = TutorialStates.Start;
      this.loaded = true;
    });
  },
  ready: function() {}
});

function appSetTime(t) {
  vm.time = t;
}
