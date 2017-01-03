'use strict';

const expect = require('expect');
const nock = require('nock');

let fixture = require('./fixture.json');

const sync = require('../index');
const defaultPayload = {
  tags: 'bethel',
  token: '',
  auth: { token: '', secret: '' }
};

nock('https://api.vimeo.com').get('/me/videos?page=1&per_page=50').times(3).reply(200, () => fixture);

describe('vimeo sync', () => {

  it('returns videos from Vimeo that match the specified tag', done => {
    sync.handler(defaultPayload, {
      fail: done,
      succeed: (results) => {
        expect(results.length).toBe(5);
        expect(results[0].name).toEqual(fixture.data[0].name);
        done();
      }
    });
  });

  it('allows multiple tags to be specified in the sync', done => {
    let multiTag = Object.assign({}, defaultPayload, { tags: 'bethel bumper' });
    sync.handler(multiTag, {
      fail: done,
      succeed: (results) => {
        expect(results.length).toBe(6);
        done();
      }
    });
  });

  it('ignores videos marked as private or unlisted', done => {
    fixture.data[0].privacy.view = 'unlisted';
    sync.handler(defaultPayload, {
      fail: done,
      succeed: (results) => {
        expect(results.length).toBe(4);
        done();
      }
    });
  });

});
