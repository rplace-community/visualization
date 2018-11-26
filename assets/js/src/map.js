if (WEBGL.isWebGLAvailable() === false) {
  document.body.appendChild(WEBGL.getWebGLErrorMessage());
}

const Map = {
  currentTime: null,
  timeRange: null,
  communities: [],

  init: function() {},
  seekTime: function(t) {
    this.currentTime = t;
  },
  setTimeRange: function(dt) {
    this.timeRange = dt;
  },
  updateCommunities: function(communities) {}
};

let camera, controls, scene, renderer;
let planeGeometry;
let planeMaterial;
let index_plane = 0;

const tot_images = 145;
const filterSize = 200;
const steps = 16;

let plane_images = new Array();
let back_images = new Array();
let interpolator_images;

let interpolator_height = x => x;
let interpolator_heights = new Array();

d3.json("assets/json/levelmaps/global.json").then(function(data) {
  let max = 0;
  let jsonValues = Object.values(data["null"]);

  for (let i = 0; i < tot_images; ++i) {
    interpolator_heights[i] = d3
      .scaleLinear()
      .domain([0, 255])
      .range([0, parseFloat(jsonValues[i].max)]);
    max = Math.max(max, parseFloat(jsonValues[i].max));
  }

  interpolator_height = d3
    .scaleLinear()
    .domain([0, max])
    .range([0, 200]);

  preload();
});

function preload() {
  let loaded_filters = 0;
  let loaded_backs = 0;
  let launched = false;

  for (let i = 0; i < tot_images; i++) {
    let im = new Image();
    im.i = i;
    im.onload = function() {
      let canvas = document.createElement("canvas");
      canvas.width = filterSize;
      canvas.height = filterSize;
      let context = canvas.getContext("2d");
      context.drawImage(this, 0, 0);

      let data = context.getImageData(0, 0, filterSize, filterSize).data;

      blurRGBA(data, 200, 200, 5); // APPLY GAUSSIAN SMOOTHING

      for (let j = 0; j < data.length; ++j) {
        data[j] = interpolator_heights[this.i](data[j]);
      }

      plane_images[this.i] = data;

      loaded_filters++;
      if (
        loaded_backs > tot_images &&
        loaded_filters > tot_images / 2 &&
        !launched
      ) {
        launched = true;

        let loading = document.getElementsByClassName("lds-circle")[0];
        loading.style.display = "none";

        const timeline = document.getElementById("timeline");
        timeline.style.display = null;

        init();
        animate();
      } else {
        let loadingBar = document.getElementsByClassName("w3-grey")[0];
        loadingBar.style.width =
          100 *
            Math.min(
              loaded_backs / (tot_images + 1),
              (2 * loaded_filters) / (tot_images + 1)
            ) +
          "%";
      }
    };
    im.src = "assets/img/levelmaps/global/" + i + ".png";

    back_images[2 * i] = new Image();
    back_images[2 * i].onload = function() {
      loaded_backs++;

      if (
        loaded_backs > tot_images &&
        loaded_filters > tot_images / 2 &&
        !launched
      ) {
        launched = true;
        let loading = document.getElementsByClassName("lds-circle")[0];
        loading.style.display = "none";

        const timeline = document.getElementById("timeline");
        timeline.style.display = null;

        init();
        animate();
      } else {
        let loadingBar = document.getElementsByClassName("w3-grey")[0];
        loadingBar.style.width =
          100 *
            Math.min(
              loaded_backs / (tot_images + 1),
              (2 * loaded_filters) / (tot_images + 1)
            ) +
          "%";
      }
    };
    back_images[2 * i].src = "assets/img/frames/" + i * 2 + ".png";

    back_images[2 * i + 1] = new Image();
    back_images[2 * i + 1].onload = function() {
      loaded_backs++;

      if (
        loaded_backs > tot_images &&
        loaded_filters > tot_images / 2 &&
        !launched
      ) {
        launched = true;
        let loading = document.getElementsByClassName("lds-circle")[0];
        loading.style.display = "none";

        const timeline = document.getElementById("timeline");
        timeline.style.display = null;

        init();
        animate();
      }
    };
    back_images[2 * i + 1].src = "assets/img/frames/" + (i * 2 + 1) + ".png";
  }
}

function init() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x333333);

  scene.fog = new THREE.FogExp2(0x555555, 0.001);
  renderer = new THREE.WebGLRenderer(); //{ antialias: true } );
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  //camera = new THREE.PerspectiveCamera( 60, window.innerWidth / window.innerHeight, 1, 1000 );
  camera = new THREE.OrthographicCamera(
    window.innerWidth / -2,
    window.innerWidth / 2,
    window.innerHeight / 2,
    window.innerHeight / -2,
    -1000,
    1500
  );
  camera.position.set(250, 120, 100);
  //camera.zoom = 1.2;
  //camera.updateProjectionMatrix();
  // controls

  controls = new THREE.MapControls(camera, renderer.domElement);
  //controls = new THREE.OrbitControls( camera, renderer.domElement );

  //controls.addEventListener( 'change', render ); // call this only in static scenes (i.e., if there is no animation loop)
  controls.enableDamping = true; // an animation loop is required when either damping or auto-rotation are enabled

  //controls.enablePan = false;

  controls.screenSpacePanning = false;
  controls.minDistance = 1;
  //controls.maxDistance = 500;

  controls.minZoom = 1;
  controls.maxZoom = 10;

  controls.maxPolarAngle = (Math.PI * 4.0) / 10.0;

  // world ***********************************************************************************************************

  //planeGeometry = new THREE.PlaneGeometry( 1000, 1000, 199, 199);
  planeGeometry = new THREE.PlaneBufferGeometry(1000, 1000, 400, 400);

  //let texture2 = new THREE.TextureLoader().load( "assets/img/rplace.png" );//new THREE.CanvasTexture( canvas);
  //texture2.minFilter = THREE.NearestFilter;
  //texture2.magFilter = THREE.NearestFilter;

  planeMaterial = new THREE.MeshPhongMaterial({
    //color: 0xAAAAAA,
    //wireframe: true,
    //transparent: false,
    specular: 0
    //opacity: 1,
    //map: texture2
  });
  //let texture = new THREE.TextureLoader().load('assets/img/rplace.png');
  //texture3.minFilter = THREE.LinearFilter;
  //texture3.maxFilter = THREE.LinearFilter;
  //let material3 = new THREE.MeshBasicMaterial( { map: texture3} );

  let planeMesh = new THREE.Mesh(planeGeometry, planeMaterial);
  planeMesh.rotateX(-Math.PI / 2);
  planeMesh.matrixAutoUpdate = true;
  planeMesh.updateMatrix();
  scene.add(planeMesh);

  let bottomCubeGeometry = new THREE.BoxGeometry(1000, 1000, 20);
  bottomCubeGeometry.translate(0, 0, -10.01);
  let bottomCubeMaterial = new THREE.MeshBasicMaterial({ color: 0xeeeeee });
  let bottomCube = new THREE.Mesh(bottomCubeGeometry, bottomCubeMaterial);
  bottomCube.rotateX(-Math.PI / 2);
  scene.add(bottomCube);

  // lights
  //let light1 = new THREE.DirectionalLight( 0xffffff );
  //light1.position.set( 0.5, 1, 1 );
  //scene.add( light1 );
  //let light2 = new THREE.DirectionalLight( 0xAAAAFF, 3 );
  //light2.position.set( 10, 10, 10 );
  //scene.add( light2 );
  let light3 = new THREE.AmbientLight(0xeeeeff, 1.5);
  scene.add(light3);
  //
  window.addEventListener("resize", onWindowResize, false);

  //}

  //img.src = 'assets/img/rplace.png';
  /*
  var gui = new dat.GUI();
  gui.add( controls, 'screenSpacePanning' );
  */
}

function onWindowResize() {
  //camera.aspect = window.innerWidth / window.innerHeight;

  camera.left = window.innerWidth / -2;
  camera.right = window.innerWidth / 2;
  camera.top = window.innerHeight / 2;
  camera.bottom = window.innerHeight / -2;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
  requestAnimationFrame(animate);

  controls.update(); // only required if controls.enableDamping = true, or if controls.autoRotate = true

  render();

  //if(index_plane == 0) {
  if (index_plane % steps == 0) {
    let index = index_plane / steps;
    if (plane_images[index] && plane_images[(index + 1) % tot_images]) {
      interpolator_images = d3.interpolateArray(
        plane_images[index],
        plane_images[(index + 1) % tot_images]
      );
    }
  }

  if (index_plane % (steps / 2) == 0) {
    index = (2 * index_plane) / steps;
    let textr = new THREE.CanvasTexture(back_images[index]); //THREE.ImageUtils.loadTexture( src );
    textr.minFilter = THREE.NearestFilter;
    textr.magFilter = THREE.NearestFilter;
    planeMaterial.map = textr;
    planeMaterial.needsUpdate = true;
  }

  if (interpolator_images) {
    generatePlaneHeightsBuffered();
  }

  index_plane = (index_plane + 1) % (tot_images * steps); //}
}

function generatePlaneHeightsBuffered() {
  if (planeGeometry) {
    let positions = planeGeometry.attributes.position.array;
    let arr = interpolator_images((index_plane % steps) / steps);

    //Top left is -500, 500
    //Bottom right is 500, -500
    ///!\ <=, not <
    const twoFSP1 = 2 * filterSize + 1;
    for (let i = 0; i < filterSize; i++) {
      for (let j = 0; j < filterSize; j++) {
        const iIm = i * 2 + 1;
        const jIm = j * 2 + 1;
        //let height = context.getImageData(i, j, 1, 1).data[0]; //red = blue = green
        positions[(iIm + jIm * twoFSP1) * 3 + 2] = interpolator_height(
          arr[(i + j * 200) * 4]
        );
      }
      //planeGeometry.vertices[i].z = sinus(planeGeometry.vertices[i].x, planeGeometry.vertices[i].y) *10;
    }

    planeGeometry.attributes.position.needsUpdate = true;
  }
}

function generatePlaneHeights(index) {
  if (planeGeometry) {
    let canvas = document.createElement("canvas");
    canvas.width = 200;
    canvas.height = 200;
    let context = canvas.getContext("2d");
    context.drawImage(plane_images[index], 0, 0);

    //Top left is -500, 500
    //Bottom right is 500, -500
    ///!\ <=, not <
    for (let i = 0; i < 200; ++i) {
      for (let j = 0; j < 200; ++j) {
        let height = context.getImageData(i, j, 1, 1).data[0]; //red = blue = green
        planeGeometry.vertices[i + j * 200].z = height;
      }
      //planeGeometry.vertices[i].z = sinus(planeGeometry.vertices[i].x, planeGeometry.vertices[i].y) *10;
    }

    planeGeometry.computeFaceNormals();
    planeGeometry.computeVertexNormals();
    planeGeometry.verticesNeedUpdate = true;
  }
}

function render() {
  renderer.render(scene, camera);
}
