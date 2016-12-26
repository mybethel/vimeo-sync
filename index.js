'use strict';

const moment = require('moment');
const request = require('request');

exports.handler = function(event, context) {
  const key = event.auth.key;
  const secret = event.auth.secret;
  const token = event.token;

  const tags = event.tags.split(',').map(tag => tag.trim());

  let matchingVideos = [];
  getVideos(token, processPage(token, tags));

  /**
   * Simple wrapper around the Vimeo API to query a user for all their videos.
   * This hits the `/me/videos` endpoint on Vimeo which uses the `token` to
   * determine which user to return videos for. On subsequent requests, the
   * Vimeo API determines the endpoint to use providing pagination.
   * @param {String} token User token for the Vimeo API.
   * @param {Function} cb Callback once the request has been fulfilled.
   * @param {String} pagination Optional parameter to paginate.
   */
  function getVideos(token, cb, pagination) {
    const route = pagination || '/me/videos?page=1&per_page=50';
    request.get({
      url: `https://api.vimeo.com${route}`,
      auth: {
        bearer: token
      },
      headers: {
        'User-Agent': 'Bethel Technologies <hello@bethel.io>'
      },
      json: true
    }, cb);
  }

  /**
   * Process a single page of Vimeo results and determine which videos match the
   * criteria to sync. This is solely based on the tags, although by default any
   * videos which have not been marked as public will be ignored.
   * @param {String} token User token for the Vimeo API.
   * @param {Array} tags All tags which should be used to match.
   * @return {Function} A callback function used to page through additional
   * results, or `context.succeed` when all pages have been exhausted.
   */
  function processPage(token, tags) {
    const tagsToSync = tags.toString().toLowerCase();

    return function pageCallback(err, response, body) {
      matchingVideos = matchingVideos.concat(body.data.filter(video => {
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

      // If Vimeo has additional pages for us to parse, do that next.
      if (body.paging && body.paging.next) {
        return getVideos(token, processPage(token, tags), body.paging.next)
      }

      // Otherwise, return all matches.
      context.succeed(matchingVideos);
    }
  }
};
