// ===============================================
// script.js - Logik Utama Aplikasi Navigasi
// ===============================================

// --- 1. KONFIGURASI (Ganti dengan cara yang lebih selamat untuk produksi) ---
// *PENTING*: JANGAN DEDAHKAN API KEYS SECARA LANGSUNG DALAM KOD FRONTEND UNTUK PRODUKSI.
// Gunakan server backend atau pemboleh ubah persekitaran yang selamat.
const GOOGLE_MAPS_KEY = "MASUKKAN_API_KEY_MAPS_ANDA"; // Ganti dengan kunci API anda
const GEMINI_API_KEY = "MASUKKAN_API_KEY_GEMINI_ANDA"; // Ganti dengan kunci API anda

// --- 2. PEMBOLEH UBAH GLOBAL ---
let map;
let directionsService;
let directionsRenderer;
let currentPosition = null; // [lat, lng]
let destination = "";
let currentSteps = [];
let currentStepIndex = 0;
let navigationInterval = null; // Untuk clearInterval
let geminiPromptPending = false; // Untuk mengelakkan spam Gemini API

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
                    reject(new Error("Gagal mendapatkan lokasi GPS."));
                },
                { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
            );
        } else {
            console.error("Geolocation tidak disokong oleh browser ini.");
            reject(new Error("Geolocation tidak disokong."));
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

// --- 4. INTERAKSI DENGAN API LUARAN ---

/**
 * Mendapatkan arahan navigasi dari Google Maps Directions API.
 * @param {[number, number]} origin - Titik mula [lat, lng].
 * @param {string} destination - Destinasi (alamat atau nama tempat).
 * @returns {Promise<google.maps.DirectionsResult>} Resolves dengan objek DirectionsResult.
 */
async function getDirections(origin, destination) {
    const request = {
        origin: { lat: origin[0], lng: origin[1] },
        destination: destination,
        travelMode: google.maps.TravelMode.DRIVING
    };

    return new Promise((resolve, reject) => {
        directionsService.route(request, (result, status) => {
            if (status === google.maps.DirectionsStatus.OK) {
                resolve(result);
            } else {
                reject(new Error(`Gagal mendapatkan arah: ${status}`));
            }
        });
    });
}

/**
 * Menghantar arahan ke Gemini AI untuk mendapatkan amaran navigasi ringkas.
 * @param {string} instruction - Arahan navigasi mentah.
 * @returns {Promise<string>} Resolves dengan amaran dari Gemini atau string lalai.
 */
async function getGeminiWarning(instruction) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;
    const payload = {
        contents: [{
            parts: [{ text: `Berikan amaran navigasi ringkas dan santai (Bahasa Melayu) untuk arahan ini: ${instruction}` }]
        }]
    };

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });
        const data = await response.json();
        return data.candidates[0].content.parts[0].text;
    } catch (error) {
        console.error("Ralat memanggil Gemini API:", error);
        return `Sedia! ${instruction}`; // Fallback message
    }
}

// --- 5. FUNGSI KEMAS KINI UI ---

/**
 * Mengemas kini paparan jarak dan arahan pada UI.
 * @param {number} distance - Jarak baki ke titik akhir langkah semasa.
 * @param {string} instruction - Arahan navigasi untuk langkah semasa.
 * @param {string} geminiMessage - Mesej tambahan dari Gemini (jika ada).
 */
function updateUI(distance, instruction, geminiMessage = "") {
    const distanceEl = document.getElementById('distance-display');
    const instructionEl = document.getElementById('instruction-display');
    const geminiEl = document.getElementById('gemini-message'); // Jika anda ingin paparkan mesej Gemini
    const statusBarEl = document.getElementById('status-bar'); // Bar status berwarna
    const arrowEl = document.getElementById('navigation-arrow'); // Anak panah

    if (distanceEl) distanceEl.textContent = `${Math.round(distance)} m lagi`;
    if (instructionEl) instructionEl.textContent = `• ${instruction.replace(/<[^>]*>?/gm, '')}`; // Buang tag HTML

    // Paparkan mesej Gemini jika ada
    if (geminiEl) {
        geminiEl.textContent = geminiMessage;
        geminiEl.style.display = geminiMessage ? 'block' : 'none'; // Tunjuk/sembunyi
    }

    // Kemas kini warna status bar
    if (statusBarEl) {
        statusBarEl.classList.remove('status-green', 'status-yellow', 'status-red'); // Buang semua kelas sedia ada
        if (distance <= 50) { // Sangat dekat, mungkin perlu berhenti atau persimpangan kompleks
            statusBarEl.classList.add('status-red'); // Contoh untuk "berhenti / sangat dekat"
        } else if (distance <= 300) { // Hati-hati, sudah dekat dengan belokan
            statusBarEl.classList.add('status-yellow');
        } else { // Jalan biasa, jarak masih jauh
            statusBarEl.classList.add('status-green');
        }
    }

    // Anda mungkin perlu logik yang lebih kompleks untuk putaran anak panah berdasarkan 'maneuver' Google Maps
    // Buat masa ini, kita biarkan ia tunjuk ke hadapan atau mengikut belokan
    if (arrowEl) {
        // Contoh: Set kelas CSS untuk rotasi. Anda perlu CSS yang sesuai.
        // arrowEl.classList.remove('arrow-straight', 'arrow-left', 'arrow-right');
        // if (instruction.includes("left")) {
        //     arrowEl.classList.add('arrow-left');
        // } else if (instruction.includes("right")) {
        //     arrowEl.classList.add('arrow-right');
        // } else {
        //     arrowEl.classList.add('arrow-straight');
        // }
    }
}

/**
 * Menghentikan navigasi dan membersihkan UI.
 */
function stopNavigation() {
    if (navigationInterval) {
        clearInterval(navigationInterval);
        navigationInterval = null;
    }
    currentSteps = [];
    currentStepIndex = 0;
    currentPosition = null;
    directionsRenderer.setDirections({ routes: [] }); // Kosongkan paparan laluan
    updateUI(0, "Navigasi Tamat.", ""); // Kemas kini UI ke keadaan tamat
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
 */
async function startNavigation() {
    stopNavigation(); // Hentikan navigasi sebelumnya jika ada
    geminiPromptPending = false; // Reset status Gemini

    try {
        currentPosition = await getCurrentLocation();
        console.log("Lokasi Semasa:", currentPosition);

        const directionsResult = await getDirections(currentPosition, destination);
        console.log("Arah Diterima:", directionsResult);

        // Paparkan laluan pada peta
        directionsRenderer.setDirections(directionsResult);

        currentSteps = directionsResult.routes[0].legs[0].steps;
        currentStepIndex = 0;
        console.log(`Laluan dijumpai! Ada ${currentSteps.length} langkah.`);

        // Mulakan loop navigasi
        navigationInterval = setInterval(async () => {
            if (currentStepIndex >= currentSteps.length) {
                alert("Anda telah sampai ke destinasi!");
                stopNavigation();
                return;
            }

            const step = currentSteps[currentStepIndex];
            const targetLat = step.end_location.lat();
            const targetLng = step.end_location.lng();

            try {
                currentPosition = await getCurrentLocation(); // Update lokasi secara real-time
                const dist = haversine(currentPosition[0], currentPosition[1], targetLat, targetLng);
                let geminiMsg = "";

                // Trigger Gemini jika jarak semakin dekat dan belum dipicu untuk langkah ini
                if (dist < 300 && !geminiPromptPending) {
                    geminiPromptPending = true; // Elak memicu berkali-kali
                    console.log("Memicu Gemini untuk amaran...");
                    geminiMsg = await getGeminiWarning(step.html_instructions);
                    console.log("[GEMINI BERKATA]:", geminiMsg);
                    // Paparkan mesej Gemini serta-merta
                    updateUI(dist, step.html_instructions, geminiMsg);
                } else {
                    updateUI(dist, step.html_instructions);
                }


                // Jika sudah sampai ke simpang ini (radius 30m)
                if (dist < 30) {
                    console.log(`Simpang selesai: ${step.html_instructions}`);
                    currentStepIndex++;
                    geminiPromptPending = false; // Reset untuk langkah seterusnya
                    if (currentStepIndex < currentSteps.length) {
                        // Clear Gemini message as we move to the next step
                        updateUI(dist, currentSteps[currentStepIndex].html_instructions, "");
                    }
                }

            } catch (err) {
                console.error("Ralat dalam loop navigasi:", err);
                // Mungkin cuba dapatkan lokasi semula atau paparkan ralat kepada pengguna
            }
        }, 2000); // Refresh setiap 2 saat
    } catch (err) {
        console.error("Ralat permulaan navigasi:", err);
        alert(`Gagal memulakan navigasi: ${err.message}`);
        stopNavigation();
    }
}


// --- 7. INICIALISASI PETA GOOGLE (Dipanggil oleh API Maps) ---

function initMap() {
    map = new google.maps.Map(document.getElementById("map"), {
        center: { lat: 3.14, lng: 101.69 }, // Pusat KL sebagai default
        zoom: 15,
        mapTypeId: "roadmap",
        disableDefaultUI: true // Opsional: untuk UI yang lebih bersih
    });

    directionsService = new google.maps.DirectionsService();
    directionsRenderer = new google.maps.DirectionsRenderer({
        map: map,
        suppressMarkers: true, // Tidak menunjukkan penanda lalai Google
        polylineOptions: {
            strokeColor: '#00FFFF', // Warna laluan (cyan)
            strokeOpacity: 0.8,
            strokeWeight: 6
        }
    });

    console.log("Google Map diinisialisasi.");

    // Tambahkan event listener untuk input destinasi
    const destinationInput = document.getElementById('destination-input');
    const startNavButton = document.getElementById('start-nav-button');

    if (destinationInput && startNavButton) {
        startNavButton.addEventListener('click', () => {
            destination = destinationInput.value;
            if (destination) {
                startNavigation();
            } else {
                alert("Sila masukkan destinasi.");
            }
        });
    } else {
        console.error("Elemen input destinasi atau butang mula navigasi tidak dijumpai.");
    }
}

// Global hook for Google Maps API callback
window.initMap = initMap;
