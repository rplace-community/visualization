var appState = {
  loaded: false,
  showExtLinks: true,
  atlas: atlasState,
  timeline: { isVisible: true }, //timelineState,
  selectedComm: []
};

var app = new Vue({
  el: "#app",
  data: appState,
  methods: {
    atlasViewCommunityClicked: atlasViewCommunityClicked
  },
  computed:{
      searchAtlas: function(){ return atlasSearch( this.atlas.search ) },
  },
  created: function() {
    // init3d()
    timelineInit()
    //atlasInit()

    console.log("Visualization loaded!");
    this.loaded = true;
  }
});
