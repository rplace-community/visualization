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
        community.levelmaps = { index: {}, blobs: [], isLoaded: false };
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
        return a.name.localeCompare(b.name);
      } else {
        return b.isPinned - a.isPinned;
      }
    });
}

Vue.component("community-component", {
  props: ["community"],
  data: function() {
    return {
      isExpanded: false
    };
  },
  methods: {
    toggleShown: function() {
      const community = this.community;
      if (!community.isShown && !community.levelmaps.isLoaded) {
        fetchLevelmaps(community.id).then(([index, levelmaps]) => {
          community.levelmaps.index = index;
          community.levelmaps.blobs = levelmaps;
          community.levelmaps.isLoaded = true;
          this.$emit("update:community");
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

function fetchLevelmaps(community) {
  return fetch(`assets/json/levelmaps/max/${community}.json`)
    .then(response => {
      return response.json();
    })
    .then(index => {
      const urls = index.map(
        e => `assets/img/levelmaps/max/${community}/${e.idx}.png`
      );
      return fetchImagesData(urls).then(datas => {
        const maxs = index.map(e => e.max);
        const normalized = datas.map((img, i) => {
          let levels = new Float32Array(img.length / 4);
          for (const pixel of levels.keys()) {
            levels[pixel] = (maxs[i] * img[pixel * 4]) / 255.0;
          }
          return levels;
        });
        return [index, normalized];
      });
    });
}
