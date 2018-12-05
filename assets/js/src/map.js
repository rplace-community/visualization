if (WEBGL.isWebGLAvailable() === false) {
  document.body.appendChild(WEBGL.getWebGLErrorMessage());
}

const TOTAL_TIME = endTs - startTs + 2 * windowStep;
const FILTER_SIZE = 200;
const PLANE_SIZE = 1000;
const TOT_IMAGES = 145;

let drawSpikes = false;

let camera, controls, scene, renderer;
let planeGeometry;
let planeMesh;
let planeMaterial;

let timeBack = new Time([], TOTAL_TIME);
let timeLevels = new Time([], TOTAL_TIME).setArrayInterpolation();

let plane_images;
let back_images;
let interpolator_images;

function mapSetDrawingMethod(spikes) {

  if(planeGeometry) {
    planeGeometry.dispose();
  }

  drawSpikes = spikes;
  if(drawSpikes) {
    planeGeometry = new THREE.PlaneBufferGeometry(PLANE_SIZE, PLANE_SIZE, 2*FILTER_SIZE, 2*FILTER_SIZE);
  } else {
    //To have 202*202 points, to work with 200*200 and leave borders
    planeGeometry = new THREE.PlaneBufferGeometry(PLANE_SIZE, PLANE_SIZE, FILTER_SIZE + 1, FILTER_SIZE + 1); 
  }
  planeMesh.geometry = planeGeometry;
  drawLevelMaps();
}

function mapSetBackgrounds(arr) {
  back_images = arr;
  timeBack.setArray(back_images);
}

function mapSetLevelmaps(arr) {
  plane_images = arr;
  timeLevels.setArray(plane_images);
}

function mapResetPosition() {
  controls.reset();
}
 
function seekTime(t) {
  if(timeBack.hasData() && timeLevels.hasData()) {
    timeBack.seekTime(t);
    timeLevels.seekTime(t);
    
    drawBackground();
    drawLevelMaps();
  }
}

function drawBackground() {
  let textr = new THREE.CanvasTexture(timeBack.get());
  textr.minFilter = THREE.NearestFilter;
  textr.magFilter = THREE.NearestFilter;
  planeMaterial.map = textr;
  planeMaterial.needsUpdate = true;
}

function drawLevelMaps() {
  if (drawSpikes) {
    generatePlaneHeightsSpikesBuffered();
  } else {
    generatePlaneHeightsBuffered();
  }
}


function mapPreload(observer) {

  

  const urls = Array.from(Array(TOT_IMAGES * 2 - 1).keys()).map(
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
  renderer = new THREE.WebGLRenderer({ antialias: true } );
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  camera = new THREE.OrthographicCamera(
    window.innerWidth / -2,
    window.innerWidth / 2,
    window.innerHeight / 2,
    window.innerHeight / -2,
    -1000,
    1500
  );
  camera.position.set(250, 120, 100);

  // controls

  controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true; // an animation loop is required when either damping or auto-rotation are enabled

  controls.screenSpacePanning = false;
  controls.minDistance = 1;

  controls.minZoom = 1;
  controls.maxZoom = 10;

  controls.maxPolarAngle = (Math.PI * 4.5) / 10.0;

  // world ***********************************************************************************************************

  planeMaterial = new THREE.MeshPhongMaterial({
    color: 0xffffff,
    flatShading: true,
    specular: 0x0,
    shininess: 0,
  });

  planeMesh = new THREE.Mesh(planeGeometry, planeMaterial);
  mapSetDrawingMethod(drawSpikes);

  planeMesh.rotateX(-Math.PI / 2);
  planeMesh.matrixAutoUpdate = true;
  planeMesh.updateMatrix();
  scene.add(planeMesh);

  let bottomCubeGeometry = new THREE.BoxGeometry(PLANE_SIZE, PLANE_SIZE, 20);
  bottomCubeGeometry.translate(0, 0, -10.01); //Not -10, to avoid z-buffer issues
  let bottomCubeMaterial = new THREE.MeshBasicMaterial({ color: 0xb4b4b4 });
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

  window.addEventListener("resize", onWindowResize, false);
}

function onWindowResize() {
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
}

function generatePlaneHeightsBuffered() {
  if (planeGeometry) {
    let positions = planeGeometry.attributes.position.array;
    let arr = timeLevels.get();

    for (let i = 0; i < FILTER_SIZE; i++) {
      for (let j = 0; j < FILTER_SIZE; j++) {
        const iIm = i + 1;
        const jIm = j + 1;
        positions[(iIm + jIm * (FILTER_SIZE + 2)) * 3 + 2] = arr[i + j * FILTER_SIZE];
      }
    }
    planeGeometry.attributes.position.needsUpdate = true;
  }
}

function pow(x) {
  return Math.pow(x, 1.5);
}
function generatePlaneHeightsSpikesBuffered() {
  if(planeGeometry) {
    let positions = planeGeometry.attributes.position.array;
    let arr = timeLevels.get();

    const twoFSP1 = 2 * FILTER_SIZE + 1;
    for(let i = 0; i < FILTER_SIZE; i++) {
      for(let j = 0; j < FILTER_SIZE; j++) {
        const iIm = i * 2 + 1;
        const jIm = j * 2 + 1;
        positions[(iIm + jIm * twoFSP1)*3 + 2] = pow(arr[i + j * FILTER_SIZE]/3);
      }
    }
    planeGeometry.attributes.position.needsUpdate = true;
  }
}

function render() {
  renderer.render(scene, camera);
}
