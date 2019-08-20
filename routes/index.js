var express = require('express');
var router = express.Router();
var tokens = require('../tokens.js');
var graph = require('../graph.js');
var common = require('../common')
var moment = require('moment')

/* GET home page. */
router.get('/', function(req, res, next) {
  let params = {
    active: { home: true }
  };
  if (!req.isAuthenticated()) {
    res.render('index', params)
  } else {
    var roomList = [];
    var blobsvc = common.getBlobService(req);
    var path = '/vrclassroom/roomSettings.json';
    var blob = parseBlobPath(path);
    // console.log(blob);
    blobsvc.getBlobToText(blob.container, blob.blob, function (error, text) {
      if (error) {
        console.error(error);
        res.status(500).send('Fail to download blob');
      } else {
        var data = JSON.parse(text);
        roomList = data.roomSettings;
        // data.roomSettings.forEach((element, idx) => {
        //   roomList
        // })
        // console.log(roomList);
        
        var params = {
          user: {
            displayName: req.user.profile.displayName,
            roomList: roomList
          },
        }
        res.render('index', params);
      }
    });
  }

  // res.render('index', params);
});

function parseBlobPath(path) {
  var index = path.indexOf('/', 1);
  var container = null;
  var blob = null;
  if (index > 0) {
      container = path.substring(1, index);
      blob = path.substring(index + 1);
  }
  else if (path.length > 1) {
      container = path.substring(1);
  }

  return {
      container: container,
      blob: blob
  }
}

module.exports = router;
