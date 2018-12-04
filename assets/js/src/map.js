if (WEBGL.isWebGLAvailable() === false) {
  document.body.appendChild(WEBGL.getWebGLErrorMessage());
}

const map = {
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

var pause_animation = false;

let camera, controls, scene, renderer;
let planeGeometry;
let planeMaterial;
let index_plane = 0;


let timeBack = new Time([], endTs - startTs);
let timeLevels = new Time([], endTs - startTs).setArrayInterpolation();

const tot_images = 145;
const filterSize = 200;
const steps = 16;

let plane_images;
let back_images;
let interpolator_images;


function mapSetBackgrounds(arr) {
  back_images = arr;
  timeBack.setArray(back_images);
}

function mapSetLevelmaps(arr) {
  plane_images = arr;
  timeLevels.setArray(plane_images);
}

function seekTime(t) {
  timeBack.seekTime(t);
  timeLevels.seekTime(t);

  let textr = new THREE.CanvasTexture(timeBack.get());
  textr.minFilter = THREE.NearestFilter;
  textr.magFilter = THREE.NearestFilter;
  planeMaterial.map = textr;
  planeMaterial.needsUpdate = true;
}


function mapPreload(observer) {
  const urls = Array.from(Array(tot_images * 2 - 1).keys()).map(
    i => `assets/img/frames/${i}.png`
  );

  return fetchImages(urls, observer).then(images => {
    mapSetBackgrounds(images)

    init();
    animate();
  });
}

function init() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x333333);

  scene.fog = new THREE.FogExp2(0xcccccc, 0.001);
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

  controls.maxPolarAngle = (Math.PI * 4.5) / 10.0;

  // world ***********************************************************************************************************

  planeGeometry = new THREE.PlaneBufferGeometry(1000, 1000, 200, 200);
  //planeGeometry = new THREE.PlaneBufferGeometry(1000, 1000, 400, 400);

  //let texture2 = new THREE.TextureLoader().load( "assets/img/rplace.png" );//new THREE.CanvasTexture( canvas);
  //texture2.minFilter = THREE.NearestFilter;
  //texture2.magFilter = THREE.NearestFilter;

  planeMaterial = new THREE.MeshPhongMaterial({
    color: 0xffffff,
    flatShading: true,
    specular: 0x0
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
  var light = new THREE.DirectionalLight(0xffffff);
  light.position.set(1, 1, 1);
  scene.add(light);
  var light = new THREE.DirectionalLight(0x002288);
  light.position.set(-1, -1, -1);
  scene.add(light);
  var light = new THREE.AmbientLight(0x222222);
  scene.add(light);
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

  if (!plane_images) return;

  



  //if(index_plane == 0) {
  //if (index_plane % steps == 0) {
  //  let index = index_plane / steps;
  //  if (plane_images[index] && plane_images[(index + 1) % tot_images]) {
  //    interpolator_images = d3.interpolateArray(
  //      plane_images[index],
  //      plane_images[(index + 1) % tot_images]
  //    );
  //  }
  //}

  /*
  if (index_plane % (steps / 2) == 0) {
    let index = (2 * index_plane) / steps;
    let textr = new THREE.CanvasTexture(back_images[index]); //THREE.ImageUtils.loadTexture( src );
    textr.minFilter = THREE.NearestFilter;
    textr.magFilter = THREE.NearestFilter;
    planeMaterial.map = textr;
    planeMaterial.needsUpdate = true;
  }

  if (interpolator_images) {
    generatePlaneHeightsBuffered();
  }
  */

  //index_plane = (index_plane + 1) % (tot_images * steps); //}

  generatePlaneHeightsBuffered();
}

function generatePlaneHeightsBuffered() {
  if (planeGeometry) {
    let positions = planeGeometry.attributes.position.array;
    let arr = timeLevels.get(); //interpolator_images((index_plane % steps) / steps);

    //Top left is -500, 500
    //Bottom right is 500, -500
    ///!\ <=, not <
    for (let i = 0; i < filterSize; i++) {
      for (let j = 0; j < filterSize; j++) {
        //let height = context.getImageData(i, j, 1, 1).data[0]; //red = blue = green
        positions[(i + j * (filterSize + 1)) * 3 + 2] = arr[i + j * filterSize];
      }
      //planeGeometry.vertices[i].z = sinus(planeGeometry.vertices[i].x, planeGeometry.vertices[i].y) *10;
    }

    planeGeometry.attributes.position.needsUpdate = true;
  }
}

// function generatePlaneHeights(index) {
//   if (planeGeometry) {
//     let canvas = document.createElement("canvas");
//     canvas.width = 200;
//     canvas.height = 200;
//     let context = canvas.getContext("2d");
//     context.drawImage(plane_images[index], 0, 0);

//     //Top left is -500, 500
//     //Bottom right is 500, -500
//     ///!\ <=, not <
//     for (let i = 0; i < 200; ++i) {
//       for (let j = 0; j < 200; ++j) {
//         let height = context.getImageData(i, j, 1, 1).data[0]; //red = blue = green
//         planeGeometry.vertices[i + j * 200].z = height;
//       }
//       //planeGeometry.vertices[i].z = sinus(planeGeometry.vertices[i].x, planeGeometry.vertices[i].y) *10;
//     }

//     planeGeometry.computeFaceNormals();
//     planeGeometry.computeVertexNormals();
//     planeGeometry.verticesNeedUpdate = true;
//   }
// }

function render() {
  renderer.render(scene, camera);
}
