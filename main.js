'use strict';
// Reinvent the wheel
function vow(func, obj) {
    return (...args) => new Promise((resolve, reject) => func.bind(obj)(...args, (err, data) => err ? reject(err) : resolve(data)));
}
vow.err = (func, obj) => (...args) => new Promise((resolve, reject) => func.bind(obj)(...args, err => err ? reject(err) : resolve(null)));

// fs module
const cfs = require('fs');
const fs = {
    readFile: vow(cfs.readFile, cfs),
    unlink: vow.err(cfs.unlink, cfs),
    writeFile: vow.err(cfs.writeFile, cfs)
};

const http = require('http');
let l = console.log
// request module
const options = {
    encoding: 'utf8',
    followAllRedirects: true,
    followRedirect: true,
    headers: {
      //  'User-Agent': 'bonion-alert',
        'Accept-Language': 'en-US, en;q=0.5, *;q=0.1',
        'Content-Type': 'application/json',
    },
    method: 'GET',
    resolveWithFullResponse: true,
    simple: true,
    strictSSL: true 
};
const req = require('request-promise-native').defaults(options);
const url = "https://legacy.cafebonappetit.com/api/2/menus?format=json&cafe=150"

const bonPath = './bon.html';
const errPath = './err.html';

function zeroPad(s, n) {
    s = String(s);
    while (s.length < n) s = `0${s}`;
    return s;
}
function current(str) {l('current',str);
    str = String(str).match(/\d{4}-\d\d-\d\d/);
    if (!str) return false;
    let now = new Date();
    let today = `${now.getFullYear()}-${zeroPad(now.getMonth()+1, 2)}-${zeroPad(now.getDate(), 2)}`;
    l(today);
    l(today===str[0]);
    return today === str[0];
}

let p;
// Load the menu
async function readMenu(tries = 0) {
    console.log(`API tries: ${tries}`);
    // Try to fetch from API
    let res;
    try {
        if (!p) p = req(url);
        res = await p;
    } catch (e) {l('error waiting p');
        if (e && tries < 10) {
            p = null;
            return readMenu(tries + 1);
        }
        //or write temporary failure page
    } finally {
        let menu = JSON.parse(res.body);l('parsed menu')
        let today = menu.days[0];
        // Is this today's meal?
        if (!current(today.date)) {
            p = null;
            return readMenu(tries);
        }
        // Generate per meal onion rating;
        let meals = today.cafes[150].dayparts[0];
        let MENU = {date: today.date};
        for (let meal of meals) { // For each meal
            let MEAL = {};
            let stations = meal.stations;
            for (let {items, label} of stations) { // For each station
                let STATION = {}
                MEAL[label] = STATION;
                STATION.items = items.map(id => menu.items[id]).filter(v => v); // Get item details
                STATION.rating = STATION.items.reduce((count, item) => { // Does it have onion?
                    let onion = item.description.toLowerCase().indexOf('onion');
                    if (onion != -1) count[0]++;
                    count[1]++;
                    return count;
                }, [0, 0]);;;;;STATION.items=[];
            }
            MENU[meal.label] = MEAL;
        }
        return MENU;
    }
}
/////
function genMealHtml(meal, name) {
    return `<h2>${name}</h2><p>Onion Rating:BAD</p>`;

}
function _pageGen(menu) {
    let html = cfs.readFileSync('./template.html', 'utf8').split('%%CONTENT%%');
    let content = ''
    for (let meal of Object.keys(menu)) {
        if (meal == 'date') continue;
        content += genMealHtml(menu[meal], meal);
    }
    return html.join(content);
}
/////

let partA=`<!DOCTYPE html>
<html lang="en">
    <head>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>Onion Rater</title>
        <link rel="stylesheet" href="https://unpkg.com/material-components-web@latest/dist/material-components-web.min.css">
        <link rel="stylesheet" href="https://necolas.github.io/normalize.css/8.0.1/normalize.css">
        <link rel="stylesheet" href="https://fonts.googleapis.com/css?family=Roboto:300,400,500,700">

        <style>
            .mdc-top-app-bar {
                background-color: #ff40ff;
            }
            h2, h3 {
                padding-left: 20px;
            }
            h2 {
                padding-top: 10px;
            }
            .bonion {
                height: 1rem;
                display: inline;

            }
            .bIcon {
                background: url(/png) 100% 50%/auto 100% no-repeat;
                display:block;
                height: 32px;
                width: 32px;
            }
            .onion-1 {
                background-color: #40ff40;
            }
            .onion-2 {
                background-color: #ffff40;
            }
            .onion-3 {
                background-color: #ff4040;
            }
            .mdc-top-app-bar__title {
                padding-left : 4px;
            }
            .onion-rate {
                height: 20px; width: 20px;
                display: inline-block;
            }
        </style>
    </head>
    <body>
        <header class="mdc-top-app-bar mdc-top-app-bar--fixed">
            <div class="mdc-top-app-bar__row">
                <section class="mdc-top-app-bar__section mdc-top-app-bar__section--align-start">
                          <!--ICON-->
                          <i class="bIcon"></i><span class="mdc-top-app-bar__title">Bon Onion Alert</span><i class="bIcon"></i>
                </section>
            </div>
        </header>`;
let partB = `        <script>
            for (let card of document.querySelectorAll('.mdc-card')) {
                card.addEventListener('click', function onclick(ev) {
                    window.location.href = `+"`https://lewisandclark.cafebonappetit.com/cafe/fields-dining-room/#${this.childNodes[1].childNodes[1].childNodes[1].textContent.toLowerCase()}`"+`;
                });
            }
        </script>
    </body>
</html>`;
let card1=`        <div class="mdc-card %%FIXED%% onion-%%RAT%%">
            <div class="mdc-card__primary-action mdc-ripple-upgraded" tabindex="0">
                <div class="demo-card__primary">
                    <h2 class="demo-card__title mdc-typography--headline6">%%MEAL%% %%ONIONS%%</h2>
                    <h3 class="demo-card__subtitle mdc-typography--subtitle2">%%RATING%%</h3>
                </div>
            </div>
        </div>`;
        

let onion = '<i class="bIcon onion-rate"></i>'

function rate(items) {
    if (items == 0) return ['Light onion day. Leave your mint gum at home.', onion];
    if (items == 1) return ['You are likely to stumble upon some onions.', onion + onion];
    return ['Guaranteed heavy onions. Bring your mouthwash for others\' sake', onion + onion + onion];
}






////
function genPage(menu) {console.log('gen Page');
    console.log(menu);
    let fixed = 'mdc-top-app-bar--fixed-adjust';
    let html = `<!--${menu.date}-->`+partA;
    for (let meal of Object.keys(menu)) {l(meal);
        let MEAL = menu[meal];
        if (meal=="date") continue;
        let rating = 0;
        for (let station of Object.keys(MEAL)) {
            rating += MEAL[station].rating[0];
        }
        let block = card1.replace('%%FIXED%%', fixed);l(rating);
        block = block.replace('%%MEAL%%', meal).replace('%%RATING%%', rate(rating)[0]).replace('%%ONIONS%%', rate(rating)[1]).replace('%%RAT%%', Math.min(3, rating + 1));
        html += block;
        fixed = '';
    }
    return html + partB;
}
let writing = false;
async function writePage() {console.log('write page');
    let menu = await readMenu();
    let page = genPage(menu);
    return fs.writeFile(bonPath, page, 'utf8');
}
async function server(req, res) { console.log('serving request');
    if (String(req.url).match(/png/g)) {
        res.setHeader('Content-Type', 'image/png');
        cfs.createReadStream('./png.png').pipe(res);
        return;
    }
    let page = await getPage();
    console.log('server page is ', page);
    res.setHeader('Content-Type', 'text/html');
    res.write(page);
    res.end();
}
let bonHtml;
async function getPage(tries = 0) { console.log('get Page',tries);
    let page;
    if (current(bonHtml)) return bonHtml;
    try {l('load page from fs');
        page = await fs.readFile(bonPath, 'utf8');
    } catch (e) {console.log('aaa');
        //could not load page;
        writePage();
        if (tries < 5) return getPage(tries +1);
        else return fs.readFile(errPath, 'utf8');
    } finally {
        if (current(page)) bonHtml = page;
        return page;
    }
}

async function maintain() { console.log('maintainence');
    let page;
    try {l('maintain:read file from fs');
        page = await fs.readFile(bonPath, 'utf8');
    } catch(e) {
        console.log(e);
    }finally{l('maintain:error reading f=bonhtml')
        if (!current(page)) {l('maintain: writing page');
            writePage();
            bonHtml = null;
        }
    }
}
maintain();
setInterval(maintain, 10*60*1000);
http.createServer(server).listen(80);
