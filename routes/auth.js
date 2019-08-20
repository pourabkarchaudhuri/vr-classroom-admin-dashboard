var express = require('express');
var passport = require('passport');
var router = express.Router();

var graph = require('../graph.js');
var common = require('../common')
// var moment = require('moment')

/* GET auth callback. */
router.get('/signin',
  function  (req, res, next) {
    console.log("Authenticating...")
    passport.authenticate('azuread-openidconnect',
      {
        response: res,
        prompt: 'login',
        failureRedirect: '/',
        failureFlash: true
      }
    )(req,res,next);
  },
  function(req, res) {
    console.log("Successful! Redirecting")
    // res.redirect('/');
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
        console.log(roomList);
        
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
);

router.post('/callback',
  function(req, res, next) {
    passport.authenticate('azuread-openidconnect',
      {
        response: res,
        failureRedirect: '/',
        failureFlash: true
      }
    )(req,res,next);
  },
  function(req, res) {
    // res.redirect('/');
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
        console.log(roomList);
        
        var params = {
          user: {
            displayName: req.user.profile.displayName,
            roomList: roomList
          },
        }
        res.redirect('/')
        // res.render('index', params);
      }
    });
  }
);

router.get('/signout',
  function(req, res) {
    req.session.destroy(function(err) {
      req.logout();
      res.redirect('/');
    });
  }
);

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