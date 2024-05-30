let camera, scene, renderer, controls;
const scenes = [];
let currentScene = 0;
const hotspots = [];

init();
animate();

function init() {
    // Scene setup
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 0, 0.1); // Slightly offset to avoid camera inside the sphere issues

    scene = new THREE.Scene();

    renderer = new THREE.WebGLRenderer();
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableZoom = false;
    controls.enablePan = false;

    // Load 360 images
    const textureLoader = new THREE.TextureLoader();
    const textures = [
        textureLoader.load('./images/oficina_pno.jpg'),
        textureLoader.load('./images/bedroom.jpg'),
        textureLoader.load('./images/shot-panoramic-composition-library.jpg')
    ];

    // Create meshes for each scene
    const geometry = new THREE.SphereGeometry(500, 60, 40);
    geometry.scale(-1, 1, 1);

    const materials = textures.map(texture => new THREE.MeshBasicMaterial({ map: texture }));

    const mesh1 = new THREE.Mesh(geometry, materials[0]);
    const mesh2 = new THREE.Mesh(geometry, materials[1]);
    const mesh3 = new THREE.Mesh(geometry, materials[2]);

    scenes.push(mesh1, mesh2, mesh3);

    // Add the initial scene
    scene.add(scenes[currentScene]);

    // Create hotspots
    createHotspot(mesh1, new THREE.Vector3(50, 0, -200), 1); // Hotspot to Scene 2
    createHotspot(mesh2, new THREE.Vector3(50, 0, -200), 2); // Hotspot to Scene 3
    createHotspot(mesh3, new THREE.Vector3(50, 0, -200), 0); // Hotspot to Scene 1

    window.addEventListener('resize', onWindowResize, false);
    document.addEventListener('mousedown', onDocumentMouseDown, false);
}

function createHotspot(mesh, position, targetScene) {
    const hotspot = new THREE.Mesh(
        new THREE.SphereGeometry(5, 32, 32),
        new THREE.MeshBasicMaterial({ color: 0xff0000 })
    );
    hotspot.position.copy(position);
    hotspot.userData.targetScene = targetScene;
    mesh.add(hotspot);
    hotspots.push(hotspot);
}

function changeScene(index) {
    if (index >= 0 && index < scenes.length) {
        scene.remove(scenes[currentScene]);
        currentScene = index;
        scene.add(scenes[currentScene]);
    }
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function onDocumentMouseDown(event) {
    event.preventDefault();

    const mouse = new THREE.Vector2(
        (event.clientX / window.innerWidth) * 2 - 1,
        -(event.clientY / window.innerHeight) * 2 + 1
    );

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, camera);

    const intersects = raycaster.intersectObjects(hotspots);

    if (intersects.length > 0) {
        const hotspot = intersects[0].object;
        const targetScene = hotspot.userData.targetScene;
        changeScene(targetScene);
    }
}

function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
}
