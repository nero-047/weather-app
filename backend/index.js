
const express = require("express");
const bodyParser = require("body-parser");
const app = express();
const port = 4040;

const axios = require("axios");
const cheerio = require("cheerio");

let Country = require("country-state-city").Country;
let cities = require("country-state-city").City;

app.use(bodyParser.json()); // for parsing application/json
app.use(bodyParser.urlencoded({ extended: true }));

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept"
  );
  res.header(
    "Access-Control-Allow-Methods",
    "GET, POST, OPTIONS, PUT, PATCH, DELETE"
  );
  next();
});

async function get_weather(lat, lon) {
  try {
    const response = await axios.get(
      `https://weather.com/en-IN/weather/today/l/${lat},${lon}`
    );
    const html = response.data;
    const $ = cheerio.load(html);

    const paragraphs = $(".CurrentConditions--primary--2DOqs")
      .map((i, el) => $(el).text())
      .get();

    const location_name = $(".CurrentConditions--header--kbXKR").text();

    const current_temp = $(".CurrentConditions--primary--2DOqs")
      .find(".CurrentConditions--tempValue--MHmYY")
      .text();
    const current_phrase = $(".CurrentConditions--primary--2DOqs")
      .find(".CurrentConditions--phraseValue--mZC_p")
      .text();
    const current_min_max = $(".CurrentConditions--primary--2DOqs")
      .find(".CurrentConditions--tempHiLoValue--3T1DG")
      .text()
      .split("•");

    //    Today

    const today_temp = $("#todayDetails")
      .find(".TodayDetailsCard--feelsLikeTempValue--2icPt")
      .text();

    let t_data = [];

    const today_HL = $("#todayDetails")
      .find(".WeatherDetailsListItem--WeatherDetailsListItem--1CnRC")
      .map((i, e) => {
        t_data.push([
          $(e).find(".WeatherDetailsListItem--label--2ZacS").text(),
          $(e)
            .find(".WeatherDetailsListItem--wxData--kK35q")
            .text()
            .replace("Wind Direction", "")
            .replace("Arrow Down", "")
            .replace("Arrow Up", "")
            .replace("Arrow Right", "")
            .replace("Arrow Left", ""),
        ]);
      });

    let radar_img = [];

    const radar = $(".Slideshow--Slideshow--1YsiZ")
      .find(".Slideshow--slide--4GN6B")
      .map((i, e) => {
        let img = $(e).css("background-image");
        radar_img.push(img.substring(4, img.length - 1));
      });

    const air_q_num = $(".AirQuality--AirQualityCard--EONAt")
      .find(".AirQuality--col--3I-4C")
      .find("svg")
      .text();

    const air_q_phase = $(".AirQuality--AirQualityCard--EONAt")
      .find(".AirQuality--col--3I-4C")
      .find(".AirQualityText--severity--W9CtX")
      .text();

    const air_q_brief = $(".AirQuality--AirQualityCard--EONAt")
      .find(".AirQuality--col--3I-4C")
      .find(".AirQualityText--severityText--1Bkxv")
      .text();

    const air_q_percent = $(
      ".AirQuality--col--3I-4C > svg > circle:nth-child(2)"
    )
      .css("stroke-dasharray")
      .split(" ")[1];

    const h_a_phrase = $(
      ".HealthActivitiesListItem--HealthActivitiesListItem--3m4vY"
    )
      .find(".HealthActivitiesListItem--details--3xbqs")
      .find(".HealthActivitiesListItem--heading--3_RUg")
      .text();

    const h_a_brief = $(
      ".HealthActivitiesListItem--HealthActivitiesListItem--3m4vY"
    )
      .find(".HealthActivitiesListItem--details--3xbqs")
      .find(".HealthActivitiesListItem--description--2eNsW")
      .text();

    const h_a_percent = $(
      ".HealthActivitiesListItem--HealthActivitiesListItem--3m4vY > svg > circle:nth-child(2)"
    )
      .css("stroke-dasharray")
      .split(" ")[0];

    let hourly_list = [];

    const hourly_data = $(".HourlyWeatherCard--TableWrapper--1OobO")
      .find(".WeatherTable--verticalStack--eWhVh")
      .find("li")
      .map((i, e) => {
        let content = {
          time: $(e).find("a > h3").text(),
          temp: $(e).find("a > .Column--temp--1sO_J").text(),
          phrase: $(e).find("a > .Column--icon--2TNHl").text(),
        };
        hourly_list.push(content);
      });

    let daily_list = [];

    const daily_data = $(".DailyWeatherCard--TableWrapper--2bB37")
      .find(".WeatherTable--verticalStack--eWhVh")
      .find("li")
      .map((i, e) => {
        let content = {
          day: $(e).find("a > h3").text(),
          minmax: $(e).find("a > .Column--temp--1sO_J").text(),
          phrase: $(e).find("a > .Column--icon--2TNHl").text(),
        };
        daily_list.push(content);
      });

    const datas = {
      loc: location_name,
      current: {
        temp: current_temp,
        phrase: current_phrase,
        minmax: {
          day: current_min_max[0].substring(4),
          night: current_min_max[1].substring(7),
        },
      },
      today: {
        temp: today_temp,
        data: t_data,
      },
      radar: radar_img,
      air_quality: {
        value: air_q_num,
        phrase: air_q_phase,
        brief: air_q_brief,
        percentage: (parseInt(air_q_percent) / 565) * 100,
      },
      health_activity: {
        phrase: h_a_phrase,
        brief: h_a_brief,
        percentage: 100 - (parseInt(h_a_percent) / 565) * 100,
      },
      hourly: hourly_list,
      daily: daily_list,
    };
    return { r: 1, d: datas };
  } catch (error) {
    return { r: 0, d: error };
  }
}

app.get("/", async (req, res) => {
  res.json({status: "working!"})
});

app.get("/c-names", async (req, res) => {
  let rez = [];
  Country.getAllCountries().map((c) => {
    rez.push(cities.getCitiesOfCountry(c.isoCode));
  });
  return res.json(rez);
});

app.get("/points", async (req, res) => {
  let lat = req.query.lat;
  let lon = req.query.lon;
  console.log(lat, lon);
  rez = await get_weather(lat, lon);
  res.json(rez);
});

app.listen(port, () => {
  console.log(`Weather api is listening on port ${port}`);
});
