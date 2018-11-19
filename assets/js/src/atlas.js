const MAPS_COUNT = 145;

var atlasState = {
  isVisible: true,
  search: "",
  atlas: [
    {
      id: 0,
      name: "Tux (Linux Mascot)",
      description: "Tux is the official mascot of the Linux operating system.",
      website: "",
      subreddit: "linux",
      center: [500, 500],
      isSelected: true,
      levelmaps: {
        blobs: [],
        isLoaded: false
      }
    },
    {
      id: 10,
      name: "Test",
      description: "Test description",
      website: "",
      subreddit: "testreddit",
      center: [200, 700],
      isSelected: false,
      levelmaps: {
        index: null,
        blobs: [],
        isLoaded: false
      }
    }
  ]
};

function atlasInit() {
  fetch("assets/json/altas.json")
    .then(function(response) {
      return response.json();
    })
    .then(function(obj) {
      atlasState.atlas = obj;
    });
}

function atlasSearch(text) {
  return atlasState.atlas.filter(value => value.name.includes(text));
}

function atlasViewCommunityClicked(entry) {
  if (!entry.isSelected) {
    atlasLoadLevelmaps(entry);
  }
  entry.isSelected = !entry.isSelected;
}

function atlasLoadLevelmaps(entry) {
  if (!entry.isLoaded) {
    fetch(`assets/json/levelmaps/${entry.id}.json`)
      .then(function(response) {
        return response.json();
      })
      .then(function(obj) {
        entry.levelmaps.index = obj;

        const entries = Object.entries(obj[entry.id]);
        entries.forEach(element => {
          fetch(`assets/img/levelmaps/${entry.id}/${element[1].idx}.png`)
            .then(function(response) {
              return response.blob();
            })
            .then(function(blob) {
              entry.levelmaps.blobs.push(blob);
            });
        });
      });
    entry.isLoaded = true;
  }
}
