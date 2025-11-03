// Telegram Web App API
const tg = window.Telegram.WebApp;
tg.expand();
tg.ready();

// Глобальные переменные
let map = null;
let userPlacemark = null;
let wifiPoints = [];
let placemarks = [];
let currentPoint = null;

// Координаты центра Омска
const OMSK_CENTER = [54.9885, 73.3242];

// Скрыть Splash Screen после загрузки
function hideSplashScreen() {
    const splash = document.getElementById('splash-screen');
    if (splash) {
        setTimeout(() => {
            splash.style.display = 'none';
        }, 3000); // Скрыть через 3 секунды
    }
}

// Инициализация приложения
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Скрываем splash screen
        hideSplashScreen();

        // Загружаем точки Wi-Fi
        await loadWifiPoints();

        // Инициализируем карту
        ymaps.ready(initMap);

        // Инициализируем обработчики событий
        initEventHandlers();
    } catch (error) {
        console.error('Ошибка при инициализации:', error);
        hideLoading();
        showError('Ошибка загрузки приложения');
    }
});

// Загрузка точек Wi-Fi
async function loadWifiPoints() {
    try {
        const response = await fetch('wifi-points.json');
        wifiPoints = await response.json();
        updatePointsCount();
    } catch (error) {
        console.error('Ошибка загрузки точек Wi-Fi:', error);
        // Используем демонстрационные данные
        wifiPoints = getDemoWifiPoints();
        updatePointsCount();
    }
}

// Инициализация карты
function initMap() {
    map = new ymaps.Map('map', {
        center: OMSK_CENTER,
        zoom: 12,
        controls: ['zoomControl', 'typeSelector']
    }, {
        searchControlProvider: 'yandex#search'
    });

    // Добавляем точки Wi-Fi на карту
    addWifiPointsToMap();

    // Скрываем индикатор загрузки
    hideLoading();

    // Пытаемся получить текущее местоположение
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            position => {
                const coords = [position.coords.latitude, position.coords.longitude];
                addUserLocation(coords);
                map.setCenter(coords, 13, { duration: 300 });
            },
            error => {
                console.log('Геолокация недоступна:', error);
            }
        );
    }
}

// Добавление точек Wi-Fi на карту
function addWifiPointsToMap() {
    wifiPoints.forEach(point => {
        const placemark = new ymaps.Placemark(
            point.coordinates,
            {
                balloonContent: createBalloonContent(point),
                hintContent: point.name
            },
            {
                preset: 'islands#blueWiFiIcon',
                iconColor: '#2481cc'
            }
        );

        placemark.events.add('click', () => {
            showInfoPanel(point);
        });

        map.geoObjects.add(placemark);
        placemarks.push({ placemark, point });
    });
}

// Создание содержимого балуна
function createBalloonContent(point) {
    return `
        <div style="padding: 10px; max-width: 250px;">
            <h3 style="margin: 0 0 10px 0; font-size: 16px;">${point.name}</h3>
            <p style="margin: 5px 0;"><strong>📍 Адрес:</strong><br/>${point.address}</p>
            <p style="margin: 5px 0;"><strong>📡 Сеть:</strong> ${point.ssid}</p>
            <p style="margin: 5px 0;"><strong>🔐 Пароль:</strong> <code style="background: #f0f0f0; padding: 2px 6px; border-radius: 4px;">${point.password}</code></p>
        </div>
    `;
}

// Добавление метки пользователя
function addUserLocation(coords) {
    if (userPlacemark) {
        map.geoObjects.remove(userPlacemark);
    }

    userPlacemark = new ymaps.Placemark(
        coords,
        {
            hintContent: 'Вы здесь'
        },
        {
            preset: 'islands#redDotIcon'
        }
    );

    map.geoObjects.add(userPlacemark);
}

// Показ панели информации
function showInfoPanel(point) {
    currentPoint = point;

    document.getElementById('info-name').textContent = point.name;
    document.getElementById('info-address').textContent = point.address;
    document.getElementById('info-ssid').textContent = point.ssid;
    document.getElementById('info-password').textContent = point.password;

    if (point.description) {
        document.getElementById('info-description').textContent = point.description;
        document.getElementById('info-description-container').style.display = 'block';
    } else {
        document.getElementById('info-description-container').style.display = 'none';
    }

    const panel = document.getElementById('info-panel');
    panel.classList.remove('hidden');
}

// Скрытие панели информации
function hideInfoPanel() {
    const panel = document.getElementById('info-panel');
    panel.classList.add('hidden');
    currentPoint = null;
}

// Инициализация обработчиков событий
function initEventHandlers() {
    // Закрытие панели информации
    document.getElementById('close-panel').addEventListener('click', hideInfoPanel);

    // Копирование пароля
    document.getElementById('copy-password').addEventListener('click', () => {
        if (currentPoint) {
            copyToClipboard(currentPoint.password);
            tg.showPopup({
                title: 'Скопировано!',
                message: 'Пароль скопирован в буфер обмена',
                buttons: [{ type: 'ok' }]
            });
        }
    });

    // Построение маршрута
    document.getElementById('navigate-btn').addEventListener('click', () => {
        if (currentPoint) {
            const coords = currentPoint.coordinates;
            const url = `https://yandex.ru/maps/?rtext=~${coords[0]},${coords[1]}&rtt=auto`;
            window.open(url, '_blank');
        }
    });

    // Моё местоположение
    document.getElementById('my-location-btn').addEventListener('click', () => {
        if (navigator.geolocation) {
            showLoading();
            navigator.geolocation.getCurrentPosition(
                position => {
                    const coords = [position.coords.latitude, position.coords.longitude];
                    addUserLocation(coords);
                    map.setCenter(coords, 15, { duration: 500 });
                    hideLoading();
                },
                error => {
                    hideLoading();
                    tg.showAlert('Не удалось определить ваше местоположение');
                }
            );
        } else {
            tg.showAlert('Геолокация не поддерживается вашим устройством');
        }
    });

    // Поиск
    const searchInput = document.getElementById('search-input');
    const searchResults = document.getElementById('search-results');

    searchInput.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase().trim();

        if (query.length < 2) {
            searchResults.classList.add('hidden');
            return;
        }

        const filtered = wifiPoints.filter(point =>
            point.name.toLowerCase().includes(query) ||
            point.address.toLowerCase().includes(query) ||
            point.ssid.toLowerCase().includes(query)
        );

        if (filtered.length > 0) {
            displaySearchResults(filtered);
        } else {
            searchResults.classList.add('hidden');
        }
    });

    // Клик вне области поиска закрывает результаты
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.search-container') && !e.target.closest('.search-results')) {
            searchResults.classList.add('hidden');
        }
    });
}

// Отображение результатов поиска
function displaySearchResults(results) {
    const searchResults = document.getElementById('search-results');
    searchResults.innerHTML = results.slice(0, 10).map(point => `
        <div class="search-result-item" data-id="${point.id}">
            <div class="search-result-name">${point.name}</div>
            <div class="search-result-address">${point.address}</div>
        </div>
    `).join('');

    searchResults.classList.remove('hidden');

    // Обработчики кликов на результаты
    searchResults.querySelectorAll('.search-result-item').forEach(item => {
        item.addEventListener('click', () => {
            const id = parseInt(item.dataset.id);
            const point = wifiPoints.find(p => p.id === id);
            if (point) {
                map.setCenter(point.coordinates, 16, { duration: 500 });
                showInfoPanel(point);
                searchResults.classList.add('hidden');
                document.getElementById('search-input').value = '';
            }
        });
    });
}

// Обновление счетчика точек
function updatePointsCount() {
    document.getElementById('points-count').textContent = `${wifiPoints.length} точек`;
}

// Показать индикатор загрузки
function showLoading() {
    document.getElementById('loading').classList.remove('hidden');
}

// Скрыть индикатор загрузки
function hideLoading() {
    document.getElementById('loading').classList.add('hidden');
}

// Показать ошибку
function showError(message) {
    tg.showAlert(message);
}

// Копирование в буфер обмена
function copyToClipboard(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text);
    } else {
        // Fallback для старых браузеров
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
    }
}

// Демонстрационные данные (если файл не загружен)
function getDemoWifiPoints() {
    return [
        {
            id: 1,
            name: 'Библиотека им. Пушкина',
            address: 'ул. Красный Путь, 3',
            coordinates: [54.9849, 73.3674],
            ssid: 'Library_Free_WiFi',
            password: 'books2024',
            description: 'Бесплатный Wi-Fi в читальном зале'
        },
        {
            id: 2,
            name: 'Парк Победы',
            address: 'ул. Маршала Жукова, 100',
            coordinates: [54.9891, 73.3242],
            ssid: 'Park_Pobedy_WiFi',
            password: 'victory1945',
            description: 'Wi-Fi в центральной части парка'
        },
        {
            id: 3,
            name: 'ТЦ Каскад',
            address: 'просп. Карла Маркса, 18',
            coordinates: [54.9837, 73.3789],
            ssid: 'Kaskad_Guest',
            password: 'kaskad_free',
            description: 'Гостевая сеть торгового центра'
        },
        {
            id: 4,
            name: 'Омский ж/д вокзал',
            address: 'ул. Красный Путь, 2',
            coordinates: [54.9726, 73.3954],
            ssid: 'RZD_WiFi',
            password: 'rzd2024omsk',
            description: 'Бесплатный Wi-Fi на вокзале'
        },
        {
            id: 5,
            name: 'Кофейня "Чашка"',
            address: 'ул. Ленина, 22',
            coordinates: [54.9931, 73.3682],
            ssid: 'Chashka_Coffee',
            password: 'coffee123',
            description: 'Wi-Fi для посетителей кофейни'
        },
        {
            id: 6,
            name: 'Сквер им. 30-летия ВЛКСМ',
            address: 'ул. 10 лет Октября',
            coordinates: [54.9756, 73.3842],
            ssid: 'Square_Free',
            password: 'vlksm30',
            description: 'Открытая точка доступа в сквере'
        },
        {
            id: 7,
            name: 'Драмтеатр',
            address: 'ул. Ленина, 8А',
            coordinates: [54.9918, 73.3689],
            ssid: 'Theater_Guest',
            password: 'drama2024',
            description: 'Wi-Fi в фойе театра'
        },
        {
            id: 8,
            name: 'Спортивный комплекс "Арена Омск"',
            address: 'ул. 70 лет Октября, 25',
            coordinates: [54.9512, 73.3845],
            ssid: 'Arena_Omsk_WiFi',
            password: 'sport2024',
            description: 'Гостевая сеть спорткомплекса'
        },
        {
            id: 9,
            name: 'Торговый центр "Мега"',
            address: 'Московка-2',
            coordinates: [54.9278, 73.4876],
            ssid: 'MEGA_Free_WiFi',
            password: 'megaomsk',
            description: 'Бесплатный Wi-Fi в ТЦ'
        },
        {
            id: 10,
            name: 'Набережная Иртыша',
            address: 'Набережная Тухачевского',
            coordinates: [54.9894, 73.3598],
            ssid: 'Irtysh_Public',
            password: 'river2024',
            description: 'Публичная точка на набережной'
        }
    ];
}