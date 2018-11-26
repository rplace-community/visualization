var appState = {
  loaded: false,
  showExtLinks: true,
  communities: communitiesState,
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
    }
  },
  watch: {
    timelineTime: console.log("seek")
  },
  created: function() {
    // init3d()
    communitiesInit();

    console.log("Visualization loaded!");
    this.loaded = true;
  }
});
