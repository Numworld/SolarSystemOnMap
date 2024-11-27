// 初始化地图
var map = L.map('map').setView([39.9042, 116.4074], 13);

// 添加地图图层
L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
}).addTo(map);

// 存储两个点的信息
let points = [];
let markers = [];
let connectionLine = null;
let planetMarkers = [];

// 添加太阳系行星数据（距离太阳的平均距离，单位：百万公里）
const planets = [
    { name: '水星', distance: 57.9 },
    { name: '金星', distance: 108.2 },
    { name: '地球', distance: 149.6 },
    { name: '火星', distance: 227.9 },
    { name: '木星', distance: 778.5 },
    { name: '土星', distance: 1434.0 },
    { name: '天王星', distance: 2871.0 },
    { name: '海王星', distance: 4495.0 }
];

// 计算两点之间的距离（单位：公里）
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // 地球半径（公里）
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
            Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}

// 计算两点之间的方位角（单位：弧度）
function calculateBearing(lat1, lon1, lat2, lon2) {
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const y = Math.sin(Δλ) * Math.cos(φ2);
    const x = Math.cos(φ1) * Math.sin(φ2) -
             Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
    return Math.atan2(y, x);
}

// 计算给定距离和方位角的新坐标
function calculateDestinationPoint(lat, lon, distance, bearing) {
    const R = 6371; // 地球半径（公里）
    const d = distance;
    const φ1 = lat * Math.PI / 180;
    const λ1 = lon * Math.PI / 180;
    const θ = bearing;

    const φ2 = Math.asin(Math.sin(φ1) * Math.cos(d/R) +
                        Math.cos(φ1) * Math.sin(d/R) * Math.cos(θ));
    const λ2 = λ1 + Math.atan2(Math.sin(θ) * Math.sin(d/R) * Math.cos(φ1),
                              Math.cos(d/R) - Math.sin(φ1) * Math.sin(φ2));

    return [φ2 * 180 / Math.PI, ((λ2 * 180 / Math.PI + 540) % 360) - 180];
}

// 清除所有行星标记
function clearPlanetMarkers() {
    planetMarkers.forEach(marker => map.removeLayer(marker));
    planetMarkers = [];
}

// 获取选中的行星
function getSelectedPlanets() {
    const checkboxes = document.querySelectorAll('.planet-checkbox');
    const selectedPlanets = ['地球'];
    checkboxes.forEach(checkbox => {
        if (checkbox.checked) {
            selectedPlanets.push(checkbox.dataset.planet);
        }
    });
    return selectedPlanets;
}

// 显示行星
function showPlanets(sunPos, earthPos) {
    clearPlanetMarkers();
    
    const realDistance = calculateDistance(sunPos[0], sunPos[1], earthPos[0], earthPos[1]);
    const bearing = calculateBearing(sunPos[0], sunPos[1], earthPos[0], earthPos[1]);
    const earthDistanceKm = 149.6;
    const selectedPlanets = getSelectedPlanets();

    planets.forEach(planet => {
        if (!selectedPlanets.includes(planet.name)) return;
        
        const relativeDistance = (planet.distance / earthDistanceKm) * realDistance;
        
        const [lat, lng] = calculateDestinationPoint(
            sunPos[0], 
            sunPos[1], 
            relativeDistance,
            bearing
        );

        const planetMarker = L.marker([lat, lng]).addTo(map);
        const label = `
            <div class="coordinate-content">
                <div class="coordinate-title">${planet.name}</div>
                <div class="coordinate-value">
                    距太阳: ${planet.distance.toFixed(1)}百万公里<br>
                    (比例距离: ${relativeDistance.toFixed(2)}公里)
                </div>
            </div>`;

        const popup = L.popup({
            className: 'planet-label',
            autoClose: false,
            closeButton: false,
            offset: [0, -30]
        })
        .setLatLng([lat, lng])
        .setContent(label)
        .openOn(planetMarker._map);

        popup.getElement().addEventListener('click', function(e) {
            const element = popup.getElement();
            if (element.classList.contains('popup-top')) {
                element.classList.remove('popup-top');
            } else {
                document.querySelectorAll('.leaflet-popup').forEach(el => {
                    el.classList.remove('popup-top');
                });
                element.classList.add('popup-top');
            }
            e.stopPropagation();
        });

        planetMarker.bindPopup(popup);
        planetMarkers.push(planetMarker);
    });

    const allPoints = [...markers, ...planetMarkers].map(marker => marker.getLatLng());
    if (allPoints.length > 0) {
        map.fitBounds(L.latLngBounds(allPoints), {
            padding: [50, 50]
        });
    }
}

// 清除所有点
function clearAllPoints() {
    points = [];
    markers.forEach(marker => map.removeLayer(marker));
    markers = [];
    clearPlanetMarkers();
    if (connectionLine) {
        map.removeLayer(connectionLine);
        connectionLine = null;
    }
    document.getElementById('distance').style.display = 'none';
}

// 添加事件监听
document.getElementById('clearPoints').addEventListener('click', clearAllPoints);

document.getElementById('selectAll').addEventListener('change', function(e) {
    const checkboxes = document.querySelectorAll('.planet-checkbox');
    checkboxes.forEach(checkbox => {
        checkbox.checked = e.target.checked;
    });
    if (points.length === 2) {
        showPlanets(points[0], points[1]);
    }
});

document.querySelectorAll('.planet-checkbox').forEach(checkbox => {
    checkbox.addEventListener('change', function() {
        if (points.length === 2) {
            showPlanets(points[0], points[1]);
        }
        
        const allCheckboxes = document.querySelectorAll('.planet-checkbox');
        const allChecked = Array.from(allCheckboxes).every(cb => cb.checked);
        document.getElementById('selectAll').checked = allChecked;
    });
});

// 地图点击事件处理
map.on('click', function(e) {
    const lat = e.latlng.lat;
    let lng = e.latlng.lng;
    
    let latDisplay = '';
    let lngDisplay = '';
    
    if (lat >= 0) {
        latDisplay = `北纬: ${lat.toFixed(6)}°`;
    } else {
        latDisplay = `南纬: ${Math.abs(lat).toFixed(6)}°`;
    }
    
    if (lng >= -180 && lng <= 180) {
        if (lng >= 0) {
            lngDisplay = `东经: ${lng.toFixed(6)}°`;
        } else {
            lngDisplay = `西经: ${Math.abs(lng).toFixed(6)}°`;
        }
    } else {
        lng = ((lng + 180) % 360) - 180;
        if (lng >= 0) {
            lngDisplay = `东经: ${lng.toFixed(6)}°`;
        } else {
            lngDisplay = `西经: ${Math.abs(lng).toFixed(6)}°`;
        }
    }
    
    if (points.length >= 2) {
        points = [];
        markers.forEach(marker => map.removeLayer(marker));
        markers = [];
        clearPlanetMarkers();
        if (connectionLine) {
            map.removeLayer(connectionLine);
            connectionLine = null;
        }
        document.getElementById('distance').style.display = 'none';
    }

    const marker = L.marker(e.latlng).addTo(map);
    const pointNum = points.length + 1;
    const celestialBody = pointNum === 1 ? "太阳" : "地球";
    const label = `
        <div class="coordinate-content">
            <div class="coordinate-title">${celestialBody}</div>
            <div class="coordinate-value">
                ${latDisplay}<br>
                ${lngDisplay}
                ${pointNum === 1 ? '<br>(距离: 0公里)' : ''}
            </div>
        </div>`;
    
    const popup = L.popup({
        className: 'planet-label',
        autoClose: false,
        closeButton: false,
        offset: [0, -30]
    })
    .setLatLng(e.latlng)
    .setContent(label)
    .openOn(marker._map);
    
    popup.getElement().addEventListener('click', function(e) {
        const element = popup.getElement();
        if (element.classList.contains('popup-top')) {
            element.classList.remove('popup-top');
        } else {
            document.querySelectorAll('.leaflet-popup').forEach(el => {
                el.classList.remove('popup-top');
            });
            element.classList.add('popup-top');
        }
        e.stopPropagation();
    });
    
    marker.bindPopup(popup);
    markers.push(marker);
    points.push([parseFloat(lat), parseFloat(lng)]);

    if (points.length === 2) {
        markers.forEach(marker => {
            marker.openPopup();
        });

        let linePoints = [];
        const lng1 = points[0][1];
        const lng2 = points[1][1];
        
        if (Math.abs(lng1 - lng2) > 180) {
            if (lng1 < lng2) {
                linePoints = [
                    [points[0][0], points[0][1]],
                    [points[0][0], points[0][1] + 360],
                    [points[1][0], points[1][1]]
                ];
            } else {
                linePoints = [
                    [points[0][0], points[0][1]],
                    [points[1][0], points[1][1] + 360]
                ];
            }
        } else {
            linePoints = points;
        }

        connectionLine = L.polyline(linePoints, {
            color: '#FF4444',
            weight: 3,
            opacity: 0.8,
            className: 'connection-line'
        }).addTo(map);

        const distance = calculateDistance(
            points[0][0], 
            points[0][1], 
            points[1][0], 
            points[1][1]
        );
        
        showPlanets(points[0], points[1]);
        
        const distanceElement = document.getElementById('distance');
        distanceElement.innerHTML = `太阳到地球的选取位置距离: ${distance.toFixed(2)} 公里<br>` +
            `(实际距离约为1.496亿公里)`;
        distanceElement.style.display = 'block';
    }
}); 

// 替换原有的搜索相关代码
const searchInput = document.getElementById('search-input');
const searchButton = document.getElementById('search-button');

// 创建搜索结果容器
const searchResults = document.createElement('div');
searchResults.id = 'search-results';
document.getElementById('search-container').appendChild(searchResults);

let searchTimeout;
let currentMarker;

// 防抖函数
function debounce(func, wait) {
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(searchTimeout);
            func(...args);
        };
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(later, wait);
    };
}

// 搜索地点并显示结果列表
async function searchLocations(searchText) {
    if (!searchText) {
        searchResults.style.display = 'none';
        return;
    }

    try {
        const response = await fetch(
            `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchText)}&limit=5`
        );
        const data = await response.json();

        if (data.length > 0) {
            searchResults.innerHTML = '';
            data.forEach(result => {
                const resultItem = document.createElement('div');
                resultItem.className = 'search-result-item';
                resultItem.textContent = result.display_name;
                resultItem.addEventListener('click', () => {
                    selectLocation(result);
                });
                searchResults.appendChild(resultItem);
            });
            searchResults.style.display = 'block';
        } else {
            searchResults.innerHTML = '<div class="search-result-item">未找到结果</div>';
            searchResults.style.display = 'block';
        }
    } catch (error) {
        console.error('搜索出错:', error);
        searchResults.innerHTML = '<div class="search-result-item">搜索出错</div>';
        searchResults.style.display = 'block';
    }
}

// 选择搜索结果
function selectLocation(result) {
    const lat = parseFloat(result.lat);
    const lon = parseFloat(result.lon);
    
    // 移动地图到搜索结果位置
    map.setView([lat, lon], 16);

    // 移除之前的标记（如果存在）
    if (currentMarker) {
        map.removeLayer(currentMarker);
    }

    // 添加新标记
    currentMarker = L.marker([lat, lon])
        .addTo(map)
        .bindPopup(result.display_name)
        .openPopup();

    // 清空搜索框和隐藏结果列表
    searchInput.value = result.display_name;
    searchResults.style.display = 'none';
}

// 添加输入事件监听器（带防抖）
searchInput.addEventListener('input', debounce((e) => {
    searchLocations(e.target.value);
}, 300));

// 点击搜索按钮时搜索
searchButton.addEventListener('click', () => {
    searchLocations(searchInput.value);
});

// 按回车键时选择第一个结果
searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && searchResults.children.length > 0) {
        const firstResult = searchResults.querySelector('.search-result-item');
        if (firstResult) {
            firstResult.click();
        }
    }
});

// 点击页面其他地方时隐藏搜索结果
document.addEventListener('click', (e) => {
    if (!searchResults.contains(e.target) && e.target !== searchInput) {
        searchResults.style.display = 'none';
    }
}); 