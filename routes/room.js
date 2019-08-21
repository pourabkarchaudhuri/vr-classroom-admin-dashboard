var express = require('express');
var router = express.Router();
var tokens = require('../tokens.js');
var graph = require('../graph.js');
var common = require('../common')
var moment = require('moment')

var fileType = {
    folder: 0,
    file: 1
}

router.get('/', (req, res) => {


    if (!req.isAuthenticated()) {
        // Redirect unauthenticated requests to home page
        res.redirect('/')
    } else {
        var blobsvc = common.getBlobService(req);
        var path = '/vrclassroom/';
        var blob = parseBlobPath(path);
        listBlobItems(blobsvc, blob, function (data) {
            let params = {

            }
            var uploadList = [];
            data.forEach((element, idx) => {
                // console.log(element.name);
                if (element.name.split('.')[element.name.split('.').length - 1] != 'json') {
                    uploadList.push(element.name);
                }
                if (data.length == idx + 1) {
                    params.uploadList = uploadList
                    res.render('createRoom', params);
                }
            })
            // res.send(data);
        }, function (error) {
            // res.status(500).send(error);
        });
    }
})

router.post('/createnewroom', async (req, res) => {

    if (!req.isAuthenticated()) {
        // Redirect unauthenticated requests to home page
        res.redirect('/')
    } else {
        // Parsing date to UTC
        var starttime = moment(req.body.starttime, ["h:mm"]).format("HH:mm");
        var endtime = moment(req.body.endtime, ["h:mm"]).format("HH:mm");
        console.log(req.body.date)
        console.log("@@@@@@@!!!!!!!!!!!!!!!@@@@@@@@@@@");
        // var utcStart = new moment(starttime, "HH:mm").utc();
        // var utcEnd = new moment(endtime, "HH:mm").utc();

        var utcStart = new moment(req.body.date + " " +req.body.starttime, "MM-DD-YYYY HH:mm").utc();
        var utcEnd = new moment(req.body.date + " " +req.body.endtime, "MM-DD-YYYY HH:mm").utc();

        // var combined = new Date(req.body.date + ' ' + req.body.startTime);

        

        // console.log(utcEnd);

        // Geerating keys for students and teachers
        var studentKey = Math.floor(100000 + Math.random() * 900000);
        var teachersKey = Math.floor(100000 + Math.random() * 900000);

        // Removing last empty field from array
        var filesArray = req.body.checkbox;
        var filteredFilesArray = filesArray.pop();

        var roomSettingsJSON = {};
        var blobsvc = common.getBlobService(req);
        var path = '/vrclassroom/roomSettings.json';
        var blob = parseBlobPath(path);
        console.log(blob);
        blobsvc.getBlobToText(blob.container, blob.blob, function (error, text) {
            if (error) {
                console.error(error);
                res.status(500).send('Fail to download blob');
            } else {
                var data = JSON.parse(text);

                // Checking the Same room name
                var isRoomExists = true;
                data.roomSettings.forEach((element, idx) => {
                    if (element.roomName == req.body.roomname) {
                        // Room name already exists, show error message

                        var blobsvc = common.getBlobService(req);
                        var path = '/vrclassroom/';
                        var blob = parseBlobPath(path);
                        listBlobItems(blobsvc, blob, function (data) {
                            let params = {
                
                            }
                            var uploadList = [];
                            data.forEach((element, idx) => {
                                // console.log(element.name);
                                if (element.name.split('.')[element.name.split('.').length - 1] != 'json') {
                                    uploadList.push(element.name);
                                }
                                if (data.length == idx + 1) {
                                    isRoomExists = false;
                                    params.uploadList = uploadList
                                    params.roomName = req.body.roomname;
                                    res.render('createRoom', params);
                                }
                            })
                            // res.send(data);
                        }, function (error) {
                            // res.status(500).send(error);
                        });
                    }

                    if(data.roomSettings.length == idx + 1 && isRoomExists) {
                        data.roomSettings.push({
                            roomName: req.body.roomname,
                            description: req.body.description,
                            ownerName: req.user.profile.displayName,
                            ownerEmail: req.user.profile.email,
                            roomSize: 5,
                            date: req.body.date,
                            startTime: req.body.starttime.split(' ')[0],
                            endTime: req.body.endtime.split(' ')[0],
                            participantKey: studentKey,
                            hostKey: teachersKey,
                            hosts: req.body.teacheremail.split(',').length,
                            participants: req.body.studentemail.split(',').length,
                            fileName: filesArray
                        })
                        console.log(JSON.stringify(data));
                        //    res.status(200).send('Filtered Data you want to send back');
                        uploadJSON(req, data)
                            .then(async (result) => {
                                var response = await sendCalendarInvite(req, req.body.roomname, utcStart, utcEnd, req.body.studentemail, req.body.teacheremail, teachersKey, studentKey)
                                // graph.sendCalendarInvite()
                                res.redirect('/');
                            })
                            .catch(error => {
                                console.log("!!!!!!!!");
                                console.log(error);
                            })
                    }
                })
            }
        });
    }

})

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

function listBlobItems(blobsvc, blob, successCallback, errorCallback) {
    var blobList = false;
    var dirList = false;
    var requestError = null;
    var data = [];

    function findEntry(shortName) {
        for (var i = 0; i < data.length; i++) {
            if (data[i].shortName == shortName) {
                return i;
            }
        }
        return -1;
    }

    if (blob.container) {
        blobsvc.listBlobsSegmentedWithPrefix(blob.container, blob.blob, null, { delimiter: '/' }, function (error, result) {
            if (error) {
                requestError = error;
            }
            else {
                var tempData = result.entries;
                if (tempData && tempData.length) {
                    for (var i = 0; i < tempData.length; i++) {
                        var index = tempData[i].name.lastIndexOf('/');
                        if (index > 0) {
                            tempData[i].shortName = tempData[i].name.substr(index + 1);
                        }
                        else {
                            tempData[i].shortName = tempData[i].name;
                        }
                        tempData[i].type = tempData[i].properties['content-length'] == 0 ? fileType.folder : fileType.file;

                        var index = findEntry(tempData[i].shortName);
                        if (index >= 0) {
                            data[index] = tempData[i];
                        }
                        else {
                            data.push(tempData[i]);
                        }
                    }
                }
            }
            blobList = true;

            if (blobList && dirList) {
                if (requestError) {
                    if (errorCallback) {
                        errorCallback(requestError);
                    }
                }
                else {
                    if (successCallback) {
                        successCallback(data);
                    }
                }
            }
        });

        blobsvc.listBlobDirectoriesSegmentedWithPrefix(blob.container, blob.blob, null, { delimiter: '/' }, function (error, result) {
            if (error) {
                requestError = error;
            }
            else {
                var tempData = result.entries;
                if (tempData && tempData.length) {
                    for (var i = 0; i < tempData.length; i++) {
                        var name = tempData[i].name.substr(0, tempData[i].name.length - 1);
                        var index = name.lastIndexOf('/');
                        if (index > 0) {
                            tempData[i].shortName = name.substr(index + 1);
                        }
                        else {
                            tempData[i].shortName = name;
                        }
                        tempData[i].type = fileType.folder;
                        tempData[i].properties = {};
                        var index = findEntry(tempData[i].shortName);
                        if (index < 0) {
                            data.push(tempData[i]);
                        }
                    }
                }
            }

            dirList = true;
            if (blobList && dirList) {
                if (requestError) {
                    if (errorCallback) {
                        errorCallback(requestError);
                    }
                }
                else {
                    if (successCallback) {
                        successCallback(data);
                    }
                }
            }
        });
    }
    else {
        blobsvc.listContainersSegmented(null, function (error, result) {
            if (error) {
                if (errorCallback) {
                    errorCallback(error);
                }
            }
            else {
                console.log(result.entries);
                var data = result.entries;
                if (data && data.length) {
                    for (var i = 0; i < data.length; i++) {
                        data[i].shortName = data[i].name;
                        data[i].type = fileType.folder;
                    }
                }
                if (successCallback) {
                    successCallback(data);
                }
            }
        });
    }
}

function uploadJSON(req, data) {
    return new Promise((resolve, reject) => {
        var path = '/vrclassroom/roomSettings.json';
        var blob = parseBlobPath(path);
        if (blob.container && blob.blob) {
            var blobsvc = common.getBlobService(req);
            blobsvc.createBlockBlobFromText(blob.container, blob.blob, JSON.stringify(data), function (error, result) {
                if (error) {
                    // res.status(500).send(error);
                    reject(error);
                } else {
                    console.log(result);
                    resolve(result);
                }
            });
        }
        else {
            resolve("blob path is not valid : " + path);
        }
    })
}

async function sendCalendarInvite(req, name, utcStart, utcEnd, studentemail, teacheremail, teachersKey, studentKey) {

    var studentEmails = [];
    var teachersEmails = [];

    studentemail.split(',').forEach((element) => {
        studentEmails.push({
            "emailAddress": {
              "address":element,
              "name": ""
            },
            "type": "required"
          })
    })

    teacheremail.split(',').forEach((element) => {
        teachersEmails.push({
            "emailAddress": {
              "address":element,
              "name": ""
            },
            "type": "required"
          })
    })



    console.log(teachersEmails);
    console.log("################");
    console.log(utcStart);

    var accessToken;
    try {
        accessToken = await tokens.getAccessToken(req);
    } catch (err) {
        req.flash('error_msg', {
            message: 'Could not get access token. Try signing out and signing in again.',
            debug: JSON.stringify(err)
        });
    }
    if (accessToken && accessToken.length > 0) {
        try {
            // Send the calendar

            // Sending the calendar to teachers
            await graph.sendCalendarInvites(accessToken, name, utcStart, utcEnd, teachersEmails, teachersKey)

            // Sending the calendar to students
            var response = await graph.sendCalendarInvites(accessToken, name, utcStart, utcEnd, studentEmails, studentKey)
            // console.log(response);
            return response;
        } catch (err) {
            console.log("@@@@@@@@@@@");
            console.log(err)
            // req.flash('error_msg', {
            //     message: 'Could not fetch events',
            //     debug: JSON.stringify(err)
            // });
        }
    }
}


module.exports = router;
