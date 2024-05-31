let camera, scene, renderer, controls;
const scenes = [];
let currentScene = 0;
const hotspots = [];
let sceneNames = []; // To store scene names
let scenesData = []; // Global variable to store scenes data
let INTERSECTED; // To store the currently intersected object

async function init() {
    // Camera configuration
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 0, 0.1); // Slightly offset to avoid problems with the camera inside the sphere

    // Create scene
    scene = new THREE.Scene();

    // Renderer configuration
    renderer = new THREE.WebGLRenderer();
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.xr.enabled = true;
    document.body.appendChild(renderer.domElement);

    // Add VR button
    document.body.appendChild(VRButton.createButton(renderer));

    // Controls configuration
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableZoom = false;
    controls.enablePan = false;

    // Initialize raycaster and mouse vector
    raycaster = new THREE.Raycaster();
    mouse = new THREE.Vector2();

    try {
        scenesData = await fetchScenesData('/public/data.json');
        sceneNames = scenesData.map(scene => scene.name); // Save scene names
        populateImageList(scenesData);
        const textures = await loadTextures(scenesData);
        createMeshes(textures);
        updateSelectedSceneName(); // Update initial scene name
        checkAndPrintButtons(scenesData[currentScene]); // Only load buttons for the initial scene
    } catch (error) {
        console.error('Error loading JSON or textures:', error);
    }

    window.addEventListener('resize', onWindowResize, false);
    document.addEventListener('mousemove', onDocumentMouseMove, false); // Add mousemove event listener
    document.addEventListener('click', onDocumentClick, false); // Add click event listener
}

async function fetchScenesData(url) {
    const response = await fetch(url);
    const data = await response.json();
    return data.scenes;
}

function loadTextures(imagesData) {
    const textureLoader = new THREE.TextureLoader();
    const texturePromises = imagesData.map(scene => {
        return new Promise((resolve, reject) => {
            textureLoader.load(
                scene.image,
                texture => resolve(texture),
                undefined,
                err => reject(err)
            );
        });
    });

    return Promise.all(texturePromises);
}

function createMeshes(textures) {
    const geometry = new THREE.SphereGeometry(500, 60, 40);
    geometry.scale(-1, 1, 1);

    textures.forEach((texture, index) => {
        const material = new THREE.MeshBasicMaterial({ map: texture });
        const mesh = new THREE.Mesh(geometry, material);
        scenes.push(mesh);
    });

    // Add initial scene
    scene.add(scenes[currentScene]);
}

function changeScene(index) {
    if (index >= 0 && index < scenes.length) {
        // Remove current scene and clear hotspots
        scene.remove(scenes[currentScene]);
        clearButtons();
        hotspots.length = 0;

        // Change to the new scene
        currentScene = index;
        scene.add(scenes[currentScene]);
        updateSelectedSceneName();

        // Add buttons for the new scene
        checkAndPrintButtons(scenesData[currentScene]);
    }
}

function changeSceneByLink(link) {
    const targetSceneIndex = scenesData.findIndex(scene => scene.image === link);

    if (targetSceneIndex >= 0) {
        changeScene(targetSceneIndex);
    } else {
        console.error(`Scene with link ${link} not found`);
    }
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function onDocumentMouseMove(event) {
    event.preventDefault();

    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);

    const intersects = raycaster.intersectObjects(hotspots);

    if (intersects.length > 0) {
        if (INTERSECTED != intersects[0].object) {
            if (INTERSECTED) INTERSECTED.material.color.setHex(INTERSECTED.currentHex);
            INTERSECTED = intersects[0].object;
            INTERSECTED.currentHex = INTERSECTED.material.color.getHex();
            INTERSECTED.material.color.setHex(0x323741); // Hover background color
        }
    } else {
        if (INTERSECTED) INTERSECTED.material.color.setHex(INTERSECTED.currentHex);
        INTERSECTED = null;
    }
}

function onDocumentClick(event) {
    event.preventDefault();

    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);

    const intersects = raycaster.intersectObjects(hotspots);

    if (intersects.length > 0) {
        const intersectedButton = intersects[0].object;
        const link = intersectedButton.userData.link;
        if (link) {
            intersectedButton.material.color.setHex(0x26489a); // Click background color
            setTimeout(() => changeSceneByLink(link), 200); // Delay to show click effect
        }
    }
}

function animate() {
    renderer.setAnimationLoop(render); // Use setAnimationLoop for VR compatibility
}

function render() {
    controls.update();
    renderer.render(scene, camera);
}

function populateImageList(scenesData) {
    const imageMenu = document.getElementById('imageMenu');
    scenesData.forEach((scene, index) => {
        const li = document.createElement('li');
        li.textContent = scene.name;
        li.onclick = () => changeScene(index);
        imageMenu.appendChild(li);
    });
}

function updateSelectedSceneName() {
    const selectedSpan = document.querySelector('.selected');
    if (selectedSpan) {
        selectedSpan.textContent = sceneNames[currentScene];
    }
}

function createStyledVRButton(buttonData) {
    const geometry = new THREE.SphereGeometry(0.5, 8, 8); // Example button geometry
    const material = new THREE.MeshBasicMaterial({ color: 0xffff00 , shininess: 100, specular: 0x888888 }); // Match background color
    const vrButton = new THREE.Mesh(geometry, material);
    vrButton.position.set(buttonData.position.x, buttonData.position.y, buttonData.position.z);
    vrButton.userData.link = buttonData.link;
    vrButton.userData.id = buttonData.id;

    return vrButton;
}

function checkAndPrintButtons(sceneData) {
    clearButtons(); // Clear existing buttons before adding new ones

    if (sceneData.buttons && sceneData.buttons.length > 0) {
        sceneData.buttons.forEach(buttonData => {
            // Create a styled VRButton
            const vrButton = createStyledVRButton(buttonData);

            // Add the button to the current scene
            scenes[currentScene].add(vrButton);
            hotspots.push(vrButton); // Add to hotspots for raycasting
        });
    }
}

function clearButtons() {
    hotspots.forEach(hotspot => {
        scene.remove(hotspot);
    });
    hotspots.length = 0;
}



class VRButton {

	static createButton( renderer, sessionInit = {} ) {

		const button = document.createElement( 'button' );

		function showEnterVR( /*device*/ ) {

			let currentSession = null;

			async function onSessionStarted( session ) {

				session.addEventListener( 'end', onSessionEnded );

				await renderer.xr.setSession( session );
				button.textContent = 'EXIT VR';

				currentSession = session;

			}

			function onSessionEnded( /*event*/ ) {

				currentSession.removeEventListener( 'end', onSessionEnded );

				button.textContent = 'ENTER VR';

				currentSession = null;

			}

			//

			button.style.display = '';

			button.style.cursor = 'pointer';
			button.style.left = 'calc(50% - 50px)';
			button.style.width = '100px';

			button.textContent = 'ENTER VR';

			// WebXR's requestReferenceSpace only works if the corresponding feature
			// was requested at session creation time. For simplicity, just ask for
			// the interesting ones as optional features, but be aware that the
			// requestReferenceSpace call will fail if it turns out to be unavailable.
			// ('local' is always available for immersive sessions and doesn't need to
			// be requested separately.)

			const sessionOptions = {
				...sessionInit,
				optionalFeatures: [
					'local-floor',
					'bounded-floor',
					'layers',
					...( sessionInit.optionalFeatures || [] )
				],
			};

			button.onmouseenter = function () {

				button.style.opacity = '1.0';

			};

			button.onmouseleave = function () {

				button.style.opacity = '0.5';

			};

			button.onclick = function () {

				if ( currentSession === null ) {

					navigator.xr.requestSession( 'immersive-vr', sessionOptions ).then( onSessionStarted );

				} else {

					currentSession.end();

					if ( navigator.xr.offerSession !== undefined ) {

						navigator.xr.offerSession( 'immersive-vr', sessionOptions )
							.then( onSessionStarted )
							.catch( ( err ) => {

								console.warn( err );

							} );

					}

				}

			};

			if ( navigator.xr.offerSession !== undefined ) {

				navigator.xr.offerSession( 'immersive-vr', sessionOptions )
					.then( onSessionStarted )
					.catch( ( err ) => {

						console.warn( err );

					} );

			}

		}

		function disableButton() {

			button.style.display = '';

			button.style.cursor = 'auto';
			button.style.left = 'calc(50% - 75px)';
			button.style.width = '150px';

			button.onmouseenter = null;
			button.onmouseleave = null;

			button.onclick = null;

		}

		function showWebXRNotFound() {

			disableButton();

			button.textContent = 'VR NOT SUPPORTED';

		}

		function showVRNotAllowed( exception ) {

			disableButton();

			console.warn( 'Exception when trying to call xr.isSessionSupported', exception );

			button.textContent = 'VR NOT ALLOWED';

		}

		function stylizeElement( element ) {

			element.style.position = 'absolute';
			element.style.bottom = '20px';
			element.style.padding = '12px 6px';
			element.style.border = '1px solid #fff';
			element.style.borderRadius = '4px';
			element.style.background = 'rgba(0,0,0,0.1)';
			element.style.color = '#fff';
			element.style.font = 'normal 13px sans-serif';
			element.style.textAlign = 'center';
			element.style.opacity = '0.5';
			element.style.outline = 'none';
			element.style.zIndex = '999';

		}

		if ( 'xr' in navigator ) {

			button.id = 'VRButton';
			button.style.display = 'none';

			stylizeElement( button );

			navigator.xr.isSessionSupported( 'immersive-vr' ).then( function ( supported ) {

				supported ? showEnterVR() : showWebXRNotFound();

				if ( supported && VRButton.xrSessionIsGranted ) {

					button.click();

				}

			} ).catch( showVRNotAllowed );

			return button;

		} else {

			const message = document.createElement( 'a' );

			if ( window.isSecureContext === false ) {

				message.href = document.location.href.replace( /^http:/, 'https:' );
				message.innerHTML = 'WEBXR NEEDS HTTPS'; // TODO Improve message

			} else {

				message.href = 'https://immersiveweb.dev/';
				message.innerHTML = 'WEBXR NOT AVAILABLE';

			}

			message.style.left = 'calc(50% - 90px)';
			message.style.width = '180px';
			message.style.textDecoration = 'none';

			stylizeElement( message );

			return message;

		}

	}

	static registerSessionGrantedListener() {

		if ( typeof navigator !== 'undefined' && 'xr' in navigator ) {

			// WebXRViewer (based on Firefox) has a bug where addEventListener
			// throws a silent exception and aborts execution entirely.
			if ( /WebXRViewer\//i.test( navigator.userAgent ) ) return;

			navigator.xr.addEventListener( 'sessiongranted', () => {

				VRButton.xrSessionIsGranted = true;

			} );

		}

	}

}

VRButton.xrSessionIsGranted = false;
VRButton.registerSessionGrantedListener();


init();
animate();






