const MAPS_COUNT = 145;

/******* Communities state *******/
var communitiesState = {
  isVisible: true,
  search: "",
  communities: []
};

/******* Community component *******/
Vue.component("community-component", {
  props: ["community", "ismean"],
  data: function() {
    return {
      isExpanded: false
    };
  },
  methods: {
    toggleExpanded: function() {
      this.isExpanded = !this.isExpanded;
    },
    communityClicked: function() {
      mapCommunityHighlight(this.community.mask);
    },
    communityOut: function() {
      mapCommunityHighlight();
    }
  },
  template: `
    <div class="community-component">
      <div class="row justify-content-between">
        <div class="col-md-12 name" @mouseover="communityClicked" @mouseleave="communityOut">
          <div class="handle fas fa-grip-vertical" :style="{ color: community.color }"></div>
          {{ community.name }}
        </div>
      </div>
      <div class="row drawer" v-if="isExpanded">
        <div class="description">{{ community.description }}</div>
      </div>
    </div>`
});

/******* Communities global context functions *******/
function communitiesInit(mode) {
  return fetch(`assets/json/${mode}/communities.json`)
    .then(function(response) {
      return response.json();
    })
    .then(function(array) {
      communitiesState.communities = array
        .map(community => {
          community.isShown = false;
          community.isPinned = false;
          community.isVisible = true;
          community.levelmaps = {
            index: {},
            blobs: [],
            isLoaded: false
          };
          community.color = null;
          community.mask = null;
          fetchImages([
            `assets/img/levelmaps/${mode}/${community.id}/mask.png`
          ]).then(im => {
            community.mask = im[0];
          });
          return community;
        })
        .sort((a, b) => a.name.localeCompare(b.name));
      return communitiesState.communities;
    })
    .then(function(communities) {});
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

function fetchLevelmaps(community, mode) {
  return fetch(`assets/json/levelmaps/${mode}/${community}.json`)
    .then(response => {
      return response.json();
    })
    .then(index => {
      const urls = index.map(
        e => `assets/img/levelmaps/${mode}/${community}/${e.idx}.png`
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
