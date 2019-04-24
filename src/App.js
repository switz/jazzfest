import React, { useEffect, useState } from 'react';
import he from 'he';
import PullToRefresh from 'pulltorefreshjs';
import Sticky from 'react-stickynode';

import cheerio from 'cheerio';

import './App.css';

const monthDay = (date) => {
  if (!date) return '';

  return [date.getMonth(), date.getDate()].join(':');
}

const BASE_URL = 'https://cors-anywhere.herokuapp.com/http://www.jazzfestgrids.com';

const fetchData = async ({ setLoading, setData }) => {
  setLoading(true);

  let shows = [];
  const arr = await fetch(`${BASE_URL}/first_weekend`)
    .then(res => res.text())
    .then(text => {
      const $ = cheerio.load(text);

      const $venueCells = $('.grid_table').find('.venue_cell');

      return $venueCells.map((i, $venueCell) => {
        const $venue = $($venueCell);
        const $showCells = $venue.nextAll('.show_cell');

        const $a = $venue.find('a[href*="/venue/"]');
        const venueName = $a.text();
        const venueUrl = $a.attr('href');

        console.log($a.text(), 'href', $a.attr('href'))

        return $showCells.map((j, $showCell) => {
          const $show = $($showCell);
          const date = $show.attr('onclick').replace(/.+\, \'/, '').replace(/\'\)$/, '');

          console.log(date, $show.find('hr'))

          if ($show.find('hr').length) {
            const showText = he.decode($show.html()).replace(/<(?:\/?(hr)).*?>/gm, 'SPLITME').replace(/<(?:.|\n)*?>/gm, '\n').replace(/\n+/g, '\n')
              .split('\n').map(x => x.replace(/^(\n|\s)*$/g, '\n')).join('').replace(/\n+/g, '\n').replace(/(^\n+|\n+$)/, '').replace(/(^\s+|\s+$)/, '');

            showText.split('SPLITME').map(text => {
              shows.push({ showText: text, venueName, venueUrl, date });
            })
          }
          else {
            const showText = he.decode($show.html()).replace(/<(?:\/?(span|a)).*?>/gm, '').replace(/<(?:.|\n)*?>/gm, '\n').replace(/\n+/g, '\n')
              .split('\n').map(x => x.replace(/^(\n|\s)*$/g, '\n')).join('').replace(/\n+/g, '\n').replace(/(^\n+|\n+$)/, '').replace(/(^\s+|\s+$)/, '');

            if (!showText || /^(\n|\s)+$/.test(showText)) return;

            shows.push({ showText, venueName, venueUrl, date });
          }
        });
      });
    });

    console.log(shows);

//   const finalStructure = [];
//   let currentDay;
//
//   console.log('text', text);
//   text.split('\n')
//     .forEach(line => {
//       if (!line) return;
//
//       if (/Nedar:$/.test(line)) {
//         if (currentDay) finalStructure.push(currentDay);
//
//         currentDay = { shows: [], line };
//       }
//       else if (/\):$/.test(line)) {
//         if (currentDay) finalStructure.push(currentDay);
//
//         const [f, dateStr] = line.match(/\((.+)\)/);
//         const date = new Date(dateStr + '/' + new Date().getFullYear());
//         currentDay = { shows: [], line, date };
//       }
//
//       if (/@.+/.test(line) && currentDay) {
//         const [m, isAsterisked, band, metadata] = line.match(/(\*)?(.+)@(.+)/);
//
//         const currentShow = {
//           line,
//           isAsterisked: !!isAsterisked,
//           band,
//           metadata,
//         };
//         currentDay.shows.push(currentShow);
//       }
//     });
//
//   if (currentDay) {
//     finalStructure.push(currentDay);
//   }
//
//   localStorage.sotwData = JSON.stringify(finalStructure);
//   setData(finalStructure);
//   setLoading(false);
}

let initialState = [];

try {
  initialState = JSON.parse(localStorage.sotwData);
} catch (e) {
  console.log('could not parse localstorage', e);
}

const handleRefresh = ({ setLoading, setData }) => async (resolve) => {
  await fetchData({ setLoading, setData });

  resolve();
}

const App = () => {
  const [isLoading, setLoading] = useState(false);
  const [data, setData] = useState(initialState);

  const aDayAgo = new Date();

  aDayAgo.setTime(aDayAgo.getTime() - (4*60*60*1000) - (24*60*60*1000));

  useEffect(() => {
    PullToRefresh.init({
      mainElement: 'body',
      async onRefresh() {
        await fetchData({ setLoading, setData });

        return Promise.resolve();
      },
    });

    fetchData({ setLoading, setData });

    // this so is at 2 - 4 am it still displays the shows for the previous day
    const fourHoursAgo = new Date();

    fourHoursAgo.setTime(fourHoursAgo.getTime() - (4*60*60*1000))
    const $el = document.querySelector(`.day[data-date="${monthDay(fourHoursAgo)}"]`)

    $el && $el.scrollIntoView();
  }, []);

  return (
    <div className="app" data-is-loading={isLoading}>

      {data.filter(day => day.date > aDayAgo).map(day =>
        <div key={day.line} className="day" data-date={monthDay(new Date(day.date))}>
          <Sticky enabled={true} top={0} innerZ={1}>
            <div class="day-title">{day.line} {day.shows.length} shows</div>
          </Sticky>

          {day.shows.map(show =>
            <div key={show.line} className="show" data-is-asterisked={show.isAsterisked}>
              <div className="band">{show.isAsterisked ? '* ' : ''}{show.band}</div>
              <div className="metadata">@{show.metadata}</div>
            </div>
          )}
        </div>
      )}

      <br />
      <br />
      <br />

      {data && <p>
        All shows are sourced by Neddyo @ <a href="https://groups.yahoo.com/neo/groups/nyc_sotw/info">https://groups.yahoo.com/neo/groups/nyc_sotw/info</a>
      </p>}

      <br />
      <br />

      <a href="">FORCE REFRESH</a>
      <br />
      <br />
      <br />
    </div>
  );
}

export default App;
