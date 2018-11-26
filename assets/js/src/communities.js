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
    .then(function(array) {
      communitiesState.communities = array.map(community => {
        community.isShown = false;
        community.isPinned = false;
        community.levelmaps = { blobs: [], isLoaded: false };
        return community;
      });
    });
}

function communitiesSearch(text) {
  return communitiesState.communities
    .filter(v => {
      return v.isPinned || v.name.toLowerCase().includes(text.toLowerCase());
    })
    .sort((a, b) => {
      if (a.isPinned == b.isPinned) {
        return a.name > b.name;
      } else {
        return a.isPinned > b.isPinned;
      }
    });
}

Vue.component("community-component", {
  props: ["community"],
  data: function() {
    return {
      isExpanded: false,
    };
  },
  methods: {
    toggleShown: function() {
      let community = this.community;
      if (!community.isShown && !community.isLoaded) {
        fetch(`assets/json/levelmaps/max/${community.id}.json`)
          .then(response => {
            return response.json();
          })
          .then(index => {
            community.levelmaps.index = index;

            let blobs = Promise.all(
              index.map(element => {
                fetch(
                  `assets/img/levelmaps/max/${community.id}/${element.idx}.png`
                ).then(response => {
                  return response.blob();
                });
              })
            );
            blobs.then(bs => {
              community.levelmaps.blobs = bs;
              community.levelmaps.isLoaded = true;
              this.$emit("update:community");
            });
          });
        community.isShown = true;
      } else {
        community.isShown = !community.isShown;
        this.$emit("update:community");
      }
    },
    togglePinned: function() {
      this.community.isPinned = !this.community.isPinned;
      this.$emit("update:community");
    },
    toggleExpanded: function() {
      this.isExpanded = !this.isExpanded;
    }
  },
  template: `<div class="community-component">
        <div class="row justify-content-between">
            <div class="col-md-8 name">{{ community.name }}</div>
            <div class="col-md-4 community-btns">
                <div class="glyphicon glyphicon-eye-open" :class="{'enabled': community.isShown}" @click="toggleShown()"></div>
                <div class="glyphicon glyphicon-pushpin" :class="{'enabled': community.isPinned}" @click="togglePinned()"></div>
                <div class="glyphicon glyphicon-option-vertical" :class="{'enabled': isExpanded}" @click="toggleExpanded()"></div>
            </div>
        </div>
        <div class="row drawer" v-if="isExpanded">
            <div class="description">{{ community.description }}</div>
        </div>
    </div>`
});
