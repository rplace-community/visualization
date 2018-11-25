var appState = {
  loaded: false,
  showExtLinks: true,
  communities: communitiesState,
  timeline: timelineState, //{ isVisible: true }, //timelineState,
  selectedComm: [],
  speed: 10
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
      return this.communities.filter(function(c) {
        return c.isSelected;
      });
    },
    timelineTime: function() {
      console.log(this.timeline.time);
      return timeline.time;
    }
  },
  watch: {
    timelineTime: console.log("seek")
  },
  created: function() {
    // init3d()
    timelineInit();
    communitiesInit();

    console.log("Visualization loaded!");
    this.loaded = true;
  }
});
