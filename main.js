const fs = require('fs');
const fsp = fs.promises;
const http = require('http');
const req = require('request-promise-native').defaults({
    encoding: 'utf8',
    followAllRedirects: true,
    followRedirect: true,
    headers: {
        'User-Agent': 'bon-onion-forecast',
        'Accept-Language': 'en-US, en;q=0.5, *;q=0.1',
        'Content-Type': 'application/json',
    },
    method: 'GET',
    resolveWithFullResponse: true,
    simple: true,
    strictSSL: true
});

const menuUrl = "https://legacy.cafebonappetit.com/api/2/menus?format=json&cafe=150"
const mealCard = `
        <div class="mdc-card %%FIXED%% onion-%%ONIONS%%">
            <div class="mdc-card__primary-action mdc-ripple-upgraded" tabindex="0">
                <div class="demo-card__primary">
                    <h2 class="demo-card__title mdc-typography--headline6">%%MEAL%% %%ICONS%%</h2>
                    <h3 class="demo-card__subtitle mdc-typography--subtitle2">%%FORECAST%%</h3>
                </div>
            </div>
        </div>
`;
const onion = '<i class="bIcon onion-rate"></i>'
const sadOnion = '<i class="sadIcon onion-rate"></i>'
const onionPng_ = fsp.readFile('onion.png');
const sadPng_ = fsp.readFile('sad.png');
const template_ = fsp.readFile('template.html', 'utf8');

let apiResponse_;
let webpageHtml;

/** Left pads the given string with zeroes. */
function zeroPad(string, length) {
    string = String(string);
    while (string.length < length) string = `0${string}`;
    return string;
}

/** Returns today's date. */
function today() {
    let now = new Date();
    return `${now.getFullYear()}-${zeroPad(now.getMonth() + 1, 2)}-${zeroPad(now.getDate(), 2)}`;
}

/** Returns whether `string` contains today's date. */
function isCurrent(string) {
    const dates = String(string).match(/\d{4}-\d\d-\d\d/);
    return dates && today() === dates[0];
}

/** Returns an onion forecast. */
function forecast(items) {
    if (items == -1) return ['You\'ll need to get your veggies elsewhere.', sadOnion];
    if (items == 0) return ['Light onion day. Leave your mint gum at home.', onion];
    if (items == 1) return ['You are likely to stumble upon some onions.', onion.repeat(2)];
    return ['Guaranteed heavy onions. Bring your mouthwash for others\' sake', onion.repeat(3)];
}

/** Counts onion frequency in the menu. */
async function readMenu(tries = 0) {
    let apiResponse;
    try {
        if (!apiResponse_) apiResponse_ = req(menuUrl);
        apiResponse = await apiResponse_;
    } catch (error) {
        if (error && tries < 10) {
            apiResponse_ = null;
            await readMenu(tries + 1);
        }
    } finally {
        let menuData = JSON.parse(apiResponse.body);
        let today = menuData.days[0];
        if (!isCurrent(today.date)) {
            apiResponse_ = null;
            return readMenu(tries);
        }

        // Generate per meal onion score
        let meals = today.cafes[150].dayparts[0];
        let menu = {date: today.date};
        for (let {stations, label: mealName} of meals) {
            let meal = {};
            menu[mealName] = meal;
            for (let {items, label} of stations)
                meal[label] = items
                    .map(id => menuData.items[id])
                    .filter(Boolean)
                    .reduce((onions, item) => onions + item.description.toLowerCase().includes('onion'), 0)
        }
        return menu;
    }
}

/** Generate the webpage HTML from the menu. */
async function genPage(menu, onions = 0) {
    let fixed = 'mdc-top-app-bar--fixed-adjust';
    const html = `<!--${menu.date}-->\n${await template_}`;
    let meals = '';
    for (let mealName in menu) {
        if (mealName == "date") continue;
        const meal = menu[mealName];
        for (let station in meal) onions += meal[station];
        const forecastData = forecast(onions);
        let block = mealCard
            .replace(/%%FIXED%%/g, fixed)
            .replace(/%%MEAL%%/g, mealName)
            .replace(/%%FORECAST%%/g, forecastData[0])
            .replace(/%%ICONS%%/g, forecastData[1])
            .replace(/%%ONIONS%%/g, Math.min(3, onions + 1))
        meals += block;
        fixed = '';
    }
    return meals ? html.replace(/%%MEALS%%/g, meals) : genPage({
        date: menu.date,
        'No meals today': {}
    }, -1);
}

/** Generate and cache the webpage HTML. */
async function writePage() {
    const menu = await readMenu();
    webpageHtml = await genPage(menu);
    return webpageHtml;
}

/** Returns a promise for the webpage HTML. */
async function getPage(tries = 0) {
    try {
        if (isCurrent(webpageHtml)) return webpageHtml;
        await writePage();
        if (tries < 5) return getPage(tries + 1);
    } catch (error) {
        webpageHtml = `${today()}\nError: Could not load Onion Forecast`;
    }
    return webpageHtml
}

/** Serve files. */
async function server(request, response) {
    if (String(request.url).includes('onion.png')) {
        response.setHeader('Content-Type', 'image/png');
        return response.end(await onionPng_);
    }
    else if (String(request.url).includes('sad.png')) {
        response.setHeader('Content-Type', 'image/png');
        return response.end(await sadPng_);
    }
    response.setHeader('Content-Type', 'text/html');
    let page = await getPage();
    response.end(page);
}

/** Check that the webpage is current. */
function update() {
    if (String(webpageHtml).includes('Error') || !isCurrent(webpageHtml)) writePage();
}

// Update every 5 minutes
writePage();
setInterval(update, 5 * 60 * 1000);

http.createServer(server).listen(+process.env.PORT || 80);
