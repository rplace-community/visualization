const MAPS_COUNT = 145;

/******* Communities state *******/
let communitiesState = {
  isVisible: true,
  search: "",
  communities: []
};

/******* Community component *******/
Vue.component("community-component", {
  props: ["community", "ismean", "currentFrame", "editsCountMax"],
  data: function() {
    return {
      isExpanded: false,
      isTouchDevice:
        "ontouchstart" in window ||
        (navigator.msMaxTouchPoints || navigator.maxTouchPoints) > 2
    };
  },
  computed: {
    editsRatio: function() {
      if (this.currentFrame) {
        const ratio =
          this.community.counts[this.currentFrame] / this.editsCountMax;
        return Math.round(ratio * 100) + "%";
      }
    }
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
    <div class="community-component" @click="toggleExpanded" :class="{ 'handle':!isTouchDevice }">
      <div class="edits-bar" style="height: 8px;" data-toggle="tooltip" :title="community.counts[currentFrame]">
        <div class="progress-bar" role="progressbar" v-if="currentFrame" :style="{width: editsRatio, height: '8px'}"></div>
      </div>
      <div class="community">
        <div class="handle-dots fas fa-grip-vertical" :class="{ 'handle':isTouchDevice }" data-toggle="tooltip" title="Click and move this handle to choose a specific community"></div>
        <div @mouseover="communityClicked" @mouseleave="communityOut">
          <div class="community-header" :style="{ color: community.color }">
            <div class="community-name">{{ community.name }}</div>
            <div class="fas fa-trash" :class="{ 'hidden':!community.withTrashBtn }" @click="$emit('hide', community)"></div>
          </div>
          <div class="description" :class="{ 'truncate': !isExpanded }" :style="{ color: community.color}">{{ community.description }}</div>
        </div>
      </div>
    </div>`
});

/******* Communities global context functions *******/
function communitiesInit() {
  return fetch(`assets/json/communities.json`)
    .then(function(response) {
      return response.json();
    })
    .then(function(array) {
      communitiesState.communities = array
        .map(community => {
          community.isShown = false;
          community.withTrashBtn = false;
          community.isVisible = true;
          community.levelmaps = {
            index: {},
            blobs: [],
            isLoaded: false
          };
          community.color = null;
          community.mask = null;
          fetchImages([`assets/img/masks/${community.id}.png`]).then(im => {
            community.mask = im[0];
          });
          return community;
        })
        .sort((a, b) => a.name.localeCompare(b.name));
      return communitiesState.communities;
    })
    .then(function(communities) {
      let max = 1;
      communities.forEach(c => {
        max = Math.max(max, c.counts_max);
      });
      return max;
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
