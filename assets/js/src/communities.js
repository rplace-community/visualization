const MAPS_COUNT = 145;

var communitiesState = {
  isVisible: true,
  search: "",
  communities: []
};

function communitiesInit() {
  fetch("assets/json/communities.json")
    .then(function(response) {
      return response.json();
    })
    .then(function(obj) {
      communitiesState.communities = Object.keys(obj).map(function(key) {
        obj[key].isSelected = false;
        obj[key].levelmaps = { blobs: [], isLoaded: false };
        return obj[key];
      });
    });
}

function communitiesSearch(text) {
  let res = communitiesState.communities.filter(value =>
    value.name.toLowerCase().includes(text.toLowerCase())
  );
  return res;
}

Vue.component("community-component", {
  props: ["community"],
  data: function() {
    return {
      isShown: false,
      isPinned: false,
      isExpanded: false,
      levelmaps: {
        blobs: []
      }
    };
  },
  methods: {
    toggleShown: function() {
      let levelmaps = this.levelmaps;
      let community = this.community;
      if (!this.isShown && !community.isLoaded) {
        fetch(`assets/json/levelmaps/${community.id}.json`)
          .then(response => {
            return response.json();
          })
          .then(obj => {
            levelmaps.index = obj[community.id];

            const entries = Object.entries(levelmaps.index);
            entries.forEach(element => {
              fetch(
                `assets/img/levelmaps/${community.id}/${element[1].idx}.png`
              )
                .then(response => {
                  return response.blob();
                })
                .then(blob => {
                  levelmaps.blobs.push(blob);
                });
            });
          });
        levelmaps.isLoaded = true;
      }

      this.isShown = !this.isShown;
      community.levelmaps = levelmaps;
      community.isSelected = this.isShown;
      this.$emit("update:community", community);
    },
    togglePinned: function() {
      this.isPinned = !this.isPinned;
    },
    toggleExpanded: function() {
      this.isExpanded = !this.isExpanded;
    }
  },
  template: `<div class="community-component">
        <div class="row justify-content-between">
            <div class="col-md-8 name">{{ community.name }}</div>
            <div class="col-md-4 community-btns">
                <div class="glyphicon glyphicon-eye-open" :class="{'enabled': isShown}" @click="toggleShown()"></div>
                <div class="glyphicon glyphicon-pushpin" :class="{'enabled': isPinned}" @click="togglePinned()"></div>
                <div class="glyphicon glyphicon-option-vertical" :class="{'enabled': isExpanded}" @click="toggleExpanded()"></div>
            </div>
        </div>
        <div class="row drawer" v-if="isExpanded">
            <div class="description">{{ community.description }}</div>
        </div>
    </div>`
});
