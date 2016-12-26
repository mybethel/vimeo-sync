'use strict';

const moment = require('moment');
const got = require('got');

exports.handler = function(event, context) {
  const key = event.auth.key;
  const secret = event.auth.secret;
  const token = event.token;

  const tags = event.tags.split(',').map(tag => tag.trim());

  getVideos(token)
    .then(checkPages(token, tags))
    .then(context.succeed)
    .catch(context.fail);
};

/**
 * Simple wrapper around the Vimeo API to query a user for all their videos.
 * This hits the `/me/videos` endpoint on Vimeo which uses the `token` to
 * determine which user to return videos for.
 * @param {String} token User token for the Vimeo API.
 * @param {Function} cb Callback once the request has been fulfilled.
 * @param {Number} page Optional page number for pagination.
 */
function getVideos(token, page) {
  const route = `/me/videos?page=${page || 1}&per_page=50`;
  return got(`https://api.vimeo.com${route}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'User-Agent': 'Bethel Technologies <hello@bethel.io>'
    },
    json: true
  });
}

/**
 * Process the first page of results and determine how many pages to sync. This
 * allows for the sync process to finish faster. When more pages are present,
 * each additional page is fetched in parallel. Once all pages have been fetched
 * every page of results is parsed.
 * @param {String} token User token for the Vimeo API.
 * @param {Array} tags All tags which should be used to match.
 */
function checkPages(token, tags) {
  const tagsToSync = tags.toString().toLowerCase();

  return function firstPageCallback(response) {
    let additionalPages = 0;
    if (response.body.total > 50) {
      additionalPages = Math.ceil((response.body.total - 50) / 50);
    }

    let pageRequests = [];
    for (var i = 2; i <= additionalPages + 1; i++) {
      pageRequests.push(getVideos(token, i));
    }

    return Promise.all(pageRequests).then(results => {
      results.unshift(response);
      return processResults(results, tags);
    });
  }
}

/**
 * Process all pages of Vimeo results and determine which videos match the
 * criteria to sync. This is solely based on the tags, although by default any
 * videos which have not been marked as public will be ignored.
 * @param {Array} results Each page of results returned from the Vimeo API.
 * @param {Array} tags All tags which should be used to match.
 */
function processResults(results, tags) {
  const tagsToSync = tags.toString().toLowerCase();
  let matchingVideos = [];

  return new Promise(resolve => {
    results.forEach(response => {
      matchingVideos = matchingVideos.concat(response.body.data.filter(video => {
        // If a video is not marked as public it is ignored. In the future this
        // could be modified to allow private channels to be used as a source.
        if (video.privacy && video.privacy.view !== 'anybody') {
          return false;
        }

        // Simple string matching is used to determine if any of the tags from
        // Vimeo match the tags passed to this function.
        let matches = video.tags.map(tag =>
                        tagsToSync.indexOf(tag.name.toLowerCase()) >= 0
                      ).filter(match => match === true);

        // If at least one tag matches, the video should be included.
        return matches.length > 0;
      }));
    });

    resolve(matchingVideos);
  });
}
