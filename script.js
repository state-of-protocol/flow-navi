// ===============================================
// script.js - Logik Utama Aplikasi Navigasi
// (Menuju ke arah sistem offline seperti Organic Maps)
// ===============================================

// --- 1. KONFIGURASI ---
// Tiada API Keys untuk Google Maps atau Gemini lagi
// Kita akan menggunakan data peta dan routing offline
const OFFLINE_MAP_DATA_URL = 'path/to/your/offline-vector-tiles/{z}/{x}/{y}.pbf'; // Akan diganti dengan sumber data anda
const OFFLINE_STYLE_URL = 'path/to/your/custom-map-style.json'; // Gaya peta untuk Maplibre GL JS

// --- 2. PEMBOLEH UBAH GLOBAL ---
let mapInstance; // Akan menyimpan instance Maplibre GL JS map
let currentPosition = null; // [lat, lng]
let currentDestination = ""; // Alamat atau koordinat destinasi
let currentRoute = []; // Array langkah-langkah laluan yang dihitung (offline)
let currentStepIndex = 0;
let navigationUpdateInterval = null; // Untuk clearInterval
let isOfflineMode = false; // Status mod luar talian

// --- 3. FUNGSI UTILITI ---

/**
 * Mendapatkan lokasi semasa pengguna menggunakan Geolocation API dari browser.
 * @returns {Promise<[number, number]>} Resolves dengan [latitude, longitude] atau rejects jika gagal.
 */
function getCurrentLocation() {
    return new Promise((resolve, reject) => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    resolve([position.coords.latitude, position.coords.longitude]);
                },
                (error) => {
                    console.error("Gagal mendapatkan lokasi GPS:", error);
                    // Fallback jika GPS gagal (contoh: gunakan lokasi terakhir yang diketahui atau default)
                    reject(new Error("Gagal mendapatkan lokasi GPS. Pastikan ia diaktifkan."));
                },
                { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
            );
        } else {
            console.error("Geolocation tidak disokong oleh browser ini.");
            reject(new Error("Geolocation tidak disokong oleh browser anda."));
        }
    });
}

/**
 * Mengira jarak Haversine antara dua titik lat/lng dalam meter.
 * @param {number} lat1 - Latitude titik 1.
 * @param {number} lon1 - Longitude titik 1.
 * @param {number} lat2 - Latitude titik 2.
 * @param {number} lon2 - Longitude titik 2.
 * @returns {number} Jarak dalam meter.
 */
function haversine(lat1, lon1, lat2, lon2) {
    const R = 6371000; // Radius Bumi dalam meter
    const phi1 = toRadians(lat1);
    const phi2 = toRadians(lat2);
    const dphi = toRadians(lat2 - lat1);
    const dlambda = toRadians(lon2 - lon1);

    const a = Math.sin(dphi / 2) ** 2 + Math.cos(phi1) * Math.cos(phi2) * Math.sin(dlambda / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Menukar darjah kepada radian.
 * @param {number} deg - Sudut dalam darjah.
 * @returns {number} Sudut dalam radian.
 */
function toRadians(deg) {
    return deg * (Math.PI / 180);
}

// --- 4. INTERAKSI DENGAN ENJIN PETA & ROUTING OFFLINE (Tempat Implementasi Utama) ---

/**
 * [TEMPAT IMPLEMENTASI]
 * Melakukan carian lokasi/alamat secara offline.
 * Ini memerlukan indeks data POI/alamat anda sendiri.
 * @param {string} query - Query carian.
 * @returns {Promise<Array<{lat: number, lng: number, name: string}>>} Hasil carian.
 */
async function searchOfflineLocation(query) {
    console.log(`[Carian Offline] Mencari: ${query}`);
    // --- LOGIK CARIAN OFFLINE ANDA DI SINI ---
    // Ini akan melibatkan:
    // 1. Memuatkan indeks POI/alamat dari IndexedDB/local storage.
    // 2. Melakukan pencarian fuzzy atau substring matching.
    // 3. Mengembalikan senarai cadangan.
    // Untuk prototaip, kita boleh kembalikan hasil dummy.
    return new Promise(resolve => {
        setTimeout(() => {
            const results = [
                { lat: 3.1578, lng: 101.7119, name: "KLCC, Kuala Lumpur" },
                { lat: 2.9774, lng: 101.5501, name: "Banting, Selangor" },
                { lat: 3.14, lng: 101.69, name: `Lokasi Carian untuk '${query}'` }
            ].filter(item => item.name.toLowerCase().includes(query.toLowerCase()));
            resolve(results);
        }, 500);
    });
}

/**
 * [TEMPAT IMPLEMENTASI]
 * Menghitung laluan secara offline.
 * Ini memerlukan enjin routing offline anda (WebAssembly/JS) dan data graf.
 * @param {[number, number]} origin - Titik mula [lat, lng].
 * @param {[number, number]} destinationCoords - Titik destinasi [lat, lng].
 * @returns {Promise<Array<{lat: number, lng: number, instruction: string}>>} Senarai langkah-langkah laluan.
 */
async function calculateOfflineRoute(origin, destinationCoords) {
    console.log(`[Routing Offline] Menghitung laluan dari ${origin} ke ${destinationCoords}`);
    // --- LOGIK ROUTING OFFLINE ANDA DI SINI ---
    // Ini akan melibatkan:
    // 1. Memuatkan graf routing dari IndexedDB/local storage.
    // 2. Menjalankan algoritma routing (Dijkstra, A*, dsb.) pada graf tersebut.
    // 3. Mengembalikan senarai langkah-langkah navigasi.
    // Untuk prototaip, kita boleh kembalikan laluan dummy.
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            if (origin && destinationCoords) {
                const dummyRoute = [
                    { lat: origin[0], lng: origin[1], instruction: "Mula perjalanan." },
                    { lat: (origin[0] + destinationCoords[0]) / 2 + 0.005, lng: (origin[1] + destinationCoords[1]) / 2, instruction: "Terus lurus sejauh 500m." },
                    { lat: (origin[0] + destinationCoords[0]) / 2 - 0.005, lng: (origin[1] + destinationCoords[1]) / 2 + 0.005, instruction: "Belok kiri di persimpangan utama." },
                    { lat: destinationCoords[0], lng: destinationCoords[1], instruction: "Anda telah sampai ke destinasi." }
                ];
                resolve(dummyRoute);
            } else {
                reject(new Error("Titik mula atau destinasi tidak sah untuk routing offline."));
            }
        }, 1500); // Simulasi kelewatan pengiraan
    });
}

/**
 * [TEMPAT IMPLEMENTASI]
 * Memuat turun data peta offline untuk kawasan tertentu.
 * @param {string} areaIdentifier - Pengenal pasti kawasan (contoh: "Malaysia", "Kuala Lumpur").
 * @returns {Promise<boolean>} Resolves true jika berjaya muat turun.
 */
async function downloadOfflineMapData(areaIdentifier) {
    console.log(`[Data Offline] Memuat turun data peta untuk ${areaIdentifier}...`);
    // --- LOGIK MUAT TURUN & PENYIMPANAN DATA OFFLINE ANDA DI SINI ---
    // Ini akan melibatkan:
    // 1. Membuat permintaan ke server anda untuk paket data OSM/vector tiles/routing graph.
    // 2. Menyimpan data tersebut ke IndexedDB atau Cache API.
    // Ini adalah operasi yang sangat kompleks dan memerlukan backend.
    return new Promise(resolve => {
        setTimeout(() => {
            console.log(`[Data Offline] Data untuk ${areaIdentifier} berjaya dimuat turun (simulasi).`);
            alert(`Peta untuk ${areaIdentifier} telah berjaya dimuat turun (simulasi)!`);
            resolve(true);
        }, 3000); // Simulasi kelewatan muat turun
    });
}

// --- 5. FUNGSI KEMAS KINI UI ---

/**
 * Mengemas kini paparan jarak dan arahan pada UI.
 * @param {number} distance - Jarak baki ke titik akhir langkah semasa.
 * @param {string} instruction - Arahan navigasi untuk langkah semasa.
 */
function updateUI(distance, instruction) {
    const distanceEl = document.getElementById('distance-display');
    const instructionEl = document.getElementById('instruction-display');
    const statusBarEl = document.getElementById('status-bar');
    const arrowEl = document.getElementById('navigation-arrow');

    if (distanceEl) distanceEl.textContent = `${Math.round(distance)} m lagi`;
    if (instructionEl) instructionEl.textContent = `• ${instruction}`;

    // Kemas kini warna status bar
    if (statusBarEl) {
        statusBarEl.classList.remove('status-green', 'status-yellow', 'status-red');
        if (distance <= 50) {
            statusBarEl.classList.add('status-red');
        } else if (distance <= 300) {
            statusBarEl.classList.add('status-yellow');
        } else {
            statusBarEl.classList.add('status-green');
        }
    }

    // Kemas kini anak panah - perlu logik yang lebih kompleks untuk orientasi sebenar
    // Untuk permulaan, kita boleh tetapkan secara manual atau berdasarkan perkataan kunci
    if (arrowEl) {
        // Ini adalah dummy, perlu logika yang mengaitkan dengan arah belok yang tepat
        arrowEl.classList.remove('arrow-straight', 'arrow-left', 'arrow-right');
        if (instruction.toLowerCase().includes("kiri")) {
            arrowEl.classList.add('arrow-left');
        } else if (instruction.toLowerCase().includes("kanan")) {
            arrowEl.classList.add('arrow-right');
        } else {
            arrowEl.classList.add('arrow-straight');
        }
    }
}

/**
 * Menampilkan atau menyembunyikan mesej AI Gemini (kini hanya mesej navigasi generik)
 * @param {string} message - Mesej untuk dipaparkan. Kosongkan untuk menyembunyikan.
 */
function displayGeminiMessage(message) {
    const geminiEl = document.getElementById('gemini-message');
    const geminiTextEl = geminiEl.querySelector('p'); // Anggap teks dalam tag p

    if (geminiEl && geminiTextEl) {
        if (message) {
            geminiTextEl.textContent = message;
            geminiEl.style.display = 'flex'; // Paparkan sebagai flex
            // Setelah beberapa saat, sembunyikan secara automatik
            setTimeout(() => {
                geminiEl.style.display = 'none';
            }, 5000); // Sembunyi selepas 5 saat
        } else {
            geminiEl.style.display = 'none';
        }
    }
}

/**
 * Menghentikan navigasi dan membersihkan UI.
 */
function stopNavigation() {
    if (navigationUpdateInterval) {
        clearInterval(navigationUpdateInterval);
        navigationUpdateInterval = null;
    }
    currentRoute = [];
    currentStepIndex = 0;
    currentPosition = null;
    currentDestination = "";
    // Hentikan rendering laluan pada peta (perlu diimplementasi untuk Maplibre)
    // mapInstance.removeLayer('route-line');
    // mapInstance.removeSource('route-line');
    
    updateUI(0, "Navigasi Tamat.");
    displayGeminiMessage(""); // Kosongkan mesej
    const statusBarEl = document.getElementById('status-bar');
    if (statusBarEl) {
        statusBarEl.classList.remove('status-green', 'status-yellow', 'status-red');
        statusBarEl.classList.add('status-green'); // Balik ke hijau atau warna default
    }
    console.log("Navigasi telah dihentikan.");
}

// --- 6. LOGIK NAVIGASI UTAMA ---

/**
 * Memulakan proses navigasi sebenar.
 * Ini akan menggunakan enjin routing offline.
 */
async function startNavigation() {
    stopNavigation(); // Hentikan navigasi sebelumnya jika ada
    
    // 1. Dapatkan lokasi semasa
    try {
        currentPosition = await getCurrentLocation();
        console.log("Lokasi Semasa:", currentPosition);
    } catch (err) {
        alert(err.message);
        return;
    }

    // 2. Dapatkan koordinat destinasi dari input carian (perlu diselesaikan dengan carian offline)
    // Untuk demo, kita akan gunakan destinasi dummy
    let destinationCoords = null;
    if (currentDestination === "KLCC") {
        destinationCoords = [3.1578, 101.7119];
    } else if (currentDestination === "Banting") {
        destinationCoords = [2.9774, 101.5501];
    } else {
        // Carian offline akan mengembalikan koordinat sebenar
        const searchResults = await searchOfflineLocation(currentDestination);
        if (searchResults.length > 0) {
            destinationCoords = [searchResults[0].lat, searchResults[0].lng];
            console.log("Destinasi Carian:", searchResults[0].name, destinationCoords);
            displayGeminiMessage(`Mula navigasi ke ${searchResults[0].name}!`);
        } else {
            alert(`Destinasi '${currentDestination}' tidak dijumpai secara offline.`);
            return;
        }
    }
    
    if (!destinationCoords) {
        alert("Destinasi tidak valid.");
        return;
    }

    // 3. Kira laluan secara offline
    try {
        currentRoute = await calculateOfflineRoute(currentPosition, destinationCoords);
        currentStepIndex = 0;
        console.log(`Laluan dijumpai! Ada ${currentRoute.length} langkah.`);
        displayGeminiMessage(`Laluan dikira. Mari kita bergerak!`);

        // [TEMPAT IMPLEMENTASI]
        // Paparkan laluan pada peta menggunakan Maplibre GL JS
        // Contoh:
        // mapInstance.addSource('route-line', {
        //     'type': 'geojson',
        //     'data': {
        //         'type': 'Feature',
        //         'properties': {},
        //         'geometry': {
        //             'type': 'LineString',
        //             'coordinates': currentRoute.map(step => [step.lng, step.lat])
        //         }
        //     }
        // });
        // mapInstance.addLayer({
        //     'id': 'route-line',
        //     'type': 'line',
        //     'source': 'route-line',
        //     'layout': {
        //         'line-join': 'round',
        //         'line-cap': 'round'
        //     },
        //     'paint': {
        //         'line-color': '#00FFFF',
        //         'line-width': 6
        //     }
        // });


        // Mulakan loop navigasi
        navigationUpdateInterval = setInterval(async () => {
            if (currentStepIndex >= currentRoute.length) {
                alert("Anda telah sampai ke destinasi!");
                stopNavigation();
                return;
            }

            const step = currentRoute[currentStepIndex];
            const targetLat = step.lat;
            const targetLng = step.lng;

            try {
                currentPosition = await getCurrentLocation(); // Update lokasi secara real-time
                const dist = haversine(currentPosition[0], currentPosition[1], targetLat, targetLng);
                
                updateUI(dist, step.instruction);
                
                // [TEMPAT IMPLEMENTASI]
                // Kemas kini penanda lokasi pengguna pada peta Maplibre GL JS
                // mapInstance.getSource('user-location').setData({
                //    'type': 'Feature',
                //    'geometry': {
                //        'type': 'Point',
                //        'coordinates': [currentPosition[1], currentPosition[0]]
                //    }
                // });
                // mapInstance.panTo([currentPosition[1], currentPosition[0]]); // Ikuti pengguna

                // Jika sudah sampai ke simpang ini (radius 30m)
                if (dist < 30) {
                    console.log(`Langkah selesai: ${step.instruction}`);
                    currentStepIndex++;
                    if (currentStepIndex < currentRoute.length) {
                        displayGeminiMessage(`Langkah seterusnya: ${currentRoute[currentStepIndex].instruction}`);
                    }
                }

            } catch (err) {
                console.error("Ralat dalam loop navigasi:", err);
                displayGeminiMessage(`Ralat navigasi: ${err.message}`);
            }
        }, 2000); // Refresh setiap 2 saat
    } catch (err) {
        console.error("Ralat permulaan navigasi:", err);
        alert(`Gagal memulakan navigasi: ${err.message}`);
        stopNavigation();
    }
}


// --- 7. INICIALISASI PETA & EVENT LISTENERS ---

/**
 * [TEMPAT IMPLEMENTASI]
 * Fungsi inisialisasi peta utama.
 * Akan menggantikan Google Maps initMap dengan Maplibre GL JS.
 */
function initOfflineMap() {
    console.log("Menginisialisasi peta offline dengan Maplibre GL JS...");
    
    // Pastikan Maplibre GL JS dimuatkan (perlu tambah script tag di index.html)
    if (typeof maplibregl === 'undefined') {
        console.error("Maplibre GL JS tidak dimuatkan. Sila pastikan script tagnya ada di index.html.");
        return;
    }

    mapInstance = new maplibregl.Map({
        container: 'map', // ID elemen HTML untuk peta
        style: OFFLINE_STYLE_URL, // URL ke gaya peta anda (akan menjana dari vector tiles)
        center: [101.69, 3.14], // Longitude, Latitude - Pusat KL sebagai default
        zoom: 15,
        attributionControl: false // Sembunyikan atribusi lalai jika tidak mahu
    });

    mapInstance.on('load', () => {
        console.log("Peta Maplibre GL JS dimuatkan.");
        // [TEMPAT IMPLEMENTASI]
        // Tambah sumber dan layer untuk lokasi pengguna
        // mapInstance.addSource('user-location', {
        //     'type': 'geojson',
        //     'data': {
        //         'type': 'FeatureCollection',
        //         'features': []
        //     }
        // });
        // mapInstance.addLayer({
        //     'id': 'user-location-layer',
        //     'type': 'circle',
        //     'source': 'user-location',
        //     'paint': {
        //         'circle-radius': 8,
        //         'circle-color': '#00A8FF',
        //         'circle-stroke-color': '#FFFFFF',
        //         'circle-stroke-width': 2
        //     }
        // });
    });

    // Menambah event listener untuk butang tutup mesej Gemini
    document.querySelector('.close-gemini').addEventListener('click', () => {
        displayGeminiMessage(""); // Sembunyikan mesej
    });

    // Menambah event listener untuk input carian
    const searchInput = document.getElementById('search-input');
    searchInput.addEventListener('keypress', async (e) => {
        if (e.key === 'Enter') {
            const query = searchInput.value;
            if (query) {
                const results = await searchOfflineLocation(query);
                if (results.length > 0) {
                    currentDestination = results[0].name; // Set destinasi yang dipilih
                    // Gerakkan peta ke lokasi carian pertama
                    mapInstance.flyTo({
                        center: [results[0].lng, results[0].lat],
                        zoom: 15
                    });
                    displayGeminiMessage(`Mencari laluan ke ${results[0].name}...`);
                    startNavigation(); // Mula navigasi ke lokasi yang dicari
                } else {
                    alert(`Tiada hasil carian untuk '${query}' secara offline.`);
                }
            } else {
                alert("Sila masukkan lokasi untuk carian.");
            }
        }
    });

    // Event listener untuk butang "Muat Dorn Laluan Ini"
    document.getElementById('download-route-button').addEventListener('click', () => {
        // Untuk demo, kita boleh muat turun data peta untuk kawasan "Kuala Lumpur"
        downloadOfflineMapData("Kuala Lumpur");
    });

    // Event listener untuk butang "Kira Semula Laluan"
    document.getElementById('recalculate-route-button').addEventListener('click', () => {
        if (currentPosition && currentDestination) {
            displayGeminiMessage("Mengira semula laluan...");
            startNavigation(); // Kira semula laluan dari lokasi semasa ke destinasi asal
        } else {
            alert("Tiada navigasi aktif untuk dikira semula.");
        }
    });

    // Event listener untuk toggle mod luar talian
    document.getElementById('offline-mode-checkbox').addEventListener('change', (event) => {
        isOfflineMode = event.target.checked;
        console.log(`Mod Luar Talian: ${isOfflineMode ? 'Aktif' : 'Tidak Aktif'}`);
        displayGeminiMessage(`Mod Luar Talian ${isOfflineMode ? 'diaktifkan' : 'dimatikan'}.`);
        // Anda boleh menambah logik di sini untuk menukar sumber peta
        // Contoh: mapInstance.setStyle(isOfflineMode ? OFFLINE_STYLE_URL : ONLINE_STYLE_URL);
    });
}

// Panggil inisialisasi peta offline apabila DOM sedia
document.addEventListener('DOMContentLoaded', initOfflineMap);
