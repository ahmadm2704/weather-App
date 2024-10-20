const apiKey = '43b06a809a08dc762f1b7a3a92959042';
const geminiAPIKey = 'AIzaSyCxcPcZEmj2J-CzQ-EQboVkSiyfM-VDjLI';

let tempChart, weatherPieChart, lineChart;
let currentUnit = 'metric'; 
let currentCity = ''; 
let currentPage = 1; 
const entriesPerPage = 10; 
let fiveDayData = [];

// Manual weather search based on user input
async function manualWeatherSearch() {
    const city = document.getElementById('city-input').value.trim();
    if (!city) {
        alert('Please enter a city name');
        return;
    }
    const data = await getWeather(city);
    if (!data.error) await getForecast(city);
}

// Fetch current weather data from OpenWeather API
async function getWeather(city) {
    currentCity = city; 
    const encodedCity = encodeURIComponent(city);
    const weatherInfo = document.getElementById('weather-info');
    weatherInfo.innerHTML = '';

    try {
        const response = await fetch(
            `https://api.openweathermap.org/data/2.5/weather?q=${encodedCity}&units=${currentUnit}&appid=${apiKey}`
        );
        const data = await response.json();

        if (data.cod === 200) {
            displayWeather(data);
            return data;
        } else {
            weatherInfo.innerHTML = `<p class="text-danger">City "${city}" not found</p>`;
            return { error: 'City not found' };
        }
    } catch (error) {
        weatherInfo.innerHTML = '<p class="text-danger">Failed to fetch weather data.</p>';
        return { error: 'Failed to fetch weather data' };
    }
}

// Display weather details in the UI
function displayWeather(data) {
    const { name, main, weather, wind } = data;
    const weatherInfo = document.getElementById('weather-info');
    const condition = weather[0].main.toLowerCase();
    const icon = weather[0].icon;

    // Convert wind speed based on unit
    const windSpeedUnit = currentUnit === 'metric' ? 'm/s' : 'mph';
    const tempUnit = currentUnit === 'metric' ? '°C' : '°F';

    // Get video element and update background based on weather condition
    const videoElement = document.getElementById('background-video');
    switch (condition) {
        case 'clear':
            videoElement.src = 'clear.mp4';
            break;
        case 'clouds':
            videoElement.src = 'clouds.mp4';
            break;
        case 'rain':
        case 'drizzle':
            videoElement.src = 'rainy.mp4';
            break;
        case 'smoke':
        case 'haze':
        case 'mist':
            videoElement.src = 'smoky.mp4';
            break;
        default:
            videoElement.src = 'clear.mp4';
            break;
    }

    // Populate weather information
    weatherInfo.innerHTML = `
        <h3>${name}</h3>
        <img src="https://openweathermap.org/img/wn/${icon}@2x.png" alt="${condition}" />
        <p>Temperature: ${main.temp}${tempUnit}</p>
        <p>Humidity: ${main.humidity}%</p>
        <p>Wind Speed: ${wind.speed} ${windSpeedUnit}</p>
        <p>Condition: ${weather[0].description}</p>
    `;
}

// Fetch 5-day weather forecast and display with pagination
async function getForecast(city) {
    const encodedCity = encodeURIComponent(city);
    const response = await fetch(
        `https://api.openweathermap.org/data/2.5/forecast?q=${encodedCity}&units=${currentUnit}&appid=${apiKey}`
    );
    const data = await response.json();
    fiveDayData = data.list; 
    updateTable(fiveDayData, 1); 
    updateCharts(fiveDayData);
}

// Sorting temperatures in ascending order
function sortTempsAscending(data) {
    return data.slice().sort((a, b) => a.main.temp - b.main.temp);
}

// Sorting temperatures in descending order
function sortTempsDescending(data) {
    return data.slice().sort((a, b) => b.main.temp - a.main.temp);
}

// Filter days that have rain
function filterDaysWithRain(data) {
    return data.filter(entry => entry.weather.some(w => w.main.toLowerCase().includes('rain')));
}

// Find the day with the highest temperature
function findDayWithHighestTemp(data) {
    return data.reduce((max, entry) => entry.main.temp > max.main.temp ? entry : max);
}

// Update forecast table with sorting and filtering support
function updateTable(data, page = 1, filterType = 'default') {
    currentPage = page;
    let processedData = [...data]; 

    // Apply sorting or filtering based on the filterType
    switch(filterType) {
        case 'ascending':
            processedData = sortTempsAscending(processedData);
            break;
        case 'descending':
            processedData = sortTempsDescending(processedData);
            break;
        case 'rainy':
            processedData = filterDaysWithRain(processedData);
            break;
        case 'highestTemp':
            processedData = [findDayWithHighestTemp(processedData)];
            break;
        default:
            break;
    }

    // Paginate and display the data
    const startIndex = (page - 1) * entriesPerPage;
    const endIndex = Math.min(startIndex + entriesPerPage, processedData.length);
    const paginatedData = processedData.slice(startIndex, endIndex);

    const tableBody = document.getElementById('forecast-table');
    tableBody.innerHTML = ''; 

    paginatedData.forEach(entry => {
        const icon = entry.weather[0].icon;
        const description = entry.weather[0].description;
        tableBody.innerHTML += `
            <tr>
                <td>${entry.dt_txt}</td>
                <td>${entry.main.temp}°${currentUnit === 'metric' ? 'C' : 'F'}</td>
                <td>${description}</td>
                <td><img src="https://openweathermap.org/img/wn/${icon}@2x.png" alt="${description}" /></td>
            </tr>
        `;
    });

    updatePagination(processedData.length); 
}

// Create pagination buttons dynamically based on total entries
function updatePagination(totalEntries) {
    const paginationContainer = document.getElementById('pagination');
    paginationContainer.innerHTML = ''; // Clear existing pagination

    const totalPages = Math.ceil(totalEntries / entriesPerPage);

    // Previous button
    if (currentPage > 1) {
        paginationContainer.innerHTML += `<button class="btn btn-secondary" onclick="updateTable(fiveDayData, ${currentPage - 1})">Previous</button>`;
    }

    // Page numbers
    for (let i = 1; i <= totalPages; i++) {
        paginationContainer.innerHTML += `<button class="btn ${i === currentPage ? 'btn-primary' : 'btn-light'}" onclick="updateTable(fiveDayData, ${i})">${i}</button>`;
    }

    // Next button
    if (currentPage < totalPages) {
        paginationContainer.innerHTML += `<button class="btn btn-secondary" onclick="updateTable(fiveDayData, ${currentPage + 1})">Next</button>`;
    }
}

// Update charts (temperature, pie chart of weather conditions, etc.)
function updateCharts(data) {
    const labels = data.map(entry => entry.dt_txt.split(' ')[0]);
    const temps = data.map(entry => entry.main.temp);

    if (tempChart) tempChart.destroy();
    if (weatherPieChart) weatherPieChart.destroy();
    if (lineChart) lineChart.destroy();

    // Bar chart for temperature
    tempChart = new Chart(document.getElementById('tempChart'), {
        type: 'bar',
        data: {
            labels,
            datasets: [{
                label: 'Temperature (°C/°F)',
                data: temps,
                backgroundColor: 'rgba(75, 192, 192, 0.6)',
            }]
        },
        options: chartOptions 
    });

    // Pie chart for weather conditions
    const conditions = data.map(entry => entry.weather[0].main);
    const conditionCounts = countConditions(conditions);
    weatherPieChart = new Chart(document.getElementById('weatherPieChart'), {
        type: 'doughnut',
        data: {
            labels: Object.keys(conditionCounts),
            datasets: [{
                data: Object.values(conditionCounts),
                backgroundColor: ['#ffcd56', '#4bc0c0', '#36a2eb'],
            }]
        },
        options: chartOptions 
    });

    // Line chart for temperature trend
    lineChart = new Chart(document.getElementById('lineChart'), {
        type: 'line',
        data: {
            labels,
            datasets: [{
                label: 'Temperature (°C/°F)',
                data: temps,
                borderColor: '#ff6384',
                fill: false,
            }]
        },
        options: chartOptions 
    });
}

// Count weather conditions for pie chart
function countConditions(conditions) {
    return conditions.reduce((acc, condition) => {
        acc[condition] = (acc[condition] || 0) + 1;
        return acc;
    }, {});
}

// Toggle between Celsius and Fahrenheit
function toggleUnit() {
    currentUnit = currentUnit === 'metric' ? 'imperial' : 'metric';
    const unitButton = document.getElementById('toggle-unit');
    unitButton.innerHTML = currentUnit === 'metric' ? 'Switch to Fahrenheit' : 'Switch to Celsius';

    // Refresh the weather data using the current unit
    if (currentCity) {
        getWeather(currentCity);
    }
}

// Chatbot logic for user interaction
async function handleUserQuery() {
    const userInput = document.getElementById('user-input').value;
    const chatbotResponse = document.getElementById('chatbot-response');

    chatbotResponse.innerHTML += `<p><strong>You:</strong> ${userInput}</p>`;

    const cityMatch = userInput.match(/in\s+([a-zA-Z\s]+)/i);
    const city = cityMatch ? cityMatch[1].trim() : null;

    if (city) {
        const weatherData = await getWeather(city);
        if (!weatherData.error) {
            await getForecast(city);
            chatbotResponse.innerHTML += `<p><strong>Bot:</strong> The weather in ${city} is ${weatherData.main.temp}°${currentUnit === 'metric' ? 'C' : 'F'} with ${weatherData.weather[0].description}.</p>`;
        } else {
            chatbotResponse.innerHTML += `<p><strong>Bot:</strong> ${weatherData.error}</p>`;
        }
    } else {
        const response = await callGeminiAPI(userInput);
        chatbotResponse.innerHTML += `<p><strong>Bot:</strong> ${response}</p>`;
    }

    document.getElementById('user-input').value = '';
}

async function callGeminiAPI(query) {
    try {
        const response = await fetch('https://api.gemini.com/v1/query', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${geminiAPIKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ query }),
        });

        const data = await response.json();
        return data.response || 'I could not understand your query.';
    } catch (error) {
        return 'Failed to reach Gemini API.';
    }
}

// Event listeners for "Enter" key press in inputs
document.getElementById('city-input').addEventListener('keyup', function (event) {
    if (event.key === 'Enter') {
        manualWeatherSearch();
    }
});

document.getElementById('user-input').addEventListener('keyup', function (event) {
    if (event.key === 'Enter') {
        handleUserQuery();
    }
});

// Section toggle functionality
function showSection(section) {
    document.getElementById('dashboard-section').classList.toggle('d-none', section !== 'dashboard');
    document.getElementById('tables-section').classList.toggle('d-none', section !== 'tables');
}

const chartOptions = {
    plugins: {
        legend: {
            labels: {
                color: 'white' 
            }
        },
        tooltip: {
            titleColor: 'white', 
            bodyColor: 'white',  
        }
    },
    scales: {
        x: {
            ticks: {
                color: 'white' 
            },
            grid: {
                color: 'rgba(255, 255, 255, 0.2)' 
            }
        },
        y: {
            ticks: {
                color: 'white' 
            },
            grid: {
                color: 'rgba(255, 255, 255, 0.2)' 
            }
        }
    }
};
